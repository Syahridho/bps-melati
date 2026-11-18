<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\TicketCounter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Sumber kebenaran tunggal untuk pembuatan nomor tiket.
 *
 * Format: {prefix}-{kode satker}/{mmyyyy}/{2 huruf}{nomor urut}
 * Contoh: L-1400/112026/VR2126 (Pengaduan), A-1400/..., I-1400/...
 *
 * Pemetaan prefix/kode satker dan nomor urut diambil dari Ticket dan
 * TicketCounter yang sudah ada, sehingga tidak ada hardcode `1400`,
 * prefix jenis, atau panjang kode huruf di sini.
 *
 * Nomor urut diambil secara atomik (Cache lock + TicketCounter) dalam satu
 * periode (Y-m, zona Asia/Jakarta) dan melanjutkan urutan global yang
 * sudah ada untuk periode itu, sama untuk jalur publik dan Input Data.
 */
class TicketNumberGenerator
{
    private const LOCK_TTL_SECONDS = 10;

    private const LOCK_BLOCK_SECONDS = 5;

    private const MAX_COLLISION_RETRIES = 10;

    /**
     * @return array{ticket_number: string, sequence: int, period: string}
     */
    public function generate(string $classification, ?string $period = null): array
    {
        $period = $period ?? Carbon::now('Asia/Jakarta')->format('Y-m');
        [$year, $month] = explode('-', $period);
        $meta = Ticket::classificationMeta($classification);

        $lock = Cache::lock("ticket_counter:{$period}", self::LOCK_TTL_SECONDS);

        return $lock->block(self::LOCK_BLOCK_SECONDS, function () use ($meta, $period, $month, $year) {
            $counter = TicketCounter::firstOrCreate(
                ['period' => $period],
                ['last_number' => (int) Ticket::where('period', $period)->max('sequence')],
            );

            $counter->increment('last_number');
            $sequence = (int) $counter->last_number;

            Cache::put("ticket_sequence:{$period}", $sequence, now()->addDays(30));

            $ticketNumber = $this->buildNumber(
                $meta['prefix'],
                $meta['code'],
                $month,
                $year,
                $sequence,
            );

            return [
                'ticket_number' => $ticketNumber,
                'sequence' => $sequence,
                'period' => $period,
            ];
        });
    }

    /**
     * Susun nomor tiket dan jamin keunikan dengan mencoba ulang kode huruf
     * bila hasilnya sudah ada di database (dijalankan dalam lock, aman).
     */
    private function buildNumber(string $prefix, string $code, string $month, string $year, int $sequence): string
    {
        $seqFormatted = sprintf('%02d', $sequence);

        for ($i = 0; $i < self::MAX_COLLISION_RETRIES; $i++) {
            $randomLetters = sprintf('%s%s', chr(random_int(65, 90)), chr(random_int(65, 90)));
            $ticketNumber = sprintf(
                '%s-%s/%s%s/%s%s',
                $prefix,
                $code,
                $month,
                $year,
                $randomLetters,
                $seqFormatted,
            );

            if (! Ticket::where('ticket_number', $ticketNumber)->exists()) {
                return $ticketNumber;
            }
        }

        return sprintf(
            '%s-%s/%s%s/%s%s',
            $prefix,
            $code,
            $month,
            $year,
            'ZZ',
            $seqFormatted,
        );
    }
}
