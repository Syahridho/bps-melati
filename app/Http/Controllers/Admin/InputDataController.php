<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class InputDataController extends Controller
{
    /**
     * Show the data input page.
     */
    public function create(): Response
    {
        return Inertia::render('admin/input-data');
    }
}
