<?php

use App\Http\Controllers\Dashboard\SettingController;
use App\Http\Controllers\Settings\ApiController;
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

    Route::get('settings/appearance', [SettingController::class, 'indexAppearce'])->name('appearance');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('settings/application', [SettingController::class, 'index'])->name('settings.application.edit');
    Route::post('settings/application', [SettingController::class, 'update'])->name('settings.application.update');
    Route::get('settings/api', [ApiController::class, 'index'])->name('settings.api');
});
