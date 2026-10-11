<?php

use App\Events\LoginAttemptBlocked;
use App\Events\SessionTerminated;
use App\Models\User;
use App\Services\SessionTerminator;
use App\Support\AuthLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    Event::fake([SessionTerminated::class, LoginAttemptBlocked::class]);

    $this->user = User::factory()->operator()->create([
        'email' => 'siti@bps.go.id',
        'password' => 'rahasia123',
        'is_active' => true,
    ]);

    $this->admin = User::factory()->admin()->create(['password' => 'rahasia123']);
});

/*
|--------------------------------------------------------------------------
| Helper: menyimulasikan beberapa browser terpisah
|--------------------------------------------------------------------------
|
| Test HTTP Laravel tidak meneruskan cookie antar request secara otomatis,
| jadi setiap "browser" harus diberi cookie sesinya sendiri.
|
*/

/** Login lewat endpoint sungguhan lalu teruskan cookie sesi ke request berikutnya. */
function browserLogin(User $user): TestResponse
{
    $response = test()->post('/login', ['email' => $user->email, 'password' => 'rahasia123']);
    carrySession($response);

    return $response;
}

function carrySession(TestResponse $response): void
{
    $name = (string) config('session.cookie');
    $cookie = $response->getCookie($name);

    // getCookie() mengembalikan objek Cookie; yang dibutuhkan adalah nilainya
    // (string)-nya akan menjadi "nama=nilai" dan tidak bisa dipakai sebagai cookie.
    if ($cookie !== null) {
        test()->withCookie($name, $cookie->getValue());
    }

    // Guard di-cache antar request pada test client; putuskan supaya request
    // berikutnya membaca ulang user dari database (meniru perilaku produksi).
    Auth::forgetGuards();
}

/** Pindah ke browser lain yang belum punya sesi. */
function switchBrowser(): void
{
    test()->flushSession();
    test()->withCookie((string) config('session.cookie'), Str::random(40));
    Auth::forgetGuards();
}

/** Login lewat endpoint sungguhan pada browser yang sedang aktif. */
function loginNow(): TestResponse
{
    $user = test()->user;

    return browserLogin($user);
}

/*
|--------------------------------------------------------------------------
| Login menulis sidik jari sesi
|--------------------------------------------------------------------------
*/

test('login berhasil mencatat current_session_id dan last_login', function () {
    $response = browserLogin($this->user);

    $response->assertRedirect(route('dashboard.operator.index', absolute: false));

    $fresh = $this->user->fresh();
    expect($fresh->current_session_id)->not->toBeNull();
    expect($fresh->last_activity_at)->not->toBeNull();
    expect($fresh->last_login_at)->not->toBeNull();
    expect($fresh->last_login_ip)->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Pemblokiran login kedua
|--------------------------------------------------------------------------
*/

test('login kedua ke akun yang sama diblokir dengan 409 account_in_use', function () {
    browserLogin($this->user);

    $oldSessionId = $this->user->fresh()->current_session_id;
    expect($oldSessionId)->not->toBeNull();

    // Browser B: kredensial sama, sesi berbeda.
    switchBrowser();
    $response = test()->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123']);

    $response->assertStatus(409)
        ->assertJsonPath('code', 'account_in_use')
        ->assertJsonPath('message', 'Akun ini sedang digunakan di perangkat lain.')
        ->assertJsonStructure(['message', 'code', 'data' => ['device', 'last_active', 'ip']]);

    // Sesi lama TIDAK ikut terganti.
    expect($this->user->fresh()->current_session_id)->toBe($oldSessionId);
});

test('detail konflik sesi menyamarkan alamat IP', function () {
    browserLogin($this->user);
    $this->user->forceFill(['last_login_ip' => '103.22.44.55'])->save();

    switchBrowser();
    $ip = test()->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])->json('data.ip');

    expect($ip)->toBe('103.22.xx.xx');
    expect($ip)->not->toBe('103.22.44.55');
});

test('LoginAttemptBlocked dikirim ke sesi yang sedang aktif', function () {
    browserLogin($this->user);

    switchBrowser();
    test()->postJson('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])->assertStatus(409);

    Event::assertDispatched(LoginAttemptBlocked::class);
    expect($this->user->fresh()->current_session_id)->not->toBeNull();

    test()->assertDatabaseHas('auth_logs', [
        'event' => AuthLogger::BLOCKED_ACTIVE_SESSION,
        'user_id' => $this->user->id,
    ]);
});

/*
|--------------------------------------------------------------------------
| Sesi basi dapat digantikan otomatis
|--------------------------------------------------------------------------
*/

test('sesi yang lewat ambang aktivitas bisa digantikan tanpa konfirmasi', function () {
    $this->user->forceFill([
        'current_session_id' => 'sesi-lama-sekali',
        'last_activity_at' => now()->subMinutes((int) config('session_policy.active_threshold_minutes', 5) + 10),
        'last_login_ip' => '10.0.0.1',
    ])->save();

    test()->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])->assertRedirect();

    test()->assertAuthenticated();

    $fresh = $this->user->fresh();
    expect($fresh->current_session_id)->not->toBe('sesi-lama-sekali');
    expect($fresh->current_session_id)->not->toBeNull();
});

test('sesi aktif tidak diblokir bila kebijakan dimatikan', function () {
    config(['session_policy.single_session' => false]);

    $this->user->forceFill([
        'current_session_id' => 'sesi-aktif',
        'last_activity_at' => now(),
    ])->save();

    test()->post('/login', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])->assertRedirect();

    test()->assertAuthenticated();
});

/*
|--------------------------------------------------------------------------
| Ambil alih sesi
|--------------------------------------------------------------------------
*/

test('takeover memutus sesi lama, mengaktifkan sesi baru, dan menyiarkan satu event', function () {
    browserLogin($this->user);

    $oldSessionId = $this->user->fresh()->current_session_id;
    Event::fake([SessionTerminated::class, LoginAttemptBlocked::class]);

    switchBrowser();
    test()->post('/login', [
        'email' => 'siti@bps.go.id',
        'password' => 'rahasia123',
        'force' => true,
    ])->assertRedirect();

    $fresh = $this->user->fresh();
    expect($fresh->current_session_id)->not->toBeNull();
    expect($fresh->current_session_id)->not->toBe($oldSessionId);

    Event::assertDispatchedTimes(SessionTerminated::class, 1);
    Event::assertDispatched(
        SessionTerminated::class,
        fn (SessionTerminated $e) => $e->reason === SessionTerminator::REASON_TAKEN_OVER,
    );

    test()->assertDatabaseHas('auth_logs', ['event' => AuthLogger::FORCE_LOGIN, 'user_id' => $this->user->id]);
});

test('takeover tetap memerlukan kredensial yang benar', function () {
    browserLogin($this->user);

    switchBrowser();
    test()->post('/login', [
        'email' => 'siti@bps.go.id',
        'password' => 'password-salah',
        'force' => true,
    ])->assertSessionHasErrors(['email' => __('auth.failed')]);

    expect($this->user->fresh()->current_session_id)->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

test('middleware memutus sesi yang current_session_id-nya tidak cocok', function () {
    browserLogin($this->user);
    expect($this->user->fresh()->current_session_id)->not->toBeNull();

    // Sesi dicabut dari sisi lain.
    $this->user->forceFill(['current_session_id' => 'sesi-yang-berbeda'])->save();

    test()->get(route('dashboard.operator.index'))
        ->assertRedirect(route('login', ['alasan' => 'taken_over']));

    test()->assertGuest();
});

test('middleware memakai Inertia::location untuk request Inertia', function () {
    browserLogin($this->user);
    $this->user->forceFill(['current_session_id' => 'sesi-yang-berbeda'])->save();

    test()->get(route('dashboard.operator.index'), ['X-Inertia' => true])->assertStatus(409);
});

test('middleware memutus sesi yang sudah melewati batas inaktivitas', function () {
    browserLogin($this->user);

    $this->user->forceFill([
        'last_activity_at' => now()->subMinutes((int) config('session_policy.inactivity_timeout_minutes', 120) + 5),
    ])->save();

    test()->get(route('dashboard.operator.index'))
        ->assertRedirect(route('login', ['alasan' => 'expired']));

    test()->assertGuest();
    test()->assertDatabaseHas('auth_logs', ['event' => AuthLogger::SESSION_EXPIRED, 'user_id' => $this->user->id]);
});

test('middleware menyegarkan last_activity_at secara berkala', function () {
    browserLogin($this->user);

    // Di bawah ambang penulisan (60 detik) → tidak ada write baru.
    $before = $this->user->fresh()->last_activity_at;
    test()->get(route('dashboard.operator.index'))->assertOk();
    expect($this->user->fresh()->last_activity_at->toDateTimeString())->toBe($before->toDateTimeString());

    // Di atas ambang → diperbarui.
    test()->travel(120)->seconds();
    test()->get(route('dashboard.operator.index'))->assertOk();
    expect($this->user->fresh()->last_activity_at->toDateTimeString())->not->toBe($before->toDateTimeString());
});

test('browser yang ditinggalkan dapat mengambil alih sesi basi secara diam-diam', function () {
    browserLogin($this->user);
    $sessionId = $this->user->fresh()->current_session_id;

    // Browser lain sempat login lalu ditinggalkan sampai basi.
    $this->user->forceFill([
        'current_session_id' => 'sesi-basi',
        'last_activity_at' => now()->subMinutes(30),
    ])->save();

    test()->get(route('dashboard.operator.index'))->assertOk();

    expect($this->user->fresh()->current_session_id)->not->toBe('sesi-basi');
    expect($this->user->fresh()->current_session_id)->not->toBeNull();
    expect($sessionId)->not->toBeNull();
});

test('heartbeat mengembalikan status online dalam json', function () {
    browserLogin($this->user);

    // postJson() di test client TIDAK mengirim defaultCookies; pakai post()
    // agar cookie sesi ikut terkirim seperti di browser sungguhan.
    test()->post(route('session.ping'))
        ->assertOk()
        ->assertJsonPath('ok', true)
        ->assertJsonPath('is_online', true);
});

test('tamu tidak bisa memanggil heartbeat', function () {
    test()->postJson(route('session.ping'))->assertUnauthorized();
});

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

test('logout membersihkan current_session_id dan mencatat audit log', function () {
    browserLogin($this->user);
    expect($this->user->fresh()->current_session_id)->not->toBeNull();

    test()->post('/logout')->assertRedirect('/');

    test()->assertGuest();

    $fresh = $this->user->fresh();
    expect($fresh->current_session_id)->toBeNull();
    expect($fresh->last_activity_at)->toBeNull();

    test()->assertDatabaseHas('auth_logs', ['event' => AuthLogger::LOGOUT, 'user_id' => $this->user->id]);
});

/*
|--------------------------------------------------------------------------
| Paksa logout oleh admin
|--------------------------------------------------------------------------
*/

test('admin dapat memaksa logout operator lain dan tercatat di audit log', function () {
    browserLogin($this->user);
    $this->user->forceFill(['last_activity_at' => now()])->save();

    switchBrowser();
    actingAs($this->admin)
        ->post(route('dashboard.admin.operator.force-logout', $this->user))
        ->assertRedirect();

    expect($this->user->fresh()->current_session_id)->toBeNull();

    Event::assertDispatched(SessionTerminated::class, fn (SessionTerminated $e) => $e->reason === 'forced_logout');

    test()->assertDatabaseHas('auth_logs', [
        'event' => AuthLogger::FORCED_LOGOUT,
        'user_id' => $this->user->id,
    ]);
});

test('operator tidak boleh memaksa logout pengguna lain', function () {
    $operator = User::factory()->operator()->create(['password' => 'rahasia123']);
    $target = User::factory()->operator()->create(['password' => 'rahasia123']);

    $target->forceFill(['current_session_id' => 'sesi-target', 'last_activity_at' => now()])->save();

    actingAs($operator)
        ->post(route('dashboard.admin.operator.force-logout', $target))
        ->assertForbidden();

    expect($target->fresh()->current_session_id)->toBe('sesi-target');
});

test('admin tidak dapat memaksa logout akunnya sendiri', function () {
    actingAs($this->admin)
        ->post(route('dashboard.admin.operator.force-logout', $this->admin))
        ->assertRedirect()
        ->assertSessionHasErrors('error');
});

test('menonaktifkan akun ikut mengakhiri sesinya', function () {
    browserLogin($this->user);
    $this->user->forceFill(['last_activity_at' => now()])->save();

    switchBrowser();
    actingAs($this->admin)
        ->put(route('dashboard.admin.operator.update', $this->user), [
            'name' => $this->user->name,
            'role' => 'operator',
            'email' => $this->user->email,
            'is_active' => false,
        ])
        ->assertRedirect();

    $fresh = $this->user->fresh();
    expect($fresh->is_active)->toBeFalse();
    expect($fresh->current_session_id)->toBeNull();

    Event::assertDispatched(SessionTerminated::class, fn (SessionTerminated $e) => $e->reason === 'deactivated');
});

/*
|--------------------------------------------------------------------------
| Halaman Kelola Operator
|--------------------------------------------------------------------------
*/

test('halaman kelola operator menampilkan status online dan data perangkat', function () {
    $this->user->forceFill([
        'last_activity_at' => now(),
        'last_login_at' => now(),
        'current_session_id' => 'sesi-aktif',
        'last_login_ip' => '203.0.113.9',
        'last_login_agent' => 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    ])->save();

    actingAs($this->admin)
        ->get(route('dashboard.admin.operator.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/operator/index')
            ->where('operators.data.0.is_online', true)
            ->where('operators.data.0.last_login_ip', '203.0.xx.xx')
            ->where('operators.data.0.last_login_device', 'Chrome di Windows')
        );
});

/*
|--------------------------------------------------------------------------
| Token API (Sanctum)
|--------------------------------------------------------------------------
*/

test('token mobile lama dicabut ketika token baru diterbitkan', function () {
    $first = $this->user->createToken('mobile')->plainTextToken;
    expect($this->user->tokens()->count())->toBe(1);

    $response = test()->postJson('/api/auth/token', [
        'email' => 'siti@bps.go.id',
        'password' => 'rahasia123',
        'device_name' => 'mobile',
    ])->assertCreated();

    expect($this->user->tokens()->count())->toBe(1);
    expect($response->json('data.token'))->not->toBe($first);
    expect($response->json('data.user.role'))->toBe('operator');
});

test('login token memakai pesan Indonesia dan kode yang konsisten', function () {
    test()->postJson('/api/auth/token', ['email' => 'siti@bps.go.id', 'password' => 'salah'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'invalid_credentials')
        ->assertJsonPath('message', 'Email atau password salah.');

    $this->user->update(['is_active' => false]);

    test()->postJson('/api/auth/token', ['email' => 'siti@bps.go.id', 'password' => 'rahasia123'])
        ->assertStatus(403)
        ->assertJsonPath('code', 'account_disabled');
});

test('password tidak pernah tersimpan di audit log maupun address IP mentah', function () {
    browserLogin($this->user);

    expect(Hash::check('rahasia123', $this->user->fresh()->password))->toBeTrue();

    $logs = json_encode($this->user->authLogs()->get()->map(fn ($log): array => $log->getAttributes())->all());

    expect($logs)->not->toContain('rahasia123');
    expect($logs)->not->toContain('siti@bps.go.id');
});
