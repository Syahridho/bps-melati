<?php

use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Settings\PasswordController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::get('settings', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/settings/application' : '/settings/password');
    });

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});

// Pengaturan aplikasi hanya untuk admin: middleware role:admin berada di sini,
// bukan di dalam grup auth di atas, sehingga operator tetap mendapat 403.
Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('settings/application', [SettingController::class, 'index'])->name('settings.application.edit');
    Route::post('settings/application', [SettingController::class, 'update'])->name('settings.application.update');
});