<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Support\RekapCache;
use App\Support\RekapReport;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapTahunanController extends Controller
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
     * Show the yearly recap (12 bulan).
     */
    public function __invoke(Request $request): Response
    {
        $year = $this->resolveYear($request->query('year'));

        return Inertia::render('admin/rekap/tahunan', $this->payload($year));
    }

    /**
     * Halaman cetak (dipakai sebagai sumber iframe untuk print / simpan PDF).
     */
    public function print(Request $request): View
    {
        $year = $this->resolveYear($request->query('year'));

        return view('rekap.tahunan-print', $this->payload($year));
    }

    /**
     * Export rekap tahunan ke Excel (.xls).
     */
    public function excel(Request $request): \Illuminate\Http\Response
    {
        $year = $this->resolveYear($request->query('year'));

        return response()
            ->view('rekap.tahunan-excel', $this->payload($year))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="rekap-tahunan-'.$year.'.xls"');
    }

    /**
     * Payload rekap dari cache (dibuat sekali per tahun).
     *
     * @return array<string, mixed>
     */
    private function payload(string $year): array
    {
        return Cache::remember(
            RekapCache::key('tahunan', $year),
            RekapCache::TTL,
            fn (): array => $this->buildReport($year),
        );
    }

    /**
     * Validasi tahun (YYYY) dan fallback ke tahun berjalan.
     */
    private function resolveYear(?string $year): string
    {
        if (is_string($year) && preg_match('/^\d{4}$/', $year) === 1) {
            return $year;
        }

        return (string) now()->year;
    }

    /**
     * Bangun payload rekap: header bulan, baris kanal per bulan (dengan breakdown
     * 4 kolom klasifikasi), total, daftar tahun.
     *
     * @return array<string, mixed>
     */
    private function buildReport(string $year): array
    {
        $periods = $this->periodsFor($year);

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
            'year' => $year,
            'yearLabel' => $this->yearLabel($year),
            'years' => $this->availableYears($year),
            'penandaTangan' => RekapReport::signatory(),
        ];
    }

    /**
     * Baris kanal dengan breakdown 4 kolom klasifikasi per periode (12 bulan)
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
     * Daftar bulan (Y-m) dalam sebuah tahun.
     *
     * @return list<string>
     */
    private function periodsFor(string $year): array
    {
        return array_map(
            fn (int $month): string => sprintf('%04d-%02d', (int) $year, $month),
            range(1, 12),
        );
    }

    /**
     * Label tahun, contoh: "Tahun 2026".
     */
    private function yearLabel(string $year): string
    {
        return sprintf('Tahun %s', $year);
    }

    /**
     * Daftar tahun yang tersedia untuk dropdown.
     *
     * @return list<array{value: string, label: string}>
     */
    private function availableYears(string $current): array
    {
        $years = [];

        foreach (RekapReport::ticketPeriods() as $period) {
            $years[substr($period, 0, 4)] = true;
        }

        $years[$current] = true;

        $values = array_keys($years);
        rsort($values);

        return array_map(fn (string $year): array => [
            'value' => $year,
            'label' => $this->yearLabel($year),
        ], $values);
    }
}
