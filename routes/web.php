<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InputDataController;
use App\Http\Controllers\Admin\LaporanMasukController;
use App\Http\Controllers\Admin\LaporanSelesaiController;
use App\Http\Controllers\Admin\OperatorController;
use App\Http\Controllers\Admin\Rekap\RekapBulananController;
use App\Http\Controllers\Admin\Rekap\RekapPeriodikController;
use App\Http\Controllers\Admin\TicketResponseController;
use App\Http\Controllers\Admin\TicketFlagController;
use App\Http\Controllers\Admin\TicketPengawasanController;
use App\Http\Controllers\CheckAttachmentDownloadController;
use App\Http\Controllers\CheckTicketController;
use App\Http\Controllers\Operator\DashboardController as OperatorDashboardController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::post('/tickets', [TicketController::class, 'store'])->middleware('throttle:ticket-store')->name('tickets.store');
Route::get('/check', CheckTicketController::class)->middleware('throttle:ticket-check')->name('tickets.check');
Route::post('/check/{ticketNumber}/reply', [CheckTicketController::class, 'reply'])->middleware('throttle:ticket-reply')->name('tickets.check.reply')->where('ticketNumber', '.*');
Route::post('/check/{ticketNumber}/complete', [CheckTicketController::class, 'complete'])->middleware('throttle:ticket-reply')->name('tickets.check.complete')->where('ticketNumber', '.*');
Route::get('/check/lampiran/{type}/{id}', CheckAttachmentDownloadController::class)->middleware(['signed', 'throttle:30,1'])->whereIn('type', ['ticket', 'response'])->whereNumber('id')->name('check.attachments.download');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/dashboard/admin' : '/dashboard/operator');
    })->name('dashboard');

    Route::middleware('role:admin')->prefix('dashboard/admin')->name('dashboard.admin.')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('input-data/{ticketNumber}', [InputDataController::class, 'show'])->name('input-data.show')->where('ticketNumber', '.*');
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::put('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'update'])->name('laporan-masuk.update')->where('ticketNumber', '.*');
        Route::delete('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'destroy'])->name('laporan-masuk.destroy')->where('ticketNumber', '.*');
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])
            ->middleware('throttle:ticket-response')
            ->name('laporan-masuk.responses.store');
        Route::post('laporan-masuk/{ticket}/responses/{response}/resend', [TicketResponseController::class, 'resend'])
            ->name('laporan-masuk.responses.resend');
        Route::patch('laporan-masuk/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('laporan-masuk.pengawasan')->where('ticketNumber', '.*');
        Route::patch('laporan-masuk/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('laporan-masuk.tandai')->where('ticketNumber', '.*');
        Route::patch('laporan-selesai/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('laporan-selesai.tandai')->where('ticketNumber', '.*');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('operator', [OperatorController::class, 'index'])->name('operator.index');
        Route::post('operator', [OperatorController::class, 'store'])->name('operator.store');
        Route::put('operator/{operator}', [OperatorController::class, 'update'])->name('operator.update');
        Route::delete('operator/{operator}', [OperatorController::class, 'destroy'])->name('operator.destroy');
        Route::post('operator/{operator}/force-logout', [OperatorController::class, 'forceLogout'])->name('operator.force-logout');
    });

    Route::middleware('role:operator,operator_tim')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::get('/', OperatorDashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('input-data/{ticketNumber}', [InputDataController::class, 'show'])->name('input-data.show')->where('ticketNumber', '.*');
    });

    Route::middleware('role:operator')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::put('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'update'])->name('laporan-masuk.update')->where('ticketNumber', '.*');
        Route::delete('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'destroy'])->name('laporan-masuk.destroy')->where('ticketNumber', '.*');
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])
            ->middleware('throttle:ticket-response')
            ->name('laporan-masuk.responses.store');
        Route::patch('laporan-masuk/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('laporan-masuk.pengawasan')->where('ticketNumber', '.*');
        Route::patch('laporan-masuk/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('laporan-masuk.tandai')->where('ticketNumber', '.*');
        Route::patch('laporan-selesai/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('laporan-selesai.tandai')->where('ticketNumber', '.*');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-bulanan/print', [RekapBulananController::class, 'print'])->name('rekap-bulanan.print');
        Route::get('rekap-bulanan/excel', [RekapBulananController::class, 'excel'])->name('rekap-bulanan.excel');
        Route::get('rekap-periodik', RekapPeriodikController::class)->name('rekap-periodik.index');
        Route::get('rekap-periodik/print', [RekapPeriodikController::class, 'print'])->name('rekap-periodik.print');
        Route::get('rekap-periodik/excel', [RekapPeriodikController::class, 'excel'])->name('rekap-periodik.excel');
        Route::permanentRedirect('rekap-semesteran', '/dashboard/operator/rekap-periodik');
        Route::permanentRedirect('rekap-tahunan', '/dashboard/operator/rekap-periodik');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
