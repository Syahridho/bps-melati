<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class LaporanSelesaiController extends Controller
{
    /**
     * Show completed reports.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/laporan-selesai');
    }
}
