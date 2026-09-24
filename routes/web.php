<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InputDataController;
use App\Http\Controllers\Admin\LaporanMasukController;
use App\Http\Controllers\Admin\LaporanSelesaiController;
use App\Http\Controllers\Admin\Rekap\RekapBulananController;
use App\Http\Controllers\Admin\Rekap\RekapSemesteranController;
use App\Http\Controllers\Admin\Rekap\RekapTahunanController;
use App\Http\Controllers\Operator\DashboardController as OperatorDashboardController;
use App\Http\Controllers\TicketController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/dashboard/admin' : '/dashboard/operator');
    })->name('dashboard');

    Route::middleware('role:admin')->prefix('dashboard/admin')->name('dashboard.admin.')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'create'])->name('input-data.create');
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::get('laporan-selesai', LaporanSelesaiController::class)->name('laporan-selesai.index');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-semesteran', RekapSemesteranController::class)->name('rekap-semesteran.index');
        Route::get('rekap-tahunan', RekapTahunanController::class)->name('rekap-tahunan.index');
    });

    Route::middleware('role:operator')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::get('/', OperatorDashboardController::class)->name('index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
