<?php

use App\Http\Controllers\Api\TicketApiController;
use App\Http\Controllers\Auth\TokenApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Login untuk klien non-browser (Flutter/Android).
// Kebijakan: satu token aktif per akun per jenis klien — token web dan token
// mobile tidak saling meniadakan; login mobile baru mencabut token mobile lama.
Route::post('/auth/token', [TokenApiController::class, 'store'])->middleware('throttle:10,1');
Route::delete('/auth/token', [TokenApiController::class, 'destroy'])->middleware('auth:sanctum');

Route::middleware(['api.key'])->group(function () {
    Route::post('/tickets', [TicketApiController::class, 'store'])->middleware('throttle:ticket-store');
    Route::get('/check', [TicketApiController::class, 'check'])->middleware('throttle:ticket-check');
    Route::get('/check/{ticketNumber}', [TicketApiController::class, 'check'])->middleware('throttle:ticket-check')->where('ticketNumber', '.*');
    Route::post('/check/{ticketNumber}/reply', [TicketApiController::class, 'reply'])->middleware('throttle:ticket-reply')->where('ticketNumber', '.*');
    Route::post('/check/{ticketNumber}/complete', [TicketApiController::class, 'complete'])->middleware('throttle:ticket-reply')->where('ticketNumber', '.*');
});
