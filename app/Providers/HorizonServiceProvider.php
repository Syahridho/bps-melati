<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // Horizon::routeMailNotificationsTo('admin@example.com');
    }

    /**
     * Register the Horizon gate.
     *
     * Hanya user dengan role admin yang boleh mengakses dashboard Horizon.
     * Di environment local, gate ini di-bypass oleh Horizon secara otomatis.
     */
    protected function gate(): void
    {
        Gate::define('viewHorizon', function ($user) {
            return $user->isAdmin();
        });
    }
}
