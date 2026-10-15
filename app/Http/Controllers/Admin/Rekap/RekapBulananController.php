<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use App\Support\ExportFilename;
use App\Support\RekapCache;
use App\Support\RekapReport;
use App\Support\RekapYears;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapBulananController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function __invoke(Request $request): Response
    {
        [$year, $month] = $this->resolveParams($request->query('year'), $request->query('month'));
        $period = sprintf('%04d-%02d', $year, $month);

        return Inertia::render('admin/rekap/bulanan', array_merge(
            $this->render($period),
            $this->filterPayload($year, $month)
        ));
    }

    public function print(Request $request): View
    {
        [$year, $month] = $this->resolveParams($request->query('year'), $request->query('month'));
        $period = sprintf('%04d-%02d', $year, $month);

        return view('rekap.bulanan-print', array_merge(
            $this->render($period),
            $this->filterPayload($year, $month)
        ));
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        [$year, $month] = $this->resolveParams($request->query('year'), $request->query('month'));
        $period = sprintf('%04d-%02d', $year, $month);
        $periodeStr = str_replace(' ', '-', RekapReport::formatPeriod($period, 'F Y'));
        $filename = ExportFilename::make('Rekap-Bulanan', $periodeStr, 'xls');

        return response()
            ->view('rekap.bulanan-excel', array_merge(
                $this->render($period),
                $this->filterPayload($year, $month)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    private function render(string $period): array
    {
        return array_merge($this->payload($period), ['penandaTangan' => RekapReport::signatory()]);
    }

    private function payload(string $period): array
    {
        $currentYear = (string) now()->year;
        $periodYear = substr($period, 0, 4);
        
        // Periode lampau di-cache lebih lama (1 jam), periode berjalan/future pendek (60 detik)
        $ttl = ($periodYear < $currentYear) ? RekapCache::TTL : 60;

        return Cache::remember(
            RekapCache::key('bulanan', $period),
            $ttl,
            fn (): array => $this->buildReport($period),
        );
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function resolveParams(mixed $yearInput, mixed $monthInput): array
    {
        $currentYear = (int) now()->year;
        $currentMonth = (int) now()->month;

        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            $year = $currentYear;
        }

        $month = filter_var($monthInput, FILTER_VALIDATE_INT);
        if ($month === false || $month < 1 || $month > 12) {
            $month = ($year === $currentYear) ? $currentMonth : 12;
        }

        // Jika tahun berjalan dan bulan di masa depan, fallback ke bulan sekarang
        if ($year === $currentYear && $month > $currentMonth) {
            $month = $currentMonth;
        }

        return [$year, $month];
    }

    private function filterPayload(int $selectedYear, int $selectedMonth): array
    {
        $years = RekapYears::get();
        $yearOptions = array_map(fn (string $y): array => [
            'value' => $y,
            'label' => 'Tahun ' . $y,
        ], $years);

        $currentYear = (int) now()->year;
        $currentMonth = (int) now()->month;

        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $disabled = ($selectedYear === $currentYear && $m > $currentMonth);
            $months[] = [
                'value' => (string) $m,
                'label' => self::MONTH_NAMES[$m],
                'disabled' => $disabled,
            ];
        }

        return [
            'year' => (string) $selectedYear,
            'month' => (string) $selectedMonth,
            'years' => $yearOptions,
            'months' => $months,
        ];
    }

    private function buildReport(string $period): array
    {
        $counts = RekapReport::countsByChannel($period);
        $rows = RekapReport::rowsFor($counts);

        return [
            'rows' => $rows['rows'],
            'totals' => $rows['totals'],
            'period' => $period,
            'periodLabel' => RekapReport::formatPeriod($period, 'F Y'),
            'periods' => array_map(fn (string $value): array => [
                'value' => $value,
                'label' => RekapReport::formatPeriod($value, 'F Y'),
            ], RekapReport::ticketPeriods()),
        ];
    }
}
