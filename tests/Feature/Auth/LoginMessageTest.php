<?php

use App\Models\User;
use App\Support\AuthLogger;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    RateLimiter::clear('login|budi@bps.go.id|127.0.0.1');
    RateLimiter::clear('login-ip|127.0.0.1');
    $this->user = User::factory()->operator()->create([
        'email' => 'budi@bps.go.id',
        'password' => 'rahasia123',
        'is_active' => true,
    ]);
});

/*
|--------------------------------------------------------------------------
| Anti user enumeration
|--------------------------------------------------------------------------
*/

test('email tidak terdaftar dan password salah memberi pesan yang sama persis', function () {
    $unknown = $this->post('/login', [
        'email' => 'tidak-ada@bps.go.id',
        'password' => 'apapun123',
    ]);

    $wrongPassword = $this->post('/login', [
        'email' => 'budi@bps.go.id',
        'password' => 'salahbanget',
    ]);

    $expected = __('auth.failed');

    expect($expected)->toBe('Email atau password salah.');

    // Array asosiatif = pencocokan persis, bukan sekadar "key ada".
    $unknown->assertSessionHasErrors(['email' => $expected]);
    $wrongPassword->assertSessionHasErrors(['email' => $expected]);
});

test('pesan generik tidak membocorkan keberadaan akun dan status login tetap 302', function () {
    $this->post('/login', ['email' => 'tidak-ada@bps.go.id', 'password' => 'apapun123'])
        ->assertRedirect()
        ->assertSessionMissing('password');

    $this->assertGuest();
});

/*
|--------------------------------------------------------------------------
| Pesan validasi Bahasa Indonesia
|--------------------------------------------------------------------------
*/

test('email kosong wajib diisi', function () {
    $this->post('/login', ['email' => '', 'password' => 'apapun123'])
        ->assertSessionHasErrors(['email' => 'Email wajib diisi.']);
});

test('format email salah ditolak dengan pesan Indonesia', function () {
    $this->post('/login', ['email' => 'bukan-email', 'password' => 'apapun123'])
        ->assertSessionHasErrors(['email' => 'Format email tidak valid.']);
});

test('password kosong wajib diisi', function () {
    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => ''])
        ->assertSessionHasErrors(['password' => 'Password wajib diisi.']);
});

/*
|--------------------------------------------------------------------------
| Rate limit
|--------------------------------------------------------------------------
*/

test('percobaan ke-6 mendapat pesan throttle lengkap dengan hitung mundur', function () {
    Event::fake([Lockout::class]);

    // Lima percobaan gagal mengisi limiter (maks 5 per menit).
    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah']);
    }

    $response = $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah']);

    $response->assertSessionHas('errors');

    $message = session('errors')->getBag('default')->first('email');

    expect($message)->toContain('Terlalu banyak percobaan login.');
    expect($message)->toMatch('/Coba lagi dalam \d+ detik\./');
    expect(session('throttle_seconds'))->toBeInt()->toBeGreaterThan(0);

    Event::assertDispatched(Lockout::class);
});

test('limiter direset setelah login berhasil', function () {
    for ($i = 0; $i < 4; $i++) {
        $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah']);
    }

    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'rahasia123'])
        ->assertRedirect();

    expect(RateLimiter::attempts('login|budi@bps.go.id|127.0.0.1'))->toBe(0);
});

/*
|--------------------------------------------------------------------------
| Akun nonaktif
|--------------------------------------------------------------------------
*/

test('akun nonaktif dengan password benar ditolak dengan pesan khusus', function () {
    $this->user->update(['is_active' => false]);

    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'rahasia123'])
        ->assertSessionHasErrors(['email' => 'Akun Anda dinonaktifkan. Hubungi administrator.']);

    $this->assertGuest();
});

test('akun nonaktif dengan password salah tetap dapat pesan generik', function () {
    $this->user->update(['is_active' => false]);

    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah'])
        ->assertSessionHasErrors(['email' => __('auth.failed')]);
});

test('pesan akun sedang digunakan tidak muncul bila password salah', function () {
    $this->user->update([
        'current_session_id' => 'sesi-orang-lain',
        'last_activity_at' => now(),
    ]);

    $response = $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah']);

    $response->assertSessionHasErrors(['email' => __('auth.failed')]);
    $response->assertSessionMissing('session_conflict');
});

/*
|--------------------------------------------------------------------------
| Audit log
|--------------------------------------------------------------------------
*/

test('seluruh aksi autentikasi tercatat tanpa menyimpan password', function () {
    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'rahasia123'])->assertRedirect();

    $this->assertDatabaseHas('auth_logs', [
        'event' => 'login_success',
        'user_id' => $this->user->id,
        'context' => 'web',
    ]);

    $log = $this->user->authLogs()->latest()->first();

    expect($log->email_hash)->toBe(AuthLogger::hashEmail('budi@bps.go.id'));
    expect($log->email_hash)->toBe(hash_hmac('sha256', 'budi@bps.go.id', (string) config('app.key')));
    expect($log->email_masked)->toBe('b***@bps.go.id');
    expect(json_encode($log->getAttributes()))->not->toContain('rahasia123');
});

test('percobaan login gagal tercatat pada audit log', function () {
    $this->post('/login', ['email' => 'budi@bps.go.id', 'password' => 'salah'])->assertRedirect();

    $this->assertDatabaseHas('auth_logs', [
        'event' => 'login_failed',
        'context' => 'web',
    ]);
});
