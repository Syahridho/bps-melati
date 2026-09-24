<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the operator dashboard.
     */
    public function __invoke(): Response
    {
        return Inertia::render('operator/dashboard');
    }
}
