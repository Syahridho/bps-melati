<?php

use App\Http\Controllers\Admin\TicketFlagController;
use App\Http\Controllers\Admin\TicketPengawasanController;
use App\Http\Controllers\Admin\TicketResponseController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\CheckAttachmentDownloadController;
use App\Http\Controllers\CheckTicketController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Dashboard\InputDataController;
use App\Http\Controllers\Dashboard\IncomingReportsController;
use App\Http\Controllers\Dashboard\CompletedReportsController;
use App\Http\Controllers\Dashboard\OperatorController;
use App\Http\Controllers\Dashboard\Recap\MonthlyRecapController;
use App\Http\Controllers\Dashboard\Recap\PeriodicRecapController;
use App\Http\Controllers\PushSubscriptionController;
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

    // Notifikasi (database + Reverb broadcast) untuk dashboard — JSON, bukan Inertia.
    // Operator Tim tidak diizinkan mengakses endpoint notifikasi lonceng.
    Route::middleware('role:admin,operator')->prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread.count');
        Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('read');
        Route::patch('/{id}/unread', [NotificationController::class, 'markAsUnread'])->name('unread');
        Route::patch('/read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
    });

    // Push subscription (Web Push / VAPID) — JSON, bukan Inertia.
    Route::prefix('push-subscriptions')->name('push-subscriptions.')->group(function () {
        Route::post('/', [PushSubscriptionController::class, 'store'])->name('store');
        Route::delete('/', [PushSubscriptionController::class, 'destroy'])->name('destroy');
        Route::get('/status', [PushSubscriptionController::class, 'status'])->name('status');
    });

    // Push subscribe/unsubscribe per-device (Web Push / VAPID) — JSON, bukan Inertia.
    Route::prefix('push')->name('push.')->group(function () {
        Route::post('/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
    });

    // Push subscribe/unsubscribe per-device (Web Push / VAPID) — JSON, bukan Inertia.
    Route::prefix('push')->name('push.')->group(function () {
        Route::post('/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
    });

    // Push subscribe/unsubscribe per-device (Web Push / VAPID) — JSON, bukan Inertia.
    Route::prefix('push')->name('push.')->group(function () {
        Route::post('/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
    });

    // Push subscribe/unsubscribe per-device (Web Push / VAPID) — JSON, bukan Inertia.
    Route::prefix('push')->name('push.')->group(function () {
        Route::post('/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
    });

    Route::middleware('role:admin')->prefix('dashboard/admin')->name('dashboard.admin.')->group(function () {
        Route::get('/', DashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('input-data/{ticketNumber}', [InputDataController::class, 'show'])->name('input-data.show')->where('ticketNumber', '.*');
        Route::put('input-data/{ticketNumber}', [InputDataController::class, 'update'])->name('input-data.update')->where('ticketNumber', '.*');
        Route::delete('input-data/{ticketNumber}', [InputDataController::class, 'destroy'])->name('input-data.destroy')->where('ticketNumber', '.*');
        Route::patch('input-data/{ticketNumber}/tandai', [InputDataController::class, 'tandai'])->middleware('throttle:60,1')->name('input-data.tandai')->where('ticketNumber', '.*');
        Route::patch('input-data/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('input-data.pengawasan')->where('ticketNumber', '.*');
        Route::get('incoming-reports', [IncomingReportsController::class, 'index'])->name('incoming-reports.index');
        Route::get('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'show'])->name('incoming-reports.show')->where('ticketNumber', '.*');
        Route::put('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'update'])->name('incoming-reports.update')->where('ticketNumber', '.*');
        Route::delete('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'destroy'])->name('incoming-reports.destroy')->where('ticketNumber', '.*');
        Route::post('incoming-reports/{ticket}/responses', [TicketResponseController::class, 'store'])
            ->middleware('throttle:ticket-response')
            ->name('incoming-reports.responses.store');
        Route::post('incoming-reports/{ticket}/responses/{response}/resend', [TicketResponseController::class, 'resend'])
            ->name('incoming-reports.responses.resend');
        Route::patch('incoming-reports/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('incoming-reports.pengawasan')->where('ticketNumber', '.*');
        Route::patch('incoming-reports/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('incoming-reports.tandai')->where('ticketNumber', '.*');
        Route::patch('completed-reports/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('completed-reports.tandai')->where('ticketNumber', '.*');
        Route::get('completed-reports', [CompletedReportsController::class, 'index'])->name('completed-reports.index');
        Route::get('completed-reports/{ticketNumber}', [CompletedReportsController::class, 'show'])->name('completed-reports.show')->where('ticketNumber', '.*');
        Route::get('monthly-recap', MonthlyRecapController::class)->name('monthly-recap.index');
        Route::get('monthly-recap/print', [MonthlyRecapController::class, 'print'])->name('monthly-recap.print');
        Route::get('monthly-recap/excel', [MonthlyRecapController::class, 'excel'])->name('monthly-recap.excel');
        Route::get('periodic-recap', PeriodicRecapController::class)->name('periodic-recap.index');
        Route::get('periodic-recap/print', [PeriodicRecapController::class, 'print'])->name('periodic-recap.print');
        Route::get('periodic-recap/excel', [PeriodicRecapController::class, 'excel'])->name('periodic-recap.excel');
        Route::permanentRedirect('rekap-semesteran', '/dashboard/admin/periodic-recap');
        Route::permanentRedirect('rekap-tahunan', '/dashboard/admin/periodic-recap');
        Route::get('operator-management', [OperatorController::class, 'index'])->name('operator.index');
        Route::post('operator-management', [OperatorController::class, 'store'])->name('operator.store');
        Route::put('operator-management/{operator}', [OperatorController::class, 'update'])->name('operator.update');
        Route::delete('operator-management/{operator}', [OperatorController::class, 'destroy'])->name('operator.destroy');
        Route::post('operator-management/{operator}/force-logout', [OperatorController::class, 'forceLogout'])->name('operator.force-logout');
    });

    Route::middleware('role:operator,operator_tim')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::get('/', DashboardController::class)->name('index');
        Route::get('input-data', [InputDataController::class, 'index'])->name('input-data.index');
        Route::post('input-data', [InputDataController::class, 'store'])->name('input-data.store');
        Route::get('input-data/{ticketNumber}', [InputDataController::class, 'show'])->name('input-data.show')->where('ticketNumber', '.*');
        Route::put('input-data/{ticketNumber}', [InputDataController::class, 'update'])->name('input-data.update')->where('ticketNumber', '.*');
        Route::delete('input-data/{ticketNumber}', [InputDataController::class, 'destroy'])->name('input-data.destroy')->where('ticketNumber', '.*');
        Route::patch('input-data/{ticketNumber}/tandai', [InputDataController::class, 'tandai'])->middleware('throttle:60,1')->name('input-data.tandai')->where('ticketNumber', '.*');
    });

    Route::middleware('role:operator')->prefix('dashboard/operator')->name('dashboard.operator.')->group(function () {
        Route::patch('input-data/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('input-data.pengawasan')->where('ticketNumber', '.*');
        Route::get('incoming-reports', [IncomingReportsController::class, 'index'])->name('incoming-reports.index');
        Route::get('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'show'])->name('incoming-reports.show')->where('ticketNumber', '.*');
        Route::put('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'update'])->name('incoming-reports.update')->where('ticketNumber', '.*');
        Route::delete('incoming-reports/{ticketNumber}', [IncomingReportsController::class, 'destroy'])->name('incoming-reports.destroy')->where('ticketNumber', '.*');
        Route::post('incoming-reports/{ticket}/responses', [TicketResponseController::class, 'store'])
            ->middleware('throttle:ticket-response')
            ->name('incoming-reports.responses.store');
        Route::patch('incoming-reports/{ticketNumber}/pengawasan', [TicketPengawasanController::class, 'update'])->name('incoming-reports.pengawasan')->where('ticketNumber', '.*');
        Route::patch('incoming-reports/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('incoming-reports.tandai')->where('ticketNumber', '.*');
        Route::patch('completed-reports/{ticketNumber}/tandai', [TicketFlagController::class, 'update'])->middleware('throttle:60,1')->name('completed-reports.tandai')->where('ticketNumber', '.*');
        Route::get('completed-reports', [CompletedReportsController::class, 'index'])->name('completed-reports.index');
        Route::get('completed-reports/{ticketNumber}', [CompletedReportsController::class, 'show'])->name('completed-reports.show')->where('ticketNumber', '.*');
        Route::get('monthly-recap', MonthlyRecapController::class)->name('monthly-recap.index');
        Route::get('monthly-recap/print', [MonthlyRecapController::class, 'print'])->name('monthly-recap.print');
        Route::get('monthly-recap/excel', [MonthlyRecapController::class, 'excel'])->name('monthly-recap.excel');
        Route::get('periodic-recap', PeriodicRecapController::class)->name('periodic-recap.index');
        Route::get('periodic-recap/print', [PeriodicRecapController::class, 'print'])->name('periodic-recap.print');
        Route::get('periodic-recap/excel', [PeriodicRecapController::class, 'excel'])->name('periodic-recap.excel');
        Route::permanentRedirect('rekap-semesteran', '/dashboard/operator/periodic-recap');
        Route::permanentRedirect('rekap-tahunan', '/dashboard/operator/periodic-recap');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
