<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('tickets:auto-close')->hourly();

// Jaring pengaman untuk sesi yang ditinggalkan browser tanpa logout.
Schedule::command('sessions:cleanup')->everyMinute()->withoutOverlapping();

// Audit log autentikasi dipangkas sesuai retensi config.
Schedule::command('auth:prune-logs')->dailyAt('02:15');
