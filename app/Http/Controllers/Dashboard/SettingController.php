<?php

namespace App\Http\Controllers\Dashboard;

use App\Actions\RecordSettingUpdateAudit;
use App\Enums\AssignmentMode;
use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAutoCloseSettingsRequest;
use App\Http\Requests\Settings\UpdateReportSignatureSettingsRequest;
use App\Models\Setting;
use App\Models\SettingChangeLog;
use App\Services\AssignmentModeService;
use App\Services\RatingSettingService;
use App\Support\AppSettings;
use App\Support\DashboardStats;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    use RendersRolePage;

    /**
     * Redirect route lama ke halaman pertama pengaturan (Penugasan).
     */
    public function index(): RedirectResponse
    {
        return redirect()->route('settings.application.penugasan');
    }

    /**
     * Tampilkan halaman pengaturan penugasan.
     */
    public function penugasan(AssignmentModeService $modeService): Response
    {
        $pendingChange = $modeService->pending();

        return Inertia::render('settings/assignment/index', [
            'assignmentMode' => [
                'current' => $modeService->current()->value,
                'current_label' => $modeService->current()->label(),
                'options' => array_map(fn (AssignmentMode $mode): array => [
                    'value' => $mode->value,
                    'label' => $mode->label(),
                    'description' => $mode->description(),
                ], AssignmentMode::cases()),
                'pending' => $pendingChange !== null
                    ? [
                        'mode' => $pendingChange->new_value,
                        'label' => AssignmentMode::tryFrom((string) $pendingChange->new_value)?->label() ?? $pendingChange->new_value,
                        'scheduled_at' => $pendingChange->scheduled_at?->toIso8601String(),
                    ]
                    : null,
                'history' => array_map(fn (SettingChangeLog $log): array => [
                    'id' => $log->id,
                    'old_label' => AssignmentMode::tryFrom((string) $log->old_value)?->label() ?? $log->old_value,
                    'new_label' => AssignmentMode::tryFrom((string) $log->new_value)?->label() ?? $log->new_value,
                    'changed_by_name' => $log->changedBy?->name,
                    'scheduled_at' => $log->scheduled_at?->toIso8601String(),
                    'applied_at' => $log->applied_at?->toIso8601String(),
                    'cancelled_at' => $log->cancelled_at?->toIso8601String(),
                    'status' => $log->applied_at !== null
                        ? 'applied'
                        : ($log->cancelled_at !== null ? 'cancelled' : 'scheduled'),
                ], $modeService->history()),
            ],
        ]);
    }

    /**
     * Tampilkan halaman pengaturan batas waktu otomatis selesai & kadar pengawasan.
     */
    public function autoClose(): Response
    {
        return Inertia::render('settings/auto-close/index', [
            'settings' => [
                'auto_close_pengaduan_days' => Setting::get('auto_close_pengaduan_days', '3'),
                'auto_close_aspirasi_days' => Setting::get('auto_close_aspirasi_days', '1'),
                'auto_close_permintaan_informasi_days' => Setting::get('auto_close_permintaan_informasi_days', '5'),
                'kadar_pengawasan_hari' => Setting::get('kadar_pengawasan_hari', '30'),
            ],
        ]);
    }

    /**
     * Perbarui pengaturan batas waktu otomatis selesai & kadar pengawasan.
     */
    public function updateAutoClose(UpdateAutoCloseSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        foreach ($validated as $key => $value) {
            Setting::set($key, (string) $value);
        }

        $changedKeys = array_keys($validated);

        app(RecordSettingUpdateAudit::class)->handle($request->user(), $request, $changedKeys);

        // Bump versi cache dashboard agar payload langsung sinkron
        Cache::add(DashboardStats::VERSION_KEY, 0);
        Cache::increment(DashboardStats::VERSION_KEY);

        return redirect()->back()->with('flash', [
            'success' => 'Pengaturan batas waktu otomatis berhasil diperbarui!',
        ]);
    }

    /**
     * Tampilkan halaman pengaturan laporan & tanda tangan.
     */
    public function laporan(): Response
    {
        return Inertia::render('settings/recap/index', [
            'settings' => [
                'nama_penanda_tangan' => Setting::get('nama_penanda_tangan', ''),
                'jabatan_penanda_tangan' => Setting::get('jabatan_penanda_tangan', 'KETUA TIM PENGADUAN'),
                'kota_penanda_tangan' => Setting::get('kota_penanda_tangan', 'Pekanbaru'),
            ],
        ]);
    }

    /**
     * Perbarui pengaturan laporan & tanda tangan.
     */
    public function updateLaporan(UpdateReportSignatureSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        foreach ($validated as $key => $value) {
            Setting::set($key, (string) ($value ?? ''));
        }

        $changedKeys = array_keys($validated);

        app(RecordSettingUpdateAudit::class)->handle($request->user(), $request, $changedKeys);

        // Bump versi cache dashboard agar payload langsung sinkron
        Cache::add(DashboardStats::VERSION_KEY, 0);
        Cache::increment(DashboardStats::VERSION_KEY);

        return redirect()->back()->with('flash', [
            'success' => 'Pengaturan penanda tangan laporan berhasil diperbarui!',
        ]);
    }

    /**
     * Tampilkan halaman pengaturan penilaian pelapor.
     */
    public function penilaian(): Response
    {
        return Inertia::render('settings/rating/index', [
            'ratingEnabled' => AppSettings::ratingEnabled(),
        ]);
    }

    /**
     * Perbarui pengaturan penilaian pelapor (hanya admin).
     */
    public function updateRating(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'rating_enabled' => ['required', 'boolean'],
        ], [
            'rating_enabled.required' => 'Pengaturan penilaian pelapor wajib diisi.',
            'rating_enabled.boolean' => 'Pengaturan penilaian pelapor harus bernilai ya atau tidak.',
        ]);

        RatingSettingService::setRatingEnabled((bool) $validated['rating_enabled'], $request->user());

        return back()->with('flash', [
            'success' => 'Pengaturan penilaian pelapor berhasil diperbarui!',
        ]);
    }

    public function indexAppearce()
    {
        return Inertia::render('settings/appearance/index');
    }
}
