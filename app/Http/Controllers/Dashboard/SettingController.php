<?php

namespace App\Http\Controllers\Dashboard;

use App\Enums\AssignmentMode;
use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\SettingChangeLog;
use App\Services\AssignmentModeService;
use App\Services\AuditLogger;
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
     * Tampilkan halaman pengaturan aplikasi.
     */
    public function index(AssignmentModeService $modeService): Response
    {
        $pendingChange = $modeService->pending();

        return Inertia::render('settings/application/index', [
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
            'settings' => [
                'nama_penanda_tangan' => Setting::get('nama_penanda_tangan', ''),
                'jabatan_penanda_tangan' => Setting::get('jabatan_penanda_tangan', 'KETUA TIM PENGADUAN'),
                'kota_penanda_tangan' => Setting::get('kota_penanda_tangan', 'Pekanbaru'),
                'auto_close_pengaduan_days' => Setting::get('auto_close_pengaduan_days', '3'),
                'auto_close_aspirasi_days' => Setting::get('auto_close_aspirasi_days', '1'),
                'auto_close_permintaan_informasi_days' => Setting::get('auto_close_permintaan_informasi_days', '5'),
                'kadar_pengawasan_hari' => Setting::get('kadar_pengawasan_hari', '30'),
                'rating_enabled' => AppSettings::ratingEnabled(),
            ],
            'ratingEnabled' => AppSettings::ratingEnabled(),
        ]);
    }

    /**
     * Perbarui pengaturan aplikasi (penanda tangan & batas waktu otomatis selesai).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'jabatan_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'kota_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'auto_close_pengaduan_days' => ['required', 'integer', 'min:0', 'max:365'],
            'auto_close_aspirasi_days' => ['required', 'integer', 'min:0', 'max:365'],
            'auto_close_permintaan_informasi_days' => ['required', 'integer', 'min:0', 'max:365'],
            'kadar_pengawasan_hari' => ['required', 'integer', 'min:0', 'max:365'],
            'rating_enabled' => ['sometimes', 'boolean'],
        ], [
            'auto_close_pengaduan_days.min' => 'Batas waktu pengaduan minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'auto_close_aspirasi_days.min' => 'Batas waktu aspirasi minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'auto_close_permintaan_informasi_days.min' => 'Batas waktu permintaan informasi minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'kadar_pengawasan_hari.min' => 'Kadar pengawasan minimal 0 hari.',
            'auto_close_pengaduan_days.max' => 'Batas waktu pengaduan maksimal 365 hari.',
            'auto_close_aspirasi_days.max' => 'Batas waktu aspirasi maksimal 365 hari.',
            'auto_close_permintaan_informasi_days.max' => 'Batas waktu permintaan informasi maksimal 365 hari.',
            'kadar_pengawasan_hari.max' => 'Kadar pengawasan maksimal 365 hari.',
            'auto_close_pengaduan_days.required' => 'Batas waktu pengaduan wajib diisi. Isi 0 untuk menonaktifkan.',
            'auto_close_aspirasi_days.required' => 'Batas waktu aspirasi wajib diisi. Isi 0 untuk menonaktifkan.',
            'auto_close_permintaan_informasi_days.required' => 'Batas waktu permintaan informasi wajib diisi. Isi 0 untuk menonaktifkan.',
            'kadar_pengawasan_hari.required' => 'Kadar pengawasan wajib diisi.',
        ]);

        foreach ($validated as $key => $value) {
            if ($key === 'rating_enabled') {
                continue;
            }
            Setting::set($key, is_bool($value) ? ($value ? '1' : '0') : (string) $value);
        }

        if (array_key_exists('rating_enabled', $validated)) {
            RatingSettingService::setRatingEnabled((bool) $validated['rating_enabled'], $request->user());
        }

        $changedKeys = array_values(array_diff(array_keys($validated), ['rating_enabled']));

        if ($changedKeys !== []) {
            AuditLogger::log(
                eventType: 'setting.updated',
                category: 'setting',
                actor: $request->user(),
                request: $request,
                meta: ['keys' => $changedKeys],
                severity: 'notice',
            );
        }

        // Bump versi cache dashboard agar saat setting diubah, payload langsung sinkron
        Cache::add(DashboardStats::VERSION_KEY, 0);
        Cache::increment(DashboardStats::VERSION_KEY);

        return redirect()->back()->with('flash', [
            'success' => 'Pengaturan berhasil diperbarui!',
        ]);
    }

    /**
     * Perbarui pengaturan penilaian pelapor (hanya admin).
     */
    public function updateRating(\Illuminate\Http\Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'rating_enabled' => ['required', 'boolean'],
        ], [
            'rating_enabled.required' => 'Pengaturan penilaian pelapor wajib diisi.',
            'rating_enabled.boolean' => 'Pengaturan penilaian pelapor harus bernilai ya atau tidak.',
        ]);

        RatingSettingService::setRatingEnabled((bool) $validated['rating_enabled'], $request->user());

        return back();
    }

    public function indexAppearce() {
         return Inertia::render('settings/appearance/index');
    }
}
