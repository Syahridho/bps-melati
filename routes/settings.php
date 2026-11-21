<?php

use App\Http\Controllers\Dashboard\NotificationController;
use App\Http\Controllers\Dashboard\SettingController;
use App\Http\Controllers\Settings\ApiController;
use App\Http\Controllers\Settings\AssignmentModeController;
use App\Http\Controllers\Settings\ChannelController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\SensorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('settings', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/settings/application' : '/settings/password');
    });

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', [SettingController::class, 'indexAppearce'])->name('appearance');
});

Route::middleware(['auth', 'role:admin,operator'])->group(function () {
    Route::get('settings/notification', [NotificationController::class, 'index'])->name('settings.notification');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('settings/application', [SettingController::class, 'index'])->name('settings.application.edit');
    Route::post('settings/application', [SettingController::class, 'update'])->name('settings.application.update');
    Route::post('settings/application/assignment-mode', [AssignmentModeController::class, 'update'])
        ->name('settings.application.assignment-mode');
    Route::match(['patch', 'post'], 'settings/application/rating', [SettingController::class, 'updateRating'])
        ->name('settings.application.rating')
        ->middleware('throttle:30,1');
    Route::match(['patch', 'post'], 'settings/application/rating-enabled', [SettingController::class, 'updateRating'])
        ->name('settings.application.rating-enabled')
        ->middleware('throttle:30,1');
    Route::match(['patch', 'post'], 'settings/rating', [SettingController::class, 'updateRating'])
        ->name('settings.rating')
        ->middleware('throttle:30,1');
    Route::match(['patch', 'post'], 'settings/rating/toggle', [SettingController::class, 'updateRating'])
        ->name('settings.rating.toggle')
        ->middleware('throttle:30,1');
    Route::get('settings/api', [ApiController::class, 'index'])->name('settings.api');
    Route::resource('settings/sumber-kanal', ChannelController::class)
        ->parameters(['sumber-kanal' => 'channel'])
        ->only(['index', 'store', 'update', 'destroy'])
        ->names(['index' => 'settings.sumber-kanal.index', 'store' => 'settings.sumber-kanal.store', 'update' => 'settings.sumber-kanal.update', 'destroy' => 'settings.sumber-kanal.destroy']);
    Route::get('settings/sensors', [SensorController::class, 'index'])->name('settings.sensors.index');
    Route::post('settings/sensors', [SensorController::class, 'store'])->name('settings.sensors.store');
    Route::post('settings/sensors/bulk', [SensorController::class, 'bulkStore'])->name('settings.sensors.bulk');
    Route::put('settings/sensors/{censoredWord}', [SensorController::class, 'update'])->name('settings.sensors.update');
    Route::patch('settings/sensors/{censoredWord}/toggle', [SensorController::class, 'toggle'])->name('settings.sensors.toggle');
    Route::delete('settings/sensors/{censoredWord}', [SensorController::class, 'destroy'])->name('settings.sensors.destroy');
    Route::patch('settings/notification/dashboard-live', [NotificationController::class, 'updateDashboardLive'])->name('settings.notification.dashboard-live');
});

Route::middleware(['auth', 'role:admin'])->group(function () {
    // Audit Log routes
    Route::get('audit-log', [\App\Http\Controllers\Settings\AuditLogController::class, 'index'])->name('audit-log.index');
    Route::get('audit-log/flags/summary', [\App\Http\Controllers\Settings\AuditLogController::class, 'flagsSummary'])->name('audit-log.flags-summary');
    Route::get('audit-log/flags', [\App\Http\Controllers\Settings\AuditFlagController::class, 'index'])->name('audit-flag.index');
    Route::get('audit-log/flags/{type}', [\App\Http\Controllers\Settings\AuditFlagController::class, 'byType'])->name('audit-flag.by-type');
    Route::patch('audit-flags/{flag}', [\App\Http\Controllers\Settings\AuditFlagController::class, 'updateStatus'])->name('audit-flag.update');
    Route::post('audit-log/export', [\App\Http\Controllers\Settings\AuditLogController::class, 'exportCsv'])->name('audit-log.export');

    // Peninjauan admin
    Route::get('audit-flags/review', [\App\Http\Controllers\Settings\ReviewController::class, 'index'])->name('review.index');
    Route::patch('audit-flags/{flag}/review', [\App\Http\Controllers\Settings\ReviewController::class, 'updateStatus'])->name('review.update');
    Route::post('audit-flags/{flag}/review', [\App\Http\Controllers\Settings\ReviewController::class, 'addNote'])->name('review.add-note');

    // Ringkasan mingguan
    Route::get('audit-log/summary-weekly', [\App\Http\Controllers\Settings\SummaryWeeklyController::class, 'index'])->name('audit-log.summary-weekly');
    Route::post('audit-log/summary-weekly', [\App\Http\Controllers\Settings\SummaryWeeklyController::class, 'generate'])->name('audit-log.summary-weekly.generate');
});