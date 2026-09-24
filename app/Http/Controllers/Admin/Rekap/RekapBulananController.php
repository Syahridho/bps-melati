<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class RekapBulananController extends Controller
{
    /**
     * Show the monthly recap.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/rekap/bulanan');
    }
}
