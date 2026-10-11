<?php

use App\Models\AuthLog;
use App\Models\User;
use App\Support\AuthLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
|
| AuthLogger menulis lewat dispatch()->afterResponse(), yang dijalankan saat
| aplikasi "terminate". Request HTTP melalui test client sudah memicu
| terminate; pemanggilan langsung tidak, jadi perlu flush manual.
|
*/

function flushAuditLog(): void
{
    app()->terminate();
}

function auditBrowserLogin(User $user): void
{
    $response = test()->post('/login', ['email' => $user->email, 'password' => 'rahasia123']);
    $cookie = $response->getCookie((string) config('session.cookie'));

    test()->withCookie((string) config('session.cookie'), $cookie?->getValue() ?? Str::random(40));
    Auth::forgetGuards();
}

function auditSwitchBrowser(): void
{
    test()->flushSession();
    test()->withCookie((string) config('session.cookie'), Str::random(40));
    Auth::forgetGuards();
}

/** Paksa seluruh penulisan AuthLog meledak. */
function breakAuditLogWriting(): void
{
    AuthLog::creating(function (): never {
        throw new RuntimeException('tabel auth_logs tidak tersedia');
    });
}

beforeEach(function () {
    $this->user = User::factory()->operator()->create([
        'email' => 'siti@bps.go.id',
        'password' => 'rahasia123',
        'is_active' => true,
    ]);
});

/*
|--------------------------------------------------------------------------
| Skema: setiap kolom yang ditulis AuthLogger harus ada
|--------------------------------------------------------------------------
*/

test('semua kolom yang ditulis AuthLogger ada di tabel auth_logs', function () {
    expect(Schema::hasTable('auth_logs'))->toBeTrue();

    expect(Schema::hasColumns('auth_logs', [
        'user_id',
        'event',
        'email_hash',
        'email_masked',
        'ip_address',
        'user_agent',
        'context',
        'meta',
        'created_at',
        'updated_at',
    ]))->toBeTrue();

    // Panjang kolom harus cukup untuk nilai yang kita tulis.
    $columns = collect(Schema::getColumns('auth_logs'))->keyBy('name');

    expect($columns['event']['type_name'])->toBe('varchar');
    expect($columns['event']['type'])->toBe('varchar(40)');
    // HMAC-SHA256 hex = 64 karakter, pas di varchar(64).
    expect($columns['email_hash']['type'])->toBe('varchar(64)');
    expect($columns['context']['type_name'])->toBe('varchar');
});

test('kolom meta bertipe json dan kolom context tetap varchar', function () {
    expect(Schema::getColumnType('auth_logs', 'meta'))->toBe('json');
    // context = asal request ('web' / 'api'), bukan data tambahan.
    expect(Schema::getColumnType('auth_logs', 'context'))->toBe('varchar');
});

test('index auth_logs untuk pencarian tersedia', function () {
    expect(Schema::hasIndex('auth_logs', 'auth_logs_event_created_at_index'))->toBeTrue();
    expect(Schema::hasIndex('auth_logs', 'auth_logs_user_id_created_at_index'))->toBeTrue();
});

/*
|--------------------------------------------------------------------------
| Meta terisi
|--------------------------------------------------------------------------
*/

test('penulisan audit log mengisi meta sebagai array', function () {
    AuthLogger::record(AuthLogger::LOGIN_SUCCESS, request(), $this->user, 'SITI@bps.go.id', 'web', [
        'took_over' => false,
        'reason' => 'test',
    ]);

    flushAuditLog();

    $log = AuthLog::query()->forEvent(AuthLogger::LOGIN_SUCCESS)->latest()->first();

    expect($log)->not->toBeNull();
    expect($log->meta)->toBeArray();
    expect($log->meta)->toHaveKey('took_over', false);
    expect($log->meta)->toHaveKey('reason', 'test');
    expect($log->context)->toBe('web');
});

test('meta null bila tidak ada detail tambahan', function () {
    AuthLogger::record(AuthLogger::LOGOUT, request(), $this->user, null, 'web');

    flushAuditLog();

    expect(AuthLog::query()->forEvent(AuthLogger::LOGOUT)->latest()->first()->meta)->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Alur single session + audit log
|--------------------------------------------------------------------------
*/

test('login diblokir mengembalikan account_in_use dan mencatat satu baris blocked_active_session', function () {
    auditBrowserLogin($this->user);

    $this->user->forceFill([
        'last_activity_at' => now(),
        'last_login_ip' => '203.0.113.9',
        'last_login_agent' => 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    ])->save();

    auditSwitchBrowser();

    $response = $this->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123']);

    $response->assertStatus(409)
        ->assertJsonPath('code', 'account_in_use')
        ->assertJsonPath('message', 'Akun ini sedang digunakan di perangkat lain.');

    // Tepat satu baris, dengan meta terisi.
    $logs = AuthLog::query()->forEvent(AuthLogger::BLOCKED_ACTIVE_SESSION)->get();
    expect($logs)->toHaveCount(1);

    $log = $logs->first();
    expect($log->user_id)->toBe($this->user->id);
    expect($log->meta)->toBeArray();
    expect($log->meta['device'])->toBe('Chrome di Windows');
    expect($log->meta)->toHaveKey('last_active');
    expect($log->meta)->toHaveKey('last_active_at');
    expect($log->meta['ip_masked'])->toBe('203.0.xx.xx');

    // IP mentah tidak pernah masuk ke meta.
    expect($log->meta['ip_masked'])->not->toBe('203.0.113.9');
});

test('password salah pada akun yang sedang online tetap pesan generik', function () {
    auditBrowserLogin($this->user);

    auditSwitchBrowser();

    $response = $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'salah-sekali']);

    $response->assertSessionHasErrors(['email' => 'Email atau password salah.']);
    $response->assertSessionMissing('session_conflict');

    expect(AuthLog::query()->forEvent(AuthLogger::BLOCKED_ACTIVE_SESSION)->count())->toBe(0);
    expect(AuthLog::query()->forEvent(AuthLogger::LOGIN_FAILED)->count())->toBe(1);
});

test('seluruh event autentikasi tercatat', function () {
    $admin = User::factory()->admin()->create(['password' => 'rahasia123']);

    // login_success
    auditBrowserLogin($this->user);
    expect(AuthLog::query()->forEvent(AuthLogger::LOGIN_SUCCESS)->count())->toBe(1);

    // logout
    $this->post('/logout');
    expect(AuthLog::query()->forEvent(AuthLogger::LOGOUT)->count())->toBe(1);

    // login_failed
    $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'salah']);
    expect(AuthLog::query()->forEvent(AuthLogger::LOGIN_FAILED)->count())->toBe(1);

    // locked_out (5 percobaan gagal mengisi limiter maks 5)
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'salah']);
    }
    expect(AuthLog::query()->forEvent(AuthLogger::LOCKED_OUT)->count())->toBeGreaterThanOrEqual(1);

    // force_login (takeover)
    RateLimiter::clear('login|siti@bps.go.id|127.0.0.1');
    auditBrowserLogin($this->user);
    $this->user->forceFill(['last_activity_at' => now()])->save();
    auditSwitchBrowser();
    $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123', 'force' => true])->assertRedirect();
    expect(AuthLog::query()->forEvent(AuthLogger::FORCE_LOGIN)->count())->toBe(1);

    // forced_logout (admin)
    $this->user->forceFill(['current_session_id' => 'sesi-aktif', 'last_activity_at' => now()])->save();
    $this->actingAs($admin)
        ->post(route('dashboard.admin.operator.force-logout', $this->user))
        ->assertRedirect();
    expect(AuthLog::query()->forEvent(AuthLogger::FORCED_LOGOUT)->count())->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Ketahanan: audit log tidak boleh menggagalkan login
|--------------------------------------------------------------------------
*/

test('penulisan audit log yang gagal tidak mengubah respons login yang berhasil', function () {
    breakAuditLogWriting();

    $response = $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123']);

    $response->assertRedirect(route('dashboard.operator.index', absolute: false));
    $response->assertSessionHasNoErrors();
    $this->assertAuthenticated();

    expect(AuthLog::count())->toBe(0);
});

test('penulisan audit log yang gagal tidak mengubah 409 menjadi 500', function () {
    auditBrowserLogin($this->user);
    $this->user->forceFill([
        'last_activity_at' => now(),
        'last_login_ip' => '203.0.113.9',
        'last_login_agent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
    ])->save();

    // Paksa penulisan audit log meledak — hanya untuk request kedua.
    auditSwitchBrowser();
    breakAuditLogWriting();

    $response = $this->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123']);

    $response->assertStatus(409)
        ->assertJsonPath('code', 'account_in_use')
        ->assertJsonPath('data.ip', '203.0.xx.xx');
});

test('penulisan audit log yang gagal tidak mengubah 422 menjadi 500', function () {
    breakAuditLogWriting();

    $this->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'salah'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'invalid_credentials');
});

/*
|--------------------------------------------------------------------------
| Hash email: HMAC, stabil, dan tidak menyimpan email mentah
|--------------------------------------------------------------------------
*/

test('email dengan kapitalisasi berbeda menghasilkan hash yang sama', function () {
    expect(AuthLogger::hashEmail('Siti@BPS.go.id'))->toBe(AuthLogger::hashEmail('siti@bps.go.id'));
    expect(AuthLogger::hashEmail('  SITI@BPS.GO.ID '))->toBe(AuthLogger::hashEmail('siti@bps.go.id'));
});

test('email berbeda menghasilkan hash berbeda dan email mentah tidak tersimpan', function () {
    $this->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])->assertRedirect();

    $log = AuthLog::query()->latest()->first();

    expect($log->email_hash)->toBe(AuthLogger::hashEmail('siti@bps.go.id'));
    expect($log->email_hash)->not->toBe(AuthLogger::hashEmail('lain@bps.go.id'));
    expect(strlen((string) $log->email_hash))->toBe(64);

    $row = json_encode($log->getAttributes());
    expect($row)->not->toContain('siti@bps.go.id');
    expect($row)->not->toContain('rahasia123');

    // Yang tersimpan hanya bentuk tersamar.
    expect($row)->toContain('s***@bps.go.id');
});

test('hash email memakai HMAC dengan APP_KEY sehingga tidak bisa dibalik', function () {
    $expected = hash_hmac('sha256', 'siti@bps.go.id', (string) config('app.key'));

    expect(AuthLogger::hashEmail('siti@bps.go.id'))->toBe($expected);
    expect($expected)->not->toBe(hash('sha256', 'siti@bps.go.id'));
});
