<?php

namespace App\Support;

use App\Models\Ticket;
use Illuminate\Support\Facades\Cache;

class RekapYears
{
    /**
     * Cache key for available years list.
     */
    public const CACHE_KEY = 'rekap:available_years';

    /**
     * TTL for available years cache (1 hour).
     */
    public const TTL = 3600;

    /**
     * Get available years sorted descending (newest first).
     *
     * @return list<string>
     */
    public static function get(): array
    {
        return Cache::remember(self::CACHE_KEY, self::TTL, function (): array {
            $ticketYears = Ticket::query()
                ->selectRaw('SUBSTRING(period, 1, 4) as yr')
                ->distinct()
                ->orderByDesc('yr')
                ->pluck('yr')
                ->all();

            $currentYear = (string) now()->year;

            if (! in_array($currentYear, $ticketYears, true)) {
                $ticketYears[] = $currentYear;
                rsort($ticketYears);
            }

            return $ticketYears;
        });
    }

    /**
     * Invalidate available years cache.
     */
    public static function invalidate(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
