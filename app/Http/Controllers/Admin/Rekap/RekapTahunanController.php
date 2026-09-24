<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class RekapTahunanController extends Controller
{
    /**
     * Show the yearly recap.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/rekap/tahunan');
    }
}
