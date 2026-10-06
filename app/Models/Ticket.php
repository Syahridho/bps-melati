<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'is_read',
        'source_app',
        'created_by',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'completed_at' => 'datetime',
            'sequence' => 'integer',
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
     * Auto-close active tickets whose last response from admin/operator exceeded the configured auto-close days.
     */
    public static function autoCloseExpiredTickets(): int
    {
        $pengaduanDays = (int) Setting::get('auto_close_pengaduan_days', '3');
        $aspirasiDays = (int) Setting::get('auto_close_aspirasi_days', '1');
        $permintaanDays = (int) Setting::get('auto_close_permintaan_informasi_days', '5');

        $daysMap = [
            'pengaduan' => max(1, $pengaduanDays),
            'aspirasi' => max(1, $aspirasiDays),
            'permintaan_informasi' => max(1, $permintaanDays),
        ];

        $closedCount = 0;

        $activeTickets = static::where('status', '!=', 'selesai')
            ->whereHas('responses', function ($query) {
                $query->whereNotNull('user_id');
            })
            ->with(['responses' => function ($q) {
                $q->orderByDesc('created_at');
            }])
            ->get();

        foreach ($activeTickets as $ticket) {
            $lastResponse = $ticket->responses->first();
            if (! $lastResponse || $lastResponse->user_id === null) {
                continue;
            }

            $thresholdDays = $daysMap[$ticket->classification] ?? 3;
            $expiryTime = ($lastResponse->sent_at ?? $lastResponse->created_at)->copy()->addDays($thresholdDays);

            if (now()->greaterThanOrEqualTo($expiryTime)) {
                $ticket->update([
                    'status' => 'selesai',
                    'completed_at' => now(),
                ]);

                Cache::forget('ticket_check:'.md5($ticket->ticket_number));
                Cache::forget("ticket:{$ticket->ticket_number}");
                $closedCount++;
            }
        }

        return $closedCount;
    }

    /**
     * Single ticket auto-close check helper.
     */
    public function checkAndAutoClose(): bool
    {
        if ($this->status === 'selesai') {
            return false;
        }

        $lastResponse = $this->responses()->latest()->first();
        if (! $lastResponse || $lastResponse->user_id === null) {
            return false;
        }

        $settingKey = match ($this->classification) {
            'pengaduan' => 'auto_close_pengaduan_days',
            'aspirasi' => 'auto_close_aspirasi_days',
            'permintaan_informasi' => 'auto_close_permintaan_informasi_days',
            default => null,
        };

        $defaultDays = match ($this->classification) {
            'pengaduan' => 3,
            'aspirasi' => 1,
            'permintaan_informasi' => 5,
            default => 3,
        };

        $thresholdDays = max(1, (int) Setting::get($settingKey, (string) $defaultDays));
        $expiryTime = ($lastResponse->sent_at ?? $lastResponse->created_at)->copy()->addDays($thresholdDays);

        if (now()->greaterThanOrEqualTo($expiryTime)) {
            $this->update([
                'status' => 'selesai',
                'completed_at' => now(),
            ]);

            Cache::forget('ticket_check:'.md5($this->ticket_number));
            Cache::forget("ticket:{$this->ticket_number}");

            return true;
        }

        return false;
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
