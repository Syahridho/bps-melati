<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\DashboardPeriod;
use App\Support\DashboardStats;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    use RendersRolePage;

    /**
     * Data dashboard admin.
     *
     * Angka, tren, dan laporan terbaru dihitung sekali di App\Support\DashboardStats
     * supaya identik dengan dashboard operator.
     */
    public function __invoke(Request $request): Response
    {
        $canFilterPeriod = (bool) ($request->user()?->isAdmin() ?? false);

        // Role non-admin dipaksa bulan ini, abaikan input period/month/year.
        if (! $canFilterPeriod) {
            $period = DashboardPeriod::resolve('this_month', null, null);
        } else {
            $period = DashboardPeriod::resolve(
                $request->query('period'),
                $request->query('month'),
                $request->query('year')
            );
        }

        return $this->renderPage($request, 'index', array_merge(DashboardStats::cached($period), [
            'isLiveEnabled' => (bool) Setting::get('dashboard_live_enabled', true),
            'period' => $period['period'],
            'month' => $period['month'],
            'year' => $period['year'],
            'canFilterPeriod' => $canFilterPeriod,
            'years' => $canFilterPeriod
                ? array_map(fn (string $y): array => ['value' => $y, 'label' => 'Tahun '.$y], DashboardPeriod::availableYears())
                : [],
            'months' => $canFilterPeriod
                ? DashboardPeriod::monthOptions($period['year'])
                : [],
        ]));
    }
}
