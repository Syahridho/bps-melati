<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InputDataController;
use App\Http\Controllers\Admin\LaporanMasukController;
use App\Http\Controllers\Admin\LaporanSelesaiController;
use App\Http\Controllers\Admin\OperatorController;
use App\Http\Controllers\Admin\Rekap\RekapBulananController;
use App\Http\Controllers\Admin\Rekap\RekapSemesteranController;
use App\Http\Controllers\Admin\Rekap\RekapTahunanController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\TicketResponseController;
use App\Http\Controllers\CheckTicketController;
use App\Http\Controllers\Operator\DashboardController as OperatorDashboardController;
use App\Http\Controllers\TicketController;
use App\Models\Channel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $channels = Cache::remember('channels:tree', now()->addHours(24), function () {
        return Channel::with('children')
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($ch) => [
                'id' => $ch->id,
                'name' => $ch->name,
                'children' => $ch->children->where('is_active', true)->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ])->values()->all(),
            ])
            ->all();
    });

    return Inertia::render('welcome', [
        'channels' => $channels,
    ]);
})->name('home');

Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
Route::get('/check', CheckTicketController::class)->name('tickets.check');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        return redirect()->to($request->user()->isAdmin() ? '/dashboard/admin' : '/dashboard/operator');
    })->name('dashboard');

    Route::middleware('role:admin')->prefix('dashboard/admin')->name('dashboard.admin.')->group(function () {
        Route::get('/', AdminDashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])->name('laporan-masuk.responses.store');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-bulanan/print', [RekapBulananController::class, 'print'])->name('rekap-bulanan.print');
        Route::get('rekap-semesteran', RekapSemesteranController::class)->name('rekap-semesteran.index');
        Route::get('rekap-semesteran/print', [RekapSemesteranController::class, 'print'])->name('rekap-semesteran.print');
        Route::get('rekap-tahunan', RekapTahunanController::class)->name('rekap-tahunan.index');
        Route::get('rekap-tahunan/print', [RekapTahunanController::class, 'print'])->name('rekap-tahunan.print');
        Route::get('pengaturan', [SettingController::class, 'index'])->name('pengaturan.index');
        Route::post('pengaturan', [SettingController::class, 'update'])->name('pengaturan.update');
        Route::get('operator', [OperatorController::class, 'index'])->name('operator.index');
        Route::post('operator', [OperatorController::class, 'store'])->name('operator.store');
        Route::put('operator/{operator}', [OperatorController::class, 'update'])->name('operator.update');
        Route::delete('operator/{operator}', [OperatorController::class, 'destroy'])->name('operator.destroy');
    });

    Route::middleware('role:operator')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::get('/', OperatorDashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])->name('laporan-masuk.responses.store');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-bulanan/print', [RekapBulananController::class, 'print'])->name('rekap-bulanan.print');
        Route::get('rekap-semesteran', RekapSemesteranController::class)->name('rekap-semesteran.index');
        Route::get('rekap-semesteran/print', [RekapSemesteranController::class, 'print'])->name('rekap-semesteran.print');
        Route::get('rekap-tahunan', RekapTahunanController::class)->name('rekap-tahunan.index');
        Route::get('rekap-tahunan/print', [RekapTahunanController::class, 'print'])->name('rekap-tahunan.print');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
