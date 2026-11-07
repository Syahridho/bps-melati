<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
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
        return $this->renderPage($request, 'index', array_merge(DashboardStats::cached(), [
            'isLiveEnabled' => (bool) \App\Models\Setting::get('dashboard_live_enabled', true),
        ]));
    }
}