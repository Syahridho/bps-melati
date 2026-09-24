<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Ticket extends Model
{
    protected $fillable = [
        'ticket_number',
        'period',
        'sequence',
        'classification',
        'service_type',
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
     * Generate nomor tiket. Format: P-1400/MM/YYYY/NNNN
     * P = Prefix klasifikasi, MM = bulan, YYYY = tahun, NNNN = nomor urut
     *
     * Menggunakan Redis lock untuk mencegah race condition.
     */
    public static function generateTicketNumber(string $classification, string $period): array
    {
        $meta = self::classificationMeta($classification);
        $lock = Cache::lock("ticket_counter:{$period}", 10);

        return $lock->block(5, function () use ($meta, $period) {
            $counter = TicketCounter::firstOrCreate(
                ['period' => $period],
                ['last_number' => 0]
            );

            $counter->increment('last_number');
            $sequence = $counter->last_number;

            [$year, $month] = explode('-', $period);

            $ticketNumber = sprintf(
                '%s-%s/%s/%s/%04d',
                $meta['prefix'],
                $meta['code'],
                $month,
                $year,
                $sequence
            );

            return [
                'ticket_number' => $ticketNumber,
                'sequence' => $sequence,
            ];
        });
    }
}
