<?php

namespace App\Providers;

use App\Models\CensoredWord;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Observers\ChannelObserver;
use App\Observers\TicketObserver;
use App\Policies\TicketPolicy;
use App\Support\LaporanCache;
use App\Support\ProfanityFilter;
use App\Support\RekapCache;
use App\Support\RekapYears;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ProfanityFilter::class, function ($app) {
            return new ProfanityFilter;
        });
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

        // Balasan petugas: dibatasi per akun, bukan per IP (banyak petugas sharing IP).
        RateLimiter::for('ticket-response', function (Request $request) {
            return Limit::perMinute(20)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        // Lapis kedua login: per IP saja, lebih longgar dari per email+IP.
        RateLimiter::for('login-ip', function (Request $request) {
            return Limit::perMinute(20)->by('login-ip|'.$request->ip());
        });

        Gate::policy(Ticket::class, TicketPolicy::class);

        Ticket::observe(TicketObserver::class);
        Channel::observe(ChannelObserver::class);

        // Rekap di-cache per periode. Rotasi token saat tiket/kanal berubah
        // supaya halaman rekap otomatis menghitung ulang pada request berikutnya.
        Ticket::saved(function (Ticket $ticket) {
            RekapYears::invalidate();
            app(\App\Services\TicketCacheInvalidator::class)->invalidateTicket($ticket);
        });

        Ticket::deleted(function (Ticket $ticket) {
            RekapYears::invalidate();
            app(\App\Services\TicketCacheInvalidator::class)->invalidateTicket($ticket);
        });

        Channel::saved(function () {
            RekapCache::invalidate();
            RekapYears::invalidate();
        });
        Channel::deleted(function () {
            RekapCache::invalidate();
            RekapYears::invalidate();
        });

        // Invalidate cache kata kasar saat daftar kata berubah supaya
        // ProfanityFilter segera mengambil daftar terbaru.
        CensoredWord::saved(function () {
            ProfanityFilter::clearCache();
        });
        CensoredWord::deleted(function () {
            ProfanityFilter::clearCache();
        });

        // Jaga konsistensi kolom sesi meski logout terjadi lewat jalan lain
        // (mis. session()->invalidate() di controller lain atau flush manual).
        Event::listen(Logout::class, function (Logout $event): void {
            $user = $event->user;

            if ($user instanceof User) {
                $user->forceFill([
                    'current_session_id' => null,
                    'last_activity_at' => null,
                ])->saveQuietly();
            }
        });

        // Custom: reset password email dalam bahasa Indonesia dengan identitas Melati.
        ResetPassword::toMailUsing(function (Authenticatable $notifiable, string $token): MailMessage {
            $resetUrl = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            return (new MailMessage)
                ->subject('Reset Password Akun Melati')
                ->greeting($notifiable->name ? 'Halo, '.$notifiable->name.'!' : 'Halo!')
                ->line('Kami menerima permintaan reset password untuk akun Anda.')
                ->action('Reset Password', $resetUrl)
                ->line('Link ini berlaku selama '.config('auth.passwords.'.config('auth.defaults.passwords').'.expire').' menit.')
                ->line('Jika Anda tidak merasa meminta reset password, abaikan email ini.')
                ->salutation('Salam, Tim Melati');
        });
    }
}
