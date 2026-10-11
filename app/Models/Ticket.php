<?php

namespace App\Models;

use App\Actions\AutoCloseTickets;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Cache;

class Ticket extends Model
{
    protected $fillable = [
        'ticket_number',
        'period',
        'sequence',
        'classification',
        'title',
        'service_type',
        'satuan_tugas',
        'channel_id',
        'reporter_name',
        'reporter_email',
        'reporter_wa',
        'content',
        'access_code',
        'status',
        'version',
        'is_read',
        'source_app',
        'created_by',
        'completed_at',
        'closed_reason',
        'last_staff_response_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'completed_at' => 'datetime',
            'last_staff_response_at' => 'datetime',
            'sequence' => 'integer',
            'version' => 'integer',
        ];
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(TicketResponse::class);
    }

    /**
     * Respons terakhir pada tiket ini (terlama -> terbaru), dipakai untuk
     * label "dibalas oleh X" di halaman daftar.
     */
    public function lastResponse(): HasOne
    {
        return $this->hasOne(TicketResponse::class)->latestOfMany('id');
    }

    /**
     * Auto-close active tickets whose last response from admin/operator exceeded the configured auto-close days.
     *
     * Wrapper tipis atas {@see AutoCloseTickets} supaya tidak ada dua implementasi.
     */
    public static function autoCloseExpiredTickets(): int
    {
        return app(AutoCloseTickets::class)->handle()->closedCount();
    }

    /**
     * Single ticket auto-close check helper.
     *
     * Memakai action yang sama agar aturan (status kandidat, balasan pelapor
     * menghentikan hitungan, closed_reason) selalu konsisten.
     */
    public function checkAndAutoClose(): bool
    {
        if ($this->status === 'selesai' || $this->last_staff_response_at === null) {
            return false;
        }

        $action = app(AutoCloseTickets::class);
        $days = $action->resolveWindows()[$this->classification] ?? null;

        if ($days === null) {
            return false;
        }

        $isCandidate = $action->candidateQuery($this->classification, $days)
            ->whereKey($this->getKey())
            ->exists();

        if (! $isCandidate) {
            return false;
        }

        return $action->closeOne((int) $this->getKey(), $days);
    }

    protected static function booted(): void
    {
        $bump = function () {
            Cache::add('dashboard:admin:version', 0);
            Cache::increment('dashboard:admin:version');
        };

        static::saved($bump);
        static::deleted($bump);
    }

    /**
     * Mendapatkan prefix tiket berdasarkan klasifikasi.
     *
     * @return array{prefix: string, code: string}
     */
    public static function classificationMeta(string $classification): array
    {
        return match ($classification) {
            'pengaduan' => ['prefix' => 'L', 'code' => '1400'],
            'aspirasi' => ['prefix' => 'A', 'code' => '1400'],
            'permintaan_informasi' => ['prefix' => 'I', 'code' => '1400'],
            default => ['prefix' => 'X', 'code' => '0000'],
        };
    }

    /**
     * Nama kanal publik (broadcast) untuk sebuah nomor tiket.
     *
     * Nomor tiket selalu memuat `/` (mis. `L-1400/102026/EE18`), sedangkan
     * protokol Pusher/Reverb hanya mengizinkan `[A-Za-z0-9_\-=,.@]` pada nama
     * kanal — memakai nomor mentah akan ditolak broadcaster dengan
     * "Invalid channel name". Karakter lain karena itu diganti `-`; nomor tiket
     * selalu berstruktur tetap sehingga hasil penggantian tetap unik.
     *
     * Padanan frontend ada di `resources/js/lib/laporan-masuk-utils.ts`.
     */
    public static function publicChannelName(string $ticketNumber): string
    {
        return 'ticket.'.preg_replace('/[^A-Za-z0-9_\-=,.@]/', '-', $ticketNumber);
    }

    /**
     * Generate nomor tiket. Format: P-1400/MMYYYY/AA01
     * P = Prefix klasifikasi, MM = bulan, YYYY = tahun, AA = 2 huruf acak, 01 = nomor urut (AA100 jika >= 100)
     *
     * Menggunakan Redis cache / lock untuk mencegah race condition.
     */
    public static function generateTicketNumber(string $classification, string $period): array
    {
        $meta = self::classificationMeta($classification);
        $lock = Cache::lock("ticket_counter:{$period}", 10);

        return $lock->block(5, function () use ($meta, $period) {
            $counter = TicketCounter::firstOrCreate(
                ['period' => $period],
                ['last_number' => (int) Ticket::where('period', $period)->max('sequence')]
            );

            $counter->increment('last_number');
            $sequence = $counter->last_number;

            // Simpan / update hitungan di Redis cache
            Cache::put("ticket_sequence:{$period}", $sequence, now()->addDays(30));

            [$year, $month] = explode('-', $period);

            // Generate 2 huruf kapital acak (AA, XY, RK, dll)
            $randomLetters = sprintf('%s%s', chr(rand(65, 90)), chr(rand(65, 90)));
            // Nomor urut: 01 s/d 99, atau 100 dst.
            $seqFormatted = sprintf('%02d', $sequence);

            $ticketNumber = sprintf(
                '%s-%s/%s%s/%s%s',
                $meta['prefix'],
                $meta['code'],
                $month,
                $year,
                $randomLetters,
                $seqFormatted
            );

            return [
                'ticket_number' => $ticketNumber,
                'sequence' => $sequence,
            ];
        });
    }

    /**
     * Generate nomor tiket khusus input data oleh admin/operator.
     * Format: NamaPembuat/DDMMYYYY/Sequence (misal: Administrator/06102026/01)
     * Menggunakan Redis lock & TicketCounter agar (period, sequence) selalu unik.
     *
     * @return array{ticket_number: string, sequence: int}
     */
    public static function generateAdminTicketNumber(string $creatorName, string $period, ?string $dateFormatted = null): array
    {
        $dateStr = $dateFormatted ?? now()->format('dmY');
        $lock = Cache::lock("ticket_counter:{$period}", 10);

        return $lock->block(5, function () use ($creatorName, $period, $dateStr) {
            $counter = TicketCounter::firstOrCreate(
                ['period' => $period],
                ['last_number' => (int) Ticket::where('period', $period)->max('sequence')]
            );

            $counter->increment('last_number');
            $sequence = $counter->last_number;

            Cache::put("ticket_sequence:{$period}", $sequence, now()->addDays(30));

            $seqFormatted = sprintf('%02d', $sequence);
            $ticketNumber = sprintf('%s/%s/%s', $creatorName, $dateStr, $seqFormatted);

            return [
                'ticket_number' => $ticketNumber,
                'sequence' => $sequence,
            ];
        });
    }
}
