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
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapSemesteranController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function __invoke(Request $request): Response
    {
        [$year, $semesterNum] = $this->resolveParams($request->query('year'), $request->query('semester'));
        $semesterKey = sprintf('%04d-%d', $year, $semesterNum);
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return Inertia::render('admin/rekap/semesteran', array_merge(
            $this->payloadWithMode($semesterKey, $tampilan),
            $this->filterPayload($year, $semesterNum, $tampilan)
        ));
    }

    public function print(Request $request): View
    {
        [$year, $semesterNum] = $this->resolveParams($request->query('year'), $request->query('semester'));
        $semesterKey = sprintf('%04d-%d', $year, $semesterNum);
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        return view('rekap.semesteran-print', array_merge(
            $this->payloadWithMode($semesterKey, $tampilan),
            $this->filterPayload($year, $semesterNum, $tampilan)
        ));
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        [$year, $semesterNum] = $this->resolveParams($request->query('year'), $request->query('semester'));
        $semesterKey = sprintf('%04d-%d', $year, $semesterNum);
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));

        $roman = $semesterNum === 1 ? 'I' : 'II';
        $periodeStr = $roman.'-'.$year.($tampilan === RekapReport::VIEW_MODE_RINGKAS ? '-ringkas' : '');
        $filename = ExportFilename::make('Rekap-Semesteran', $periodeStr, 'xls');

        return response()
            ->view('rekap.semesteran-excel', array_merge(
                $this->payloadWithMode($semesterKey, $tampilan),
                $this->filterPayload($year, $semesterNum, $tampilan)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    private function payloadWithMode(string $semesterKey, string $tampilan): array
    {
        $payload = $this->payload($semesterKey);
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

    private function payload(string $semesterKey): array
    {
        $currentYear = (string) now()->year;
        $semYear = substr($semesterKey, 0, 4);
        $ttl = ($semYear < $currentYear) ? RekapCache::TTL : 60;

        return Cache::remember(
            RekapCache::key('semesteran', $semesterKey),
            $ttl,
            fn (): array => $this->buildReport($semesterKey),
        );
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function resolveParams(mixed $yearInput, mixed $semesterInput): array
    {
        $currentYear = (int) now()->year;
        $currentSemesterNum = now()->month <= 6 ? 1 : 2;

        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            $year = $currentYear;
        }

        $semesterNum = filter_var($semesterInput, FILTER_VALIDATE_INT);
        if ($semesterNum === false || ($semesterNum !== 1 && $semesterNum !== 2)) {
            $semesterNum = ($year === $currentYear) ? $currentSemesterNum : 2;
        }

        if ($year === $currentYear && $semesterNum > $currentSemesterNum) {
            $semesterNum = $currentSemesterNum;
        }

        return [$year, $semesterNum];
    }

    private function filterPayload(int $selectedYear, int $selectedSemesterNum, string $tampilan): array
    {
        $years = RekapYears::get();
        $yearOptions = array_map(fn (string $y): array => [
            'value' => $y,
            'label' => 'Tahun ' . $y,
        ], $years);

        $currentYear = (int) now()->year;
        $currentSemesterNum = now()->month <= 6 ? 1 : 2;

        $semesters = [
            [
                'value' => '1',
                'label' => 'Semester I (Jan - Jun)',
                'disabled' => ($selectedYear === $currentYear && 1 > $currentSemesterNum),
            ],
            [
                'value' => '2',
                'label' => 'Semester II (Jul - Des)',
                'disabled' => ($selectedYear === $currentYear && 2 > $currentSemesterNum),
            ],
        ];

        $semesterKey = sprintf('%04d-%d', $selectedYear, $selectedSemesterNum);

        return [
            'year' => (string) $selectedYear,
            'semester' => (string) $selectedSemesterNum,
            'semesterKey' => $semesterKey,
            'years' => $yearOptions,
            'semesters' => $semesters,
            'semesterLabel' => $this->semesterLabel($semesterKey),
            'tampilan' => $tampilan,
        ];
    }

    private function buildReport(string $semesterKey): array
    {
        $periods = $this->periodsFor($semesterKey);
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

    private function periodsFor(string $semesterKey): array
    {
        $year = (int) substr($semesterKey, 0, 4);
        $startMonth = $semesterKey[5] === '1' ? 1 : 7;

        return array_map(
            fn (int $offset): string => sprintf('%04d-%02d', $year, $startMonth + $offset),
            range(0, 5),
        );
    }

    private function semesterLabel(string $semesterKey): string
    {
        $year = substr($semesterKey, 0, 4);
        $roman = $semesterKey[5] === '1' ? 'I' : 'II';
        $periods = $this->periodsFor($semesterKey);

        $first = self::MONTH_NAMES[(int) substr($periods[0], 5, 2)];
        $last = self::MONTH_NAMES[(int) substr($periods[5], 5, 2)];

        return sprintf('Semester %s (%s - %s) %s', $roman, $first, $last, $year);
    }

    private function semesterOf(Carbon $date): string
    {
        $half = $date->month <= 6 ? 1 : 2;
        return sprintf('%04d-%d', $date->year, $half);
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

    private function accumulateTotals(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $values) {
            foreach ($values as $column => $value) {
                $totals[$period][$column] = ($totals[$period][$column] ?? 0) + $value;
            }
        }
        $totals['jumlah'] += $row['jumlah'];
    }
}
