<?php

namespace App\Support;

use App\Models\Ticket;
use App\Models\TicketResponse;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Helper terpusat untuk menghitung selisih waktu aksi pelapor terhadap
 * balasan operator terakhir serta memformat durasi & alasan sistem.
 */
final class AuditFlagTimeCalculator
{
    public static function timezone(): string
    {
        return (string) config('app.timezone', 'Asia/Jakarta');
    }

    /**
     * Cari balasan operator/petugas terakhir sebelum atau tepat pada waktu aksi.
     */
    public static function findLastStaffResponseBefore(Ticket $ticket, CarbonInterface $actionAt): ?TicketResponse
    {
        $actionTimestamp = $actionAt->copy()->timezone(self::timezone());

        return $ticket->responses()
            ->whereNotNull('user_id')
            ->with('user')
            ->orderByDesc('sent_at')
            ->orderByDesc('id')
            ->get()
            ->first(function (TicketResponse $response) use ($actionTimestamp): bool {
                $replyAt = $response->sent_at ?? $response->created_at;
                if ($replyAt === null) {
                    return false;
                }

                return $replyAt->copy()->timezone(self::timezone())->lessThanOrEqualTo($actionTimestamp);
            });
    }

    /**
     * Hitung selisih waktu dalam detik dari balasan operator ke aksi pelapor.
     * Mengembalikan null bila data tidak lengkap atau selisih bernilai negatif.
     */
    public static function elapsedSeconds(?CarbonInterface $replyAt, ?CarbonInterface $actionAt): ?float
    {
        if ($replyAt === null || $actionAt === null) {
            return null;
        }

        $tz = self::timezone();
        $reply = Carbon::instance($replyAt)->timezone($tz);
        $action = Carbon::instance($actionAt)->timezone($tz);

        $diffMs = $action->getTimestampMs() - $reply->getTimestampMs();
        if ($diffMs < 0) {
            return null;
        }

        return round($diffMs / 1000, 3);
    }

    /**
     * Bulatkan detik untuk perbandingan ambang batas & tampilan bila >= 1 detik.
     */
    public static function normalizeSeconds(float|int $seconds): int|float
    {
        if ($seconds < 1 && $seconds >= 0) {
            return round($seconds, 3);
        }

        return (int) round($seconds);
    }

    /**
     * Format durasi dalam bahasa Indonesia yang mudah dibaca.
     */
    public static function formatDuration(float|int $seconds): string
    {
        if ($seconds < 1) {
            return 'kurang dari 1 detik';
        }

        $total = (int) round($seconds);
        $hours = intdiv($total, 3600);
        $minutes = intdiv($total % 3600, 60);
        $secs = $total % 60;

        if ($hours > 0) {
            $parts = ["{$hours} jam"];
            if ($minutes > 0) {
                $parts[] = "{$minutes} menit";
            } elseif ($secs > 0) {
                $parts[] = "{$secs} detik";
            }

            return implode(' ', $parts);
        }

        if ($minutes > 0) {
            $parts = ["{$minutes} menit"];
            if ($secs > 0) {
                $parts[] = "{$secs} detik";
            }

            return implode(' ', $parts);
        }

        return "{$secs} detik";
    }

    /**
     * Bangun teks "Alasan sistem" yang konsisten beserta ambang batas wajar.
     */
    public static function buildReason(
        string $flagType,
        float|int $elapsedSeconds,
        int $thresholdSeconds,
        bool $sameIp = false,
    ): string {
        $durationText = self::formatDuration($elapsedSeconds);
        $thresholdText = self::formatDuration($thresholdSeconds);

        $base = "Tiket ditutup {$durationText} setelah balasan operator";
        if ($sameIp) {
            $base .= ', IP sama dengan PIC';
        }

        return "{$base} (batas wajar: minimal {$thresholdText}).";
    }
}
