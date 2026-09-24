<?php

namespace App\Http\Controllers\Admin\Rekap;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class RekapSemesteranController extends Controller
{
    /**
     * Show the semester recap.
     */
    public function __invoke(): Response
    {
        return Inertia::render('admin/rekap/semesteran');
    }
}
