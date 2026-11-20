<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateDashboardLiveRequest;
use App\Models\Setting;
use App\Support\DashboardStats;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Tampilkan halaman pengaturan notifikasi (push browser + realtime dashboard).
     * Tersedia untuk semua role yang boleh masuk dashboard (admin, operator, operator_tim).
     */
    public function index(): Response
    {
        $user = auth()->user();

        return Inertia::render('settings/notification/index', [
            'dashboardLiveEnabled' => (bool) Setting::get('dashboard_live_enabled', true),
            'canManageGlobal' => $user?->isAdmin() ?? false,
        ]);
    }

    /**
     * Perbarui pengaturan pembaruan realtime dashboard (hanya admin).
     */
    public function updateDashboardLive(UpdateDashboardLiveRequest $request): RedirectResponse
    {
        $enabled = (bool) $request->validated('dashboard_live_enabled');

        Setting::set('dashboard_live_enabled', $enabled ? '1' : '0');

        // Bump versi cache dashboard agar payload langsung sinkron di semua role.
        Cache::add(DashboardStats::VERSION_KEY, 0);
        Cache::increment(DashboardStats::VERSION_KEY);

        return back()->with('flash', [
            'success' => 'Pengaturan pembaruan realtime dashboard diperbarui.',
        ]);
    }
}
