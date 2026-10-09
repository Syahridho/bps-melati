<?php

namespace App\Providers;

use App\Models\Channel;
use App\Models\Ticket;
use App\Support\RekapCache;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('ticket-store', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('ticket-check', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('ticket-reply', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Rekap di-cache per periode. Rotasi token saat tiket/kanal berubah
        // supaya halaman rekap otomatis menghitung ulang pada request berikutnya.
        Ticket::saved(function (Ticket $ticket) {
            RekapCache::invalidate();
            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget('dashboard:admin:stats');
            Cache::forget('dashboard:operator:stats');
        });

        Ticket::deleted(function (Ticket $ticket) {
            RekapCache::invalidate();
            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget('dashboard:admin:stats');
            Cache::forget('dashboard:operator:stats');
        });

        Channel::saved(fn () => RekapCache::invalidate());
        Channel::deleted(fn () => RekapCache::invalidate());
    }
}
