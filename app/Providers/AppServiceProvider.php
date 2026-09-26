<?php

namespace App\Providers;

use App\Models\Channel;
use App\Models\Ticket;
use App\Support\RekapCache;
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
        // Rekap di-cache per periode. Rotasi token saat tiket/kanal berubah
        // supaya halaman rekap otomatis menghitung ulang pada request berikutnya.
        Ticket::saved(fn () => RekapCache::invalidate());
        Ticket::deleted(fn () => RekapCache::invalidate());

        Channel::saved(fn () => RekapCache::invalidate());
        Channel::deleted(fn () => RekapCache::invalidate());
    }
}
