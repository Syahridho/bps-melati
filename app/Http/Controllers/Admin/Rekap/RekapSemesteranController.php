<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Support\RekapCache;
use App\Support\RekapReport;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapSemesteranController extends Controller
{
    /**
     * Nama bulan (1-12) untuk header kolom rekap.
     *
     * @var array<int, string>
     */
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /**
     * Show the semester recap (6 bulan).
     */
    public function __invoke(Request $request): Response
    {
        $semester = $this->resolveSemester($request->query('semester'));

        return Inertia::render('admin/rekap/semesteran', $this->payload($semester));
    }

    /**
     * Halaman cetak (dipakai sebagai sumber iframe untuk print / simpan PDF).
     */
    public function print(Request $request): View
    {
        $semester = $this->resolveSemester($request->query('semester'));

        return view('rekap.semesteran-print', $this->payload($semester));
    }

    /**
     * Payload rekap dari cache (dibuat sekali per semester).
     *
     * @return array<string, mixed>
     */
    private function payload(string $semester): array
    {
        return Cache::remember(
            RekapCache::key('semesteran', $semester),
            RekapCache::TTL,
            fn (): array => $this->buildReport($semester),
        );
    }

    /**
     * Validasi semester (Y-S, S = 1|2) dan fallback ke semester berjalan.
     */
    private function resolveSemester(?string $semester): string
    {
        if (is_string($semester) && preg_match('/^\d{4}-[12]$/', $semester) === 1) {
            return $semester;
        }

        return $this->semesterOf(now());
    }

    /**
     * Bangun payload rekap: header bulan, baris kanal per bulan (dengan breakdown
     * 4 kolom klasifikasi), total, daftar semester.
     *
     * @return array<string, mixed>
     */
    private function buildReport(string $semester): array
    {
        $periods = $this->periodsFor($semester);

        $counts = RekapReport::countsByChannelPerPeriod($periods);

        $rows = Channel::with('children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Channel $channel) use ($counts, $periods): array {
                $row = $this->rowFor($channel, $periods, $counts);

                $row['children'] = $channel->children
                    ->map(fn (Channel $child): array => $this->rowFor($child, $periods, $counts))
                    ->all();

                return $row;
            })
            ->all();

        $totals = [];
        foreach ($periods as $period) {
            $totals[$period] = array_fill_keys(RekapReport::COLUMNS, 0);
        }
        $totals['jumlah'] = 0;

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
            'semester' => $semester,
            'semesterLabel' => $this->semesterLabel($semester),
            'semesters' => $this->availableSemesters($semester),
            'penandaTangan' => RekapReport::signatory(),
        ];
    }

    /**
     * Baris kanal dengan breakdown 4 kolom klasifikasi per periode (6 bulan)
     * dan totalnya.
     *
     * @param  array<int, array<string, array<string, int>>>  $counts
     * @param  list<string>  $periods
     * @return array<string, mixed>
     */
    private function rowFor(Channel $channel, array $periods, array $counts): array
    {
        $perPeriod = [];
        $jumlah = 0;

        foreach ($periods as $period) {
            $periodCounts = $counts[$channel->id][$period] ?? [];

            $values = [];

            foreach (RekapReport::COLUMNS as $column) {
                $value = (int) ($periodCounts[$column] ?? 0);
                $values[$column] = $value;
                $jumlah += $value;
            }

            $perPeriod[$period] = $values;
        }

        return [
            'channel' => $channel->name,
            'perPeriod' => $perPeriod,
            'jumlah' => $jumlah,
            'children' => [],
        ];
    }

    /**
     * @param  array<string, array<string, int>|int>  $totals
     * @param  array<string, mixed>  $row
     */
    private function accumulate(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $values) {
            foreach ($values as $column => $value) {
                $totals[$period][$column] = ($totals[$period][$column] ?? 0) + $value;
            }
        }

        $totals['jumlah'] += $row['jumlah'];
    }

    /**
     * Daftar bulan (Y-m) dalam sebuah semester.
     *
     * @return list<string>
     */
    private function periodsFor(string $semester): array
    {
        $year = (int) substr($semester, 0, 4);
        $startMonth = $semester[5] === '1' ? 1 : 7;

        return array_map(
            fn (int $offset): string => sprintf('%04d-%02d', $year, $startMonth + $offset),
            range(0, 5),
        );
    }

    /**
     * Label semester, contoh: "Semester I (Januari - Juni) 2026".
     */
    private function semesterLabel(string $semester): string
    {
        $year = substr($semester, 0, 4);
        $roman = $semester[5] === '1' ? 'I' : 'II';
        $periods = $this->periodsFor($semester);

        $first = self::MONTH_NAMES[(int) substr($periods[0], 5, 2)];
        $last = self::MONTH_NAMES[(int) substr($periods[5], 5, 2)];

        return sprintf('Semester %s (%s - %s) %s', $roman, $first, $last, $year);
    }

    /**
     * Semester berjalan dari sebuah tanggal.
     */
    private function semesterOf(Carbon $date): string
    {
        $half = $date->month <= 6 ? 1 : 2;

        return sprintf('%04d-%d', $date->year, $half);
    }

    /**
     * Daftar semester yang tersedia untuk dropdown.
     *
     * @return list<array{value: string, label: string}>
     */
    private function availableSemesters(string $current): array
    {
        $semesters = [];

        foreach (RekapReport::ticketPeriods() as $period) {
            $semester = sprintf('%s-%d', substr($period, 0, 4), (int) substr($period, 5, 2) <= 6 ? 1 : 2);

            $semesters[$semester] = true;
        }

        $semesters[$current] = true;

        $values = array_keys($semesters);
        rsort($values);

        return array_map(fn (string $semester): array => [
            'value' => $semester,
            'label' => $this->semesterLabel($semester),
        ], $values);
    }
}