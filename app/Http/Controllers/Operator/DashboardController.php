<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\DashboardStats;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Data dashboard operator.
     *
     * Angka, tren, dan laporan terbaru dihitung sekali di App\Support\DashboardStats
     * supaya identik dengan dashboard admin.
     */
    public function __invoke(): Response
    {
        return Inertia::render('operator/dashboard', array_merge(DashboardStats::cached(), [
            'isLiveEnabled' => (bool) Setting::get('dashboard_live_enabled', true),
        ]));
    }
}
