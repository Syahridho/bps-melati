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
use App\Models\Ticket;
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

    // Statistik publik: total seluruh waktu, key ikut versi supaya otomatis segar saat ada tiket berubah
    $stats = Cache::remember(
        'welcome:stats:v'.Cache::get('dashboard:admin:version', 0),
        now()->addMinutes(10),
        function () {
            $summary = Ticket::query()
                ->selectRaw("
                    COUNT(*) as total,
                    SUM(classification = 'pengaduan') as pengaduan,
                    SUM(classification = 'aspirasi') as aspirasi,
                    SUM(classification = 'permintaan_informasi') as permintaan_informasi
                ")
                ->first();

            // Sub-kanal digabung ke kanal induknya
            $channelCounts = Ticket::query()
                ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
                ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
                ->selectRaw('COALESCE(p.slug, c.slug) as root_slug, COUNT(*) as total')
                ->groupBy('root_slug')
                ->pluck('total', 'root_slug');

            return [
                'total' => (int) $summary->total,
                'pengaduan' => (int) $summary->pengaduan,
                'aspirasi' => (int) $summary->aspirasi,
                'permintaan_informasi' => (int) $summary->permintaan_informasi,
                'span_lapor' => (int) ($channelCounts['sp4n-lapor'] ?? 0),
                'sosial_media' => (int) ($channelCounts['sosial-media'] ?? 0),
                'kunjungan_langsung' => (int) ($channelCounts['kunjungan-langsung'] ?? 0),
                'wbs' => (int) ($channelCounts['wbs'] ?? 0),
                'email' => (int) ($channelCounts['email'] ?? 0),
            ];
        },
    );

    return Inertia::render('welcome', [
        'channels' => $channels,
        'stats' => $stats,
    ]);
})->name('home');

Route::post('/tickets', [TicketController::class, 'store'])->name('tickets.store');
Route::get('/check', CheckTicketController::class)->name('tickets.check');
Route::post('/check/{ticketNumber}/reply', [CheckTicketController::class, 'reply'])->name('tickets.check.reply')->where('ticketNumber', '.*');
Route::post('/check/{ticketNumber}/complete', [CheckTicketController::class, 'complete'])->name('tickets.check.complete')->where('ticketNumber', '.*');

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
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])->name('laporan-masuk.responses.store');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-bulanan/print', [RekapBulananController::class, 'print'])->name('rekap-bulanan.print');
        Route::get('rekap-bulanan/excel', [RekapBulananController::class, 'excel'])->name('rekap-bulanan.excel');
        Route::get('rekap-semesteran', RekapSemesteranController::class)->name('rekap-semesteran.index');
        Route::get('rekap-semesteran/print', [RekapSemesteranController::class, 'print'])->name('rekap-semesteran.print');
        Route::get('rekap-semesteran/excel', [RekapSemesteranController::class, 'excel'])->name('rekap-semesteran.excel');
        Route::get('rekap-tahunan', RekapTahunanController::class)->name('rekap-tahunan.index');
        Route::get('rekap-tahunan/print', [RekapTahunanController::class, 'print'])->name('rekap-tahunan.print');
        Route::get('rekap-tahunan/excel', [RekapTahunanController::class, 'excel'])->name('rekap-tahunan.excel');
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
        Route::get('input-data/{ticketNumber}', [InputDataController::class, 'show'])->name('input-data.show')->where('ticketNumber', '.*');
        Route::get('laporan-masuk', [LaporanMasukController::class, 'index'])->name('laporan-masuk.index');
        Route::get('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'show'])->name('laporan-masuk.show')->where('ticketNumber', '.*');
        Route::put('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'update'])->name('laporan-masuk.update')->where('ticketNumber', '.*');
        Route::delete('laporan-masuk/{ticketNumber}', [LaporanMasukController::class, 'destroy'])->name('laporan-masuk.destroy')->where('ticketNumber', '.*');
        Route::post('laporan-masuk/{ticket}/responses', [TicketResponseController::class, 'store'])->name('laporan-masuk.responses.store');
        Route::get('laporan-selesai', [LaporanSelesaiController::class, 'index'])->name('laporan-selesai.index');
        Route::get('laporan-selesai/{ticketNumber}', [LaporanSelesaiController::class, 'show'])->name('laporan-selesai.show')->where('ticketNumber', '.*');
        Route::get('rekap-bulanan', RekapBulananController::class)->name('rekap-bulanan.index');
        Route::get('rekap-bulanan/print', [RekapBulananController::class, 'print'])->name('rekap-bulanan.print');
        Route::get('rekap-bulanan/excel', [RekapBulananController::class, 'excel'])->name('rekap-bulanan.excel');
        Route::get('rekap-semesteran', RekapSemesteranController::class)->name('rekap-semesteran.index');
        Route::get('rekap-semesteran/print', [RekapSemesteranController::class, 'print'])->name('rekap-semesteran.print');
        Route::get('rekap-semesteran/excel', [RekapSemesteranController::class, 'excel'])->name('rekap-semesteran.excel');
        Route::get('rekap-tahunan', RekapTahunanController::class)->name('rekap-tahunan.index');
        Route::get('rekap-tahunan/print', [RekapTahunanController::class, 'print'])->name('rekap-tahunan.print');
        Route::get('rekap-tahunan/excel', [RekapTahunanController::class, 'excel'])->name('rekap-tahunan.excel');
        Route::get('pengaturan', [SettingController::class, 'index'])->name('pengaturan.index');
        Route::post('pengaturan', [SettingController::class, 'update'])->name('pengaturan.update');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
