<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use App\Support\RekapCache;
use App\Support\RekapReport;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class RekapBulananController extends Controller
{
    /**
     * Show the monthly recap.
     */
    public function __invoke(Request $request): Response
    {
        $period = $this->resolvePeriod($request->query('period'));

        return Inertia::render('admin/rekap/bulanan', $this->payload($period));
    }

    /**
     * Halaman cetak (dipakai sebagai sumber iframe untuk print / simpan PDF).
     */
    public function print(Request $request): View
    {
        $period = $this->resolvePeriod($request->query('period'));

        return view('rekap.bulanan-print', $this->payload($period));
    }

    /**
     * Export rekap bulanan ke Excel (.xls).
     */
    public function excel(Request $request): \Illuminate\Http\Response
    {
        $period = $this->resolvePeriod($request->query('period'));

        return response()
            ->view('rekap.bulanan-excel', $this->payload($period))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="rekap-bulanan-'.$period.'.xls"');
    }

    /**
     * Payload rekap dari cache (dibuat sekali per periode).
     *
     * @return array<string, mixed>
     */
    private function payload(string $period): array
    {
        return Cache::remember(
            RekapCache::key('bulanan', $period),
            RekapCache::TTL,
            fn (): array => $this->buildReport($period),
        );
    }

    /**
     * Validasi periode (Y-m) dan fallback ke bulan berjalan.
     */
    private function resolvePeriod(?string $period): string
    {
        if (is_string($period) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period) === 1) {
            return $period;
        }

        return now()->format('Y-m');
    }

    /**
     * Bangun payload rekap: baris kanal, total kolom, daftar periode, penanda tangan.
     *
     * @return array<string, mixed>
     */
    private function buildReport(string $period): array
    {
        $counts = RekapReport::countsByChannel($period);
        $rows = RekapReport::rowsFor($counts);

        $periods = RekapReport::ticketPeriods();

        if (! in_array($period, $periods, true)) {
            $periods[] = $period;
            rsort($periods);
        }

        return [
            'rows' => $rows['rows'],
            'totals' => $rows['totals'],
            'period' => $period,
            'periodLabel' => RekapReport::formatPeriod($period, 'F Y'),
            'periods' => array_map(fn (string $value): array => [
                'value' => $value,
                'label' => RekapReport::formatPeriod($value, 'F Y'),
            ], $periods),
            'penandaTangan' => RekapReport::signatory(),
        ];
    }
}
