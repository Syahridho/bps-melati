<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiController extends Controller
{
    /**
     * Tampilkan halaman dokumentasi API di Pengaturan.
     *
     * Hanya data aman yang dikirim ke frontend: base URL dan nama header API key.
     * Nilai API key sendiri TIDAK pernah dikirim ke frontend.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('settings/api/index', [
            'apiKeyHeaderName' => 'X-API-KEY',
            'baseUrl' => rtrim(config('app.url', 'http://localhost'), '/') . '/api',
        ]);
    }
}
