<?php

use App\Http\Controllers\Api\TicketApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware(['api.key', 'throttle:30,1'])->group(function () {
    Route::post('/tickets', [TicketApiController::class, 'store']);
    Route::get('/check', [TicketApiController::class, 'check']);
    Route::get('/check/{ticketNumber}', [TicketApiController::class, 'check'])->where('ticketNumber', '.*');
    Route::post('/check/{ticketNumber}/reply', [TicketApiController::class, 'reply'])->where('ticketNumber', '.*');
    Route::post('/check/{ticketNumber}/complete', [TicketApiController::class, 'complete'])->where('ticketNumber', '.*');
});
