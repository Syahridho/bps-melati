<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\DashboardStats;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Data dashboard admin.
     *
     * Angka, tren, dan laporan terbaru dihitung sekali di App\Support\DashboardStats
     * supaya identik dengan dashboard operator.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/dashboard', DashboardStats::cached());
    }
}
