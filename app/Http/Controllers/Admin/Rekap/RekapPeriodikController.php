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
        [$year, $dari, $sampai] = $this->resolveParams(
            $request->query('year'),
            $request->query('dari'),
            $request->query('sampai')
        );
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return Inertia::render('admin/rekap/periodik', array_merge(
            $this->payloadWithMode($year, $dari, $sampai, $tampilan),
            $this->filterPayload($year, $dari, $sampai, $tampilan)
        ));
    }

    public function print(Request $request): View
    {
        [$year, $dari, $sampai] = $this->resolveParams(
            $request->query('year'),
            $request->query('dari'),
            $request->query('sampai')
        );
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return view('rekap.periodik-print', array_merge(
            $this->payloadWithMode($year, $dari, $sampai, $tampilan),
            $this->filterPayload($year, $dari, $sampai, $tampilan)
        ));
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        [$year, $dari, $sampai] = $this->resolveParams(
            $request->query('year'),
            $request->query('dari'),
            $request->query('sampai')
        );
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        $dariNama = self::MONTH_NAMES[$dari];
        $sampaiNama = self::MONTH_NAMES[$sampai];
        $periodeStr = $dari === $sampai 
            ? sprintf('%s-%s', $dariNama, $year)
            : sprintf('%s-%s-%s', $dariNama, $sampaiNama, $year);
        if ($tampilan === RekapReport::VIEW_MODE_RINGKAS) {
            $periodeStr .= '-ringkas';
        }

        $filename = ExportFilename::make('Rekap-Periodik', $periodeStr, 'xls');

        return response()
            ->view('rekap.periodik-excel', array_merge(
                $this->payloadWithMode($year, $dari, $sampai, $tampilan),
                $this->filterPayload($year, $dari, $sampai, $tampilan)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    private function payloadWithMode(int $year, int $dari, int $sampai, string $tampilan): array
    {
        $payload = $this->payload($year, $dari, $sampai);
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

    private function payload(int $year, int $dari, int $sampai): array
    {
        $currentYear = (int) now()->year;
        $ttl = ($year < $currentYear) ? RekapCache::TTL : 60;
        $cacheKey = sprintf('periodik:%d:%d-%d', $year, $dari, $sampai);

        return Cache::remember(
            RekapCache::key('periodik', $cacheKey),
            $ttl,
            fn (): array => $this->buildReport($year, $dari, $sampai),
        );
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private function resolveParams(mixed $yearInput, mixed $dariInput, mixed $sampaiInput): array
    {
        $currentYear = (int) now()->year;
        $currentMonth = (int) now()->month;

        $years = RekapYears::get();
        $minYear = min(2024, (int) min($years));
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            $year = $currentYear;
        }

        $dari = filter_var($dariInput, FILTER_VALIDATE_INT);
        if ($dari === false || $dari < 1 || $dari > 12) {
            $dari = 1;
        }

        $sampai = filter_var($sampaiInput, FILTER_VALIDATE_INT);
        if ($sampai === false || $sampai < 1 || $sampai > 12) {
            $sampai = 12;
        }

        if ($dari > $sampai) {
            $sampai = $dari;
        }

        if ($year === $currentYear) {
            if ($dari > $currentMonth) {
                $dari = $currentMonth;
            }
            if ($sampai > $currentMonth) {
                $sampai = $currentMonth;
            }
            if ($dari > $sampai) {
                $sampai = $dari;
            }
        }

        return [$year, $dari, $sampai];
    }

    private function filterPayload(int $selectedYear, int $selectedDari, int $selectedSampai, string $tampilan): array
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

        $dariNama = self::MONTH_NAMES[$selectedDari];
        $sampaiNama = self::MONTH_NAMES[$selectedSampai];
        $periodeLabel = $selectedDari === $selectedSampai 
            ? sprintf('%s %s', $dariNama, $selectedYear)
            : sprintf('%s - %s %s', $dariNama, $sampaiNama, $selectedYear);

        return [
            'year' => (string) $selectedYear,
            'dari' => (string) $selectedDari,
            'sampai' => (string) $selectedSampai,
            'years' => $yearOptions,
            'monthOptions' => $months,
            'periodeLabel' => $periodeLabel,
            'tampilan' => $tampilan,
        ];
    }

    private function buildReport(int $year, int $dari, int $sampai): array
    {
        $periods = $this->periodsFor($year, $dari, $sampai);
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
            $this->accumulate($totals, $row);
            foreach ($row['children'] as $child) {
                $this->accumulate($totals, $child);
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

    private function periodsFor(int $year, int $dari, int $sampai): array
    {
        return array_map(
            fn (int $month): string => sprintf('%04d-%02d', $year, $month),
            range($dari, $sampai),
        );
    }

    private function accumulate(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $values) {
            foreach ($values as $column => $value) {
                $totals[$period][$column] = ($totals[$period][$column] ?? 0) + $value;
            }
        }
        $totals['jumlah'] += $row['jumlah'];
    }

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
}
