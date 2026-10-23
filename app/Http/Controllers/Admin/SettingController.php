<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    /**
     * Tampilkan halaman pengaturan aplikasi.
     */
    public function index(): Response
    {
        return Inertia::render('settings/application', [
            'settings' => [
                'nama_penanda_tangan' => Setting::get('nama_penanda_tangan', ''),
                'jabatan_penanda_tangan' => Setting::get('jabatan_penanda_tangan', 'KETUA TIM PENGADUAN'),
                'kota_penanda_tangan' => Setting::get('kota_penanda_tangan', 'Pekanbaru'),
                'auto_close_pengaduan_days' => Setting::get('auto_close_pengaduan_days', '3'),
                'auto_close_aspirasi_days' => Setting::get('auto_close_aspirasi_days', '1'),
                'auto_close_permintaan_informasi_days' => Setting::get('auto_close_permintaan_informasi_days', '5'),
                'kadar_pengawasan_hari' => Setting::get('kadar_pengawasan_hari', '30'),
            ],
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
            Setting::set($key, (string) $value);
        }

        return redirect()->back()->with('flash', [
            'success' => 'Pengaturan berhasil diperbarui!',
        ]);
    }
}
