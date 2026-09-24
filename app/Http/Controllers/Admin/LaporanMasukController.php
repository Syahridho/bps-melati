<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class LaporanMasukController extends Controller
{
    /**
     * Show incoming reports.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/laporan-masuk');
    }
}
