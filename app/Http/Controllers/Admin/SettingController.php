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
        return Inertia::render('admin/pengaturan', [
            'settings' => [
                'nama_penanda_tangan' => Setting::get('nama_penanda_tangan', ''),
                'jabatan_penanda_tangan' => Setting::get('jabatan_penanda_tangan', 'KETUA TIM PENGADUAN'),
                'kota_penanda_tangan' => Setting::get('kota_penanda_tangan', 'Pekanbaru'),
            ],
        ]);
    }

    /**
     * Perbarui pengaturan penanda tangan laporan.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'jabatan_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'kota_penanda_tangan' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        return redirect()->back()->with('flash', [
            'success' => 'Pengaturan penanda tangan berhasil diperbarui!',
        ]);
    }
}
