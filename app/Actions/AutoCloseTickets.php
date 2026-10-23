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
        $result = AutoCloseResult::empty();
        $stopped = false;

        // 1. Process pengawasan tickets
        $pengawasanRaw = trim((string) Setting::get('kadar_pengawasan_hari', '30'));
        if ($pengawasanRaw !== '' && ctype_digit($pengawasanRaw) && (int) $pengawasanRaw > 0) {
            $pengawasanDays = (int) $pengawasanRaw;
            $this->pengawasanCandidateQuery($pengawasanDays)->chunkById(
                200,
                function ($tickets) use ($result, $limit, $dryRun, $pengawasanDays, &$stopped): bool {
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
                            if ($this->closeOne((int) $ticket->id, $pengawasanDays)) {
                                $result->markClosed((int) $ticket->id);
                            }
                        } catch (Throwable $e) {
                            report($e);

                            Log::error('Gagal memproses kandidat auto close pengawasan.', [
                                'ticket_id' => $ticket->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }

                    return true;
                }
            );

            if ($stopped) {
                return $result;
            }
        }

        // 2. Process regular tickets by classification windows
        $windows = $this->resolveWindows();

        foreach ($windows as $classification => $days) {
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
            $raw = Setting::get($key);

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
        return Ticket::query()
            ->where('classification', $classification)
            ->where('is_pengawasan', false)
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
    }

    public function pengawasanCandidateQuery(int $days): Builder
    {
        return Ticket::query()
            ->where('is_pengawasan', true)
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
                    'is_system' => true,
                    'message' => self::systemMessage($days),
                    'sent_at' => now(),
                ]);

                $updated = Ticket::query()
                    ->whereKey($ticket->id)
                    ->whereIn('status', self::CANDIDATE_STATUSES)
                    ->update([
                        'status' => 'selesai',
                        'completed_at' => now(),
                        'closed_reason' => self::CLOSED_REASON,
                    ]);

                return $updated === 1;
            }, 3);

            if ($closed) {
                $this->forgetTicketCaches($ticketId);
            }

            return $closed;
        } catch (Throwable $e) {
            report($e);

            Log::error('Gagal menutup satu tiket secara otomatis.', [
                'ticket_id' => $ticketId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Invalidasi cache yang menyimpan isi/hitungan tiket.
     */
    public function forgetTicketCaches(int $ticketId): void
    {
        $ticket = Ticket::query()->find($ticketId);

        if ($ticket === null) {
            return;
        }

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");
        Cache::forget('dashboard:admin:version');
        LaporanCache::invalidate();
    }

    /**
     * Tenggat auto close untuk satu tiket, atau null bila fiturnya nonaktif
     * untuk klasifikasi tersebut / tiket belum pernah dibalas petugas.
     *
     * Dipakai controller agar tanggal tampil dihitung di server, bukan di klien.
     */
    public static function deadlineFor(Ticket $ticket): ?Carbon
    {
        if ($ticket->last_staff_response_at === null || $ticket->status === 'selesai') {
            return null;
        }

        $days = null;
        if ($ticket->is_pengawasan) {
            $raw = trim((string) Setting::get('kadar_pengawasan_hari', '30'));
            if ($raw !== '' && ctype_digit($raw) && (int) $raw > 0) {
                $days = (int) $raw;
            }
        } else {
            $days = self::windows()[$ticket->classification] ?? null;
        }

        if ($days === null) {
            return null;
        }

        return $ticket->last_staff_response_at->copy()->addDays($days);
    }

    /**
     * @return array<string, int>
     */
    private static function windows(): array
    {
        $windows = [];

        foreach (self::SETTING_KEYS as $classification => $key) {
            $raw = trim((string) Setting::get($key));

            if ($raw === '' || ! ctype_digit($raw) || (int) $raw <= 0) {
                continue;
            }

            $windows[$classification] = (int) $raw;
        }

        return $windows;
    }

    /**
     * Teks entri sistem yang ditambahkan ke riwayat tanggapan.
     */
    public static function systemMessage(int $days): string
    {
        return "Laporan ditutup otomatis karena tidak ada balasan dari pelapor selama {$days} hari.";
    }
}
