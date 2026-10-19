<?php

namespace App\Actions;

use App\Models\Setting;
use App\Models\Ticket;
use App\Support\LaporanCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Menutup tiket yang sudah dibalas petugas namun tidak dijawab pelapor sampai
 * melewati batas hari sesuai klasifikasi.
 *
 * Aturan yang dijaga di sini:
 *  - Hanya tiket berstatus `respon_awal` / `respon_substantif` yang jadi kandidat;
 *    tiket `baru` (belum pernah ditanggapi petugas) tidak pernah ditutup otomatis.
 *  - Titik awal hitungan = `last_staff_response_at`. Bila pelapor membalas
 *    pada atau setelah waktu tersebut, hitungan berhenti sampai petugas
 *    menanggapi lagi.
 *  - Pengaturan 0 / kosong / tidak valid = auto close dimatikan untuk
 *    klasifikasi tersebut (dilewati, bukan dianggap 1 hari).
 *  - Idempotent: UPDATE dijaga `whereIn('status', ...)`.
 *  - Satu tiket gagal tidak menghentikan tiket lain.
 */
class AutoCloseTickets
{
    public const CLOSED_REASON = 'auto_close';

    /**
     * Klasifikasi => key pengaturan.
     *
     * @var array<string, string>
     */
    public const SETTING_KEYS = [
        'pengaduan' => 'auto_close_pengaduan_days',
        'aspirasi' => 'auto_close_aspirasi_days',
        'permintaan_informasi' => 'auto_close_permintaan_informasi_days',
        'berkadar_pengawasan' => 'auto_close_berkadar_pengawasan_days',
    ];

    /**
     * @var array<int, string>
     */
    public const CANDIDATE_STATUSES = ['respon_awal', 'respon_substantif'];

    /**
     * Jalankan penutupan.
     *
     * @param  int|null  $limit  Batasi jumlah tiket yang diproses per eksekusi.
     * @param  bool  $dryRun  Hanya laporkan kandidat, jangan mengubah data.
     */
    public function handle(?int $limit = null, bool $dryRun = false): AutoCloseResult
    {
        $windows = $this->resolveWindows();

        $result = AutoCloseResult::empty();

        foreach ($windows as $classification => $days) {
            $stopped = false;

            $this->candidateQuery($classification, $days)->chunkById(
                200,
                function ($tickets) use ($result, $limit, $dryRun, $days, &$stopped): bool {
                    foreach ($tickets as $ticket) {
                        if ($limit !== null && $result->total() >= $limit) {
                            $stopped = true;

                            return false;
                        }

                        $result->consider($ticket);

                        if ($dryRun) {
                            continue;
                        }

                        try {
                            if ($this->closeOne((int) $ticket->id, $days)) {
                                $result->markClosed((int) $ticket->id);
                            }
                        } catch (Throwable $e) {
                            report($e);

                            Log::error('Gagal memproses kandidat auto close.', [
                                'ticket_id' => $ticket->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }

                    return true;
                }
            );

            if ($stopped) {
                break;
            }
        }

        return $result;
    }

    /**
     * Baca nilai hari per klasifikasi dari pengaturan.
     *
     * Nilai kosong, non-angka, atau <= 0 berarti auto close dimatikan untuk
     * klasifikasi tersebut sehingga tidak diproses.
     *
     * @return array<string, int>
     */
    public function resolveWindows(): array
    {
        $windows = [];

        foreach (self::SETTING_KEYS as $classification => $key) {
            $defaultVal = $classification === 'berkadar_pengawasan' ? '30' : null;
            $raw = Setting::get($key, $defaultVal);

            if ($raw === null || trim((string) $raw) === '') {
                continue;
            }

            if (! ctype_digit(trim((string) $raw))) {
                Log::warning('Pengaturan auto close tidak valid, klasifikasi dilewati.', [
                    'key' => $key,
                    'value' => $raw,
                ]);

                continue;
            }

            $days = (int) $raw;

            if ($days <= 0) {
                continue;
            }

            $windows[$classification] = $days;
        }

        return $windows;
    }

    /**
     * Query kandidat untuk satu klasifikasi.
     *
     * @return Builder<Ticket>
     */
    public function candidateQuery(string $classification, int $days): Builder
    {
        $query = Ticket::query()
            ->whereIn('status', self::CANDIDATE_STATUSES)
            ->whereNotNull('last_staff_response_at')
            ->where('last_staff_response_at', '<=', now()->subDays($days))
            ->whereDoesntHave('responses', function ($query): void {
                $query->where('is_system', false)
                    ->whereNull('user_id')
                    ->whereRaw(
                        'COALESCE(ticket_responses.sent_at, ticket_responses.created_at) >= tickets.last_staff_response_at'
                    );
            });

        if ($classification === 'berkadar_pengawasan') {
            $query->where('is_berkadar_pengawasan', true);
        } else {
            $query->where('is_berkadar_pengawasan', false)
                ->where('classification', $classification);
        }

        return $query;
    }

    /**
     * Tutup satu tiket di dalam transaksi + row lock, dengan pengecekan ulang
     * kondisi (pelapor bisa saja baru saja membalas).
     */
    public function closeOne(int $ticketId, int $days): bool
    {
        try {
            $closed = DB::transaction(function () use ($ticketId, $days): bool {
                $ticket = Ticket::query()->lockForUpdate()->find($ticketId);

                if ($ticket === null || ! in_array($ticket->status, self::CANDIDATE_STATUSES, true)) {
                    return false;
                }

                if ($ticket->last_staff_response_at === null) {
                    return false;
                }

                // Cek ulang di dalam lock: kalau pelapor membalas sejak titik
                // awal hitungan, tiket ini tidak lagi layak ditutup.
                $hasLaterReporterReply = $ticket->responses()
                    ->where('is_system', false)
                    ->whereNull('user_id')
                    ->whereRaw('COALESCE(sent_at, created_at) >= ?', [$ticket->last_staff_response_at])
                    ->exists();

                if ($hasLaterReporterReply) {
                    return false;
                }

                $ticket->responses()->create([
                    'user_id' => null,
                    'type' => 'respon_substantif',
                    'message' => 'Laporan otomatis ditutup karena tidak ada tanggapan dari pelapor setelah '.$days.' hari.',
                    'is_system' => true,
                    'sent_at' => now(),
                ]);

                $ticket->update([
                    'status' => 'selesai',
                    'completed_at' => now(),
                    'closed_reason' => self::CLOSED_REASON,
                ]);

                return true;
            });

            if ($closed) {
                LaporanCache::invalidate();
                broadcast(new TicketUpdated($ticketId));
                broadcast(new InboxUpdated(Ticket::find($ticketId)));
            }

            return $closed;
        } catch (Throwable $e) {
            report($e);
            return false;
        }
    }
}
