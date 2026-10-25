<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Support\ExportFilename;
use App\Support\RekapCache;
use App\Support\RekapReport;
use App\Support\RekapYears;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapPeriodikController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function __invoke(Request $request): Response
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return Inertia::render('admin/rekap/periodik', array_merge(
            $this->payloadWithMode($year, $months, $tampilan),
            $this->filterPayload($year, $months, $tampilan)
        ));
    }

    public function print(Request $request): View
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return view('rekap.periodik-print', array_merge(
            $this->payloadWithMode($year, $months, $tampilan),
            $this->filterPayload($year, $months, $tampilan)
        ));
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        $monthsStr = count($months) === 12 ? 'Full' : implode('-', $months);
        $periodeStr = $year . '-M' . $monthsStr . ($tampilan === RekapReport::VIEW_MODE_RINGKAS ? '-ringkas' : '');
        $filename = ExportFilename::make('Rekap-Periodik', $periodeStr, 'xls');

        return response()
            ->view('rekap.periodik-excel', array_merge(
                $this->payloadWithMode($year, $months, $tampilan),
                $this->filterPayload($year, $months, $tampilan)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * @param list<int> $months
     */
    private function payloadWithMode(int $year, array $months, string $tampilan): array
    {
        $payload = $this->payload($year, $months);
        $extra = [
            'tampilan' => $tampilan,
            'penandaTangan' => RekapReport::signatory(),
        ];

        if ($tampilan !== RekapReport::VIEW_MODE_RINGKAS) {
            return array_merge($payload, $extra);
        }

        return array_merge($payload, $extra, [
            'ringkasRows' => RekapReport::summaryRows($payload['rows']),
            'ringkasTotals' => RekapReport::summaryTotals($payload['totals']),
        ]);
    }

    /**
     * @param list<int> $months
     */
    private function payload(int $year, array $months): array
    {
        $currentYear = (int) now()->year;
        $ttl = ($year < $currentYear) ? RekapCache::TTL : 60;
        $cacheKey = $year . ':' . implode(',', $months);

        return Cache::remember(
            RekapCache::key('periodik', $cacheKey),
            $ttl,
            fn (): array => $this->buildReport($year, $months),
        );
    }

    /**
     * @return array{0: int, 1: list<int>}
     */
    private function resolveParams(mixed $yearInput, mixed $monthsInput): array
    {
        $currentYear = (int) now()->year;
        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            $year = $currentYear;
        }

        $selectedMonths = [];
        if (is_array($monthsInput)) {
            $rawMonths = $monthsInput;
        } elseif (is_string($monthsInput) && trim($monthsInput) !== '') {
            $rawMonths = explode(',', $monthsInput);
        } else {
            $rawMonths = range(1, 12);
        }

        foreach ($rawMonths as $m) {
            $mInt = filter_var($m, FILTER_VALIDATE_INT);
            if ($mInt !== false && $mInt >= 1 && $mInt <= 12) {
                $selectedMonths[] = $mInt;
            }
        }

        $selectedMonths = array_values(array_unique($selectedMonths));
        sort($selectedMonths);

        if (empty($selectedMonths)) {
            $selectedMonths = range(1, 12);
        }

        return [$year, $selectedMonths];
    }

    /**
     * @param list<int> $months
     */
    private function filterPayload(int $selectedYear, array $selectedMonths, string $tampilan): array
    {
        $years = RekapYears::get();
        $yearOptions = array_map(fn (string $y): array => [
            'value' => $y,
            'label' => 'Tahun ' . $y,
        ], $years);

        $monthOptions = [];
        foreach (self::MONTH_NAMES as $num => $name) {
            $monthOptions[] = [
                'value' => (string) $num,
                'label' => $name,
            ];
        }

        return [
            'year' => (string) $selectedYear,
            'selectedMonths' => array_map('strval', $selectedMonths),
            'years' => $yearOptions,
            'monthOptions' => $monthOptions,
            'periodeLabel' => $this->periodeLabel($selectedYear, $selectedMonths),
            'tampilan' => $tampilan,
        ];
    }

    /**
     * @param list<int> $months
     */
    private function buildReport(int $year, array $months): array
    {
        $periods = array_map(fn (int $m): string => sprintf('%04d-%02d', $year, $m), $months);
        $counts = RekapReport::countsByChannelPerPeriod($periods);

        $rows = Channel::with('children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Channel $channel) use ($counts, $periods): array {
                $row = $this->rowFor($channel, true, $periods, $counts);
                $row['children'] = $channel->children
                    ->map(fn (Channel $child): array => $this->rowFor($child, false, $periods, $counts))
                    ->all();
                return $row;
            })
            ->all();

        $totals = [];
        $totals['jumlah'] = 0;
        foreach ($periods as $period) {
            $totals[$period] = array_fill_keys(RekapReport::COLUMNS, 0);
        }

        foreach ($rows as $row) {
            $this->accumulateTotals($totals, $row);
            foreach ($row['children'] as $child) {
                $this->accumulateTotals($totals, $child);
            }
        }

        return [
            'rows' => $rows,
            'totals' => $totals,
            'months' => array_map(fn (string $period): array => [
                'key' => $period,
                'label' => self::MONTH_NAMES[(int) substr($period, 5, 2)],
            ], $periods),
        ];
    }

    /**
     * @param list<int> $months
     */
    private function periodeLabel(int $year, array $months): string
    {
        if (count($months) === 12) {
            return 'Tahun ' . $year . ' (Januari - Desember)';
        }

        if (count($months) === 1) {
            return self::MONTH_NAMES[$months[0]] . ' ' . $year;
        }

        // Cek apakah berurutan (consecutive)
        $isConsecutive = true;
        for ($i = 1; $i < count($months); $i++) {
            if ($months[$i] !== $months[$i - 1] + 1) {
                $isConsecutive = false;
                break;
            }
        }

        if ($isConsecutive) {
            $first = self::MONTH_NAMES[$months[0]];
            $last = self::MONTH_NAMES[end($months)];
            return sprintf('%s - %s %d', $first, $last, $year);
        }

        $names = array_map(fn (int $m) => self::MONTH_NAMES[$m], $months);
        if (count($names) <= 3) {
            return implode(', ', $names) . ' ' . $year;
        }

        return count($months) . ' Bulan Terpilih Tahun ' . $year;
    }

    /**
     * @param list<string> $periods
     * @param array<int, array<string, array<string, int>>> $counts
     */
    private function rowFor(Channel $channel, bool $isParent, array $periods, array $counts): array
    {
        $channelCounts = $counts[$channel->id] ?? [];
        $row = [
            'channel' => $channel->name,
            'isParent' => $isParent,
            'perPeriod' => [],
            'children' => [],
            'jumlah' => 0,
        ];

        $jumlah = 0;
        foreach ($periods as $period) {
            $periodCounts = $channelCounts[$period] ?? [];
            $periodValues = [];
            $periodSum = 0;

            foreach (RekapReport::COLUMNS as $column) {
                $value = $periodCounts[$column] ?? 0;
                $periodValues[$column] = $value;
                $periodSum += $value;
            }

            $row['perPeriod'][$period] = $periodValues;
            $jumlah += $periodSum;
        }

        $row['jumlah'] = $jumlah;

        return $row;
    }

    private function accumulateTotals(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $counts) {
            if (! isset($totals[$period])) {
                $totals[$period] = array_fill_keys(RekapReport::COLUMNS, 0);
            }

            foreach (RekapReport::COLUMNS as $column) {
                $totals[$period][$column] += $counts[$column] ?? 0;
            }
        }

        $totals['jumlah'] += $row['jumlah'];
    }
}
