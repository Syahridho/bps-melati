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

class RekapTahunanController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function __invoke(Request $request): Response
    {
        $year = $this->resolveYear($request->query('year'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return Inertia::render('admin/rekap/tahunan', array_merge(
            $this->payloadWithMode($year, $tampilan),
            $this->filterPayload($year, $tampilan)
        ));
    }

    public function print(Request $request): View
    {
        $year = $this->resolveYear($request->query('year'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return view('rekap.tahunan-print', array_merge(
            $this->payloadWithMode($year, $tampilan),
            $this->filterPayload($year, $tampilan)
        ));
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        $year = $this->resolveYear($request->query('year'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        $periodeStr = $year.($tampilan === RekapReport::VIEW_MODE_RINGKAS ? '-ringkas' : '');
        $filename = ExportFilename::make('Rekap-Tahunan', $periodeStr, 'xls');

        return response()
            ->view('rekap.tahunan-excel', array_merge(
                $this->payloadWithMode($year, $tampilan),
                $this->filterPayload($year, $tampilan)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    private function payloadWithMode(string $year, string $tampilan): array
    {
        $payload = $this->payload($year);
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

    private function payload(string $year): array
    {
        $currentYear = (string) now()->year;
        $ttl = ($year < $currentYear) ? RekapCache::TTL : 60;

        return Cache::remember(
            RekapCache::key('tahunan', $year),
            $ttl,
            fn (): array => $this->buildReport($year),
        );
    }

    private function resolveYear(mixed $yearInput): string
    {
        $currentYear = (int) now()->year;
        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            return (string) $currentYear;
        }

        return (string) $year;
    }

    private function filterPayload(string $selectedYear, string $tampilan): array
    {
        $years = RekapYears::get();
        $yearOptions = array_map(fn (string $y): array => [
            'value' => $y,
            'label' => 'Tahun ' . $y,
        ], $years);

        return [
            'year' => $selectedYear,
            'years' => $yearOptions,
            'yearLabel' => $this->yearLabel($selectedYear),
            'tampilan' => $tampilan,
        ];
    }

    private function buildReport(string $year): array
    {
        $periods = $this->periodsFor($year);
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

    private function accumulate(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $values) {
            foreach ($values as $column => $value) {
                $totals[$period][$column] = ($totals[$period][$column] ?? 0) + $value;
            }
        }
        $totals['jumlah'] += $row['jumlah'];
    }

    private function periodsFor(string $year): array
    {
        return array_map(
            fn (int $month): string => sprintf('%04d-%02d', (int) $year, $month),
            range(1, 12),
        );
    }

    private function yearLabel(string $year): string
    {
        return sprintf('Tahun %s', $year);
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
