<?php

use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Settings\PasswordController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('settings', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/settings/application' : '/dashboard');
    });

    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/password', fn () => redirect()->to('/dashboard'));
    Route::get('settings/appearance', fn () => redirect()->to('/dashboard'));
});

// Pengaturan aplikasi hanya untuk admin: middleware role:admin berada di sini,
// bukan di dalam grup auth di atas, sehingga operator tetap mendapat 403.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('settings/application', [SettingController::class, 'index'])->name('settings.application.edit');
    Route::post('settings/application', [SettingController::class, 'update'])->name('settings.application.update');
});
