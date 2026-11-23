<?php

namespace App\Support;

use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardPeriod
{
    public const ALLOWED = ['this_month', 'last_month', 'this_year', 'custom'];

    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /**
     * Resolve and validate period parameters into a normalized range.
     *
     * @return array{
     *   period: string,
     *   month: int,
     *   year: int,
     *   start: Carbon,
     *   end: Carbon|null,
     *   label: string,
     *   trend: string,
     *   isLive: bool
     * }
     */
    public static function resolve(mixed $periodInput, mixed $monthInput, mixed $yearInput): array
    {
        $now = now();
        $currentYear = (int) $now->year;
        $currentMonth = (int) $now->month;

        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $period = is_string($periodInput) && in_array($periodInput, self::ALLOWED, true)
            ? $periodInput
            : 'this_month';

        // Default values per period
        if ($period === 'this_month') {
            $year = $currentYear;
            $month = $currentMonth;
        } elseif ($period === 'last_month') {
            $last = $now->copy()->subMonthNoOverflow();
            $year = (int) $last->year;
            $month = (int) $last->month;
        } elseif ($period === 'this_year') {
            $year = $currentYear;
            $month = $currentMonth;
        } else {
            // custom
            $month = filter_var($monthInput, FILTER_VALIDATE_INT);
            $year = filter_var($yearInput, FILTER_VALIDATE_INT);

            $valid = true;
            if ($month === false || $month < 1 || $month > 12) {
                $valid = false;
            }
            if ($year === false || $year < $minYear || $year > $maxYear) {
                $valid = false;
            }
            if ($valid && $year === $currentYear && $month > $currentMonth) {
                $valid = false;
            }

            if (! $valid) {
                $period = 'this_month';
                $year = $currentYear;
                $month = $currentMonth;
            }
        }

        // Compute range
        $start = null;
        $end = null;
        $trend = 'daily';

        if ($period === 'this_month') {
            $start = $now->copy()->startOfMonth();
            $end = null; // no upper bound to preserve legacy behaviour
            $trend = 'daily';
        } elseif ($period === 'last_month') {
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $trend = 'daily';
        } elseif ($period === 'this_year') {
            $start = Carbon::create($year, 1, 1)->startOfYear();
            $end = $now->copy()->endOfDay();
            $month = $currentMonth;
            $trend = 'monthly';
        } else { // custom
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            if ($year === $currentYear && $month === $currentMonth) {
                $end = $now->copy()->endOfDay();
            } else {
                $end = $start->copy()->endOfMonth();
            }
            $trend = 'daily';
        }

        $label = self::label($period, $start, $end, $year, $month, $now);

        return [
            'period' => $period,
            'month' => $month,
            'year' => $year,
            'start' => $start,
            'end' => $end,
            'label' => $label,
            'trend' => $trend,
            'isLive' => $period === 'this_month',
        ];
    }

    public static function availableYears(): array
    {
        return RekapYears::get();
    }

    public static function monthOptions(int $year): array
    {
        $now = now();
        $currentYear = (int) $now->year;
        $currentMonth = (int) $now->month;

        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[] = [
                'value' => (string) $m,
                'label' => self::MONTH_NAMES[$m],
                'disabled' => ($year === $currentYear && $m > $currentMonth),
            ];
        }

        return $months;
    }

    private static function label(string $period, Carbon $start, ?Carbon $end, int $year, int $month, Carbon $now): string
    {
        $localeStart = $start->copy()->locale('id');

        if ($period === 'this_month') {
            return 'Bulan Ini ('.$now->copy()->locale('id')->translatedFormat('F Y').')';
        }

        if ($period === 'last_month') {
            return 'Bulan Lalu ('.$start->copy()->locale('id')->translatedFormat('F Y').')';
        }

        if ($period === 'this_year') {
            $from = Carbon::create($year, 1, 1)->locale('id')->translatedFormat('F');
            $to = $now->copy()->locale('id')->translatedFormat('F Y');

            return 'Tahun Ini ('.$from.' - '.$to.')';
        }

        // custom
        return $start->copy()->locale('id')->translatedFormat('F Y');
    }
}
