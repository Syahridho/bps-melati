<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Menutup tiket yang dijawab petugas tapi tidak dijawab pelapor.
// onOneServer() aman karena CACHE_STORE memakai Redis.
Schedule::command('tickets:auto-close')
    ->everyFifteenMinutes()
    ->timezone('Asia/Jakarta')
    ->onOneServer()
    ->withoutOverlapping(10)
    ->onFailure(function (string $message): void {
        Log::error('Jadwal tickets:auto-close gagal dijalankan.', ['message' => $message]);
    });

// Jaring pengaman untuk sesi yang ditinggalkan browser tanpa logout.
Schedule::command('sessions:cleanup')->everyMinute()->withoutOverlapping();

// Audit log autentikasi dipangkas sesuai retensi config.
Schedule::command('auth:prune-logs')->dailyAt('02:15');
