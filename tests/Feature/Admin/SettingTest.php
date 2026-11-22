<?php

use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

test('old settings application route redirects to penugasan', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get('/settings/application')
        ->assertRedirect(route('settings.application.penugasan'));
});

test('guest cannot access settings routes', function () {
    get(route('settings.application.penugasan'))->assertRedirect(route('login'));
    get(route('settings.application.auto-close'))->assertRedirect(route('login'));
    get(route('settings.application.laporan'))->assertRedirect(route('login'));
    get(route('settings.application.penilaian'))->assertRedirect(route('login'));
});

test('operator cannot access application settings pages', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->get(route('settings.application.penugasan'))
        ->assertForbidden();

    actingAs($operator)
        ->get(route('settings.application.auto-close'))
        ->assertForbidden();

    actingAs($operator)
        ->get(route('settings.application.laporan'))
        ->assertForbidden();

    actingAs($operator)
        ->get(route('settings.application.penilaian'))
        ->assertForbidden();
});

test('admin can access penugasan page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('settings.application.penugasan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/assignment/index')
            ->has('assignmentMode')
        );
});

test('admin can access auto-close page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('settings.application.auto-close'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/auto-close/index')
            ->has('settings.auto_close_pengaduan_days')
            ->has('settings.auto_close_aspirasi_days')
            ->has('settings.auto_close_permintaan_informasi_days')
            ->has('settings.kadar_pengawasan_hari')
        );
});

test('admin can update auto-close settings and record audit log', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Setting::set('nama_penanda_tangan', 'Pejabat Tetap');

    actingAs($admin)
        ->post(route('settings.application.auto-close.update'), [
            'auto_close_pengaduan_days' => 4,
            'auto_close_aspirasi_days' => 2,
            'auto_close_permintaan_informasi_days' => 7,
            'kadar_pengawasan_hari' => 30,
        ])
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    expect(Setting::get('auto_close_pengaduan_days'))->toBe('4')
        ->and(Setting::get('auto_close_aspirasi_days'))->toBe('2')
        ->and(Setting::get('auto_close_permintaan_informasi_days'))->toBe('7')
        ->and(Setting::get('kadar_pengawasan_hari'))->toBe('30')
        ->and(Setting::get('nama_penanda_tangan'))->toBe('Pejabat Tetap'); // tidak tertimpa

    $log = AuditLog::where('event_type', 'setting.updated')->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->category)->toBe('setting')
        ->and($log->meta['keys'])->toContain('auto_close_pengaduan_days', 'kadar_pengawasan_hari');
});

test('admin cannot update auto-close with invalid data', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->postJson(route('settings.application.auto-close.update'), [
            'auto_close_pengaduan_days' => -1,
            'auto_close_aspirasi_days' => 400,
            // auto_close_permintaan_informasi_days missing
            'kadar_pengawasan_hari' => '',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors([
            'auto_close_pengaduan_days',
            'auto_close_aspirasi_days',
            'auto_close_permintaan_informasi_days',
            'kadar_pengawasan_hari',
        ]);
});

test('admin can access laporan page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('settings.application.laporan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/recap/index')
            ->has('settings.nama_penanda_tangan')
            ->has('settings.jabatan_penanda_tangan')
            ->has('settings.kota_penanda_tangan')
        );
});

test('admin can update laporan settings and record audit log', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Setting::set('auto_close_pengaduan_days', '10');

    actingAs($admin)
        ->post(route('settings.application.laporan.update'), [
            'nama_penanda_tangan' => 'Dr. Budi Santoso, M.Si',
            'jabatan_penanda_tangan' => 'KEPALA BPS PROVINSI',
            'kota_penanda_tangan' => 'Pekanbaru',
        ])
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    expect(Setting::get('nama_penanda_tangan'))->toBe('Dr. Budi Santoso, M.Si')
        ->and(Setting::get('jabatan_penanda_tangan'))->toBe('KEPALA BPS PROVINSI')
        ->and(Setting::get('kota_penanda_tangan'))->toBe('Pekanbaru')
        ->and(Setting::get('auto_close_pengaduan_days'))->toBe('10') // tidak tertimpa
        ->and(Cache::get('setting:nama_penanda_tangan'))->toBe('Dr. Budi Santoso, M.Si');

    $log = AuditLog::where('event_type', 'setting.updated')->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->meta['keys'])->toContain('nama_penanda_tangan', 'jabatan_penanda_tangan', 'kota_penanda_tangan');
});

test('admin cannot update laporan with string exceeding 255 chars', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->postJson(route('settings.application.laporan.update'), [
            'nama_penanda_tangan' => str_repeat('a', 256),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('nama_penanda_tangan');
});

test('admin can access penilaian page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('settings.application.penilaian'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/rating/index')
            ->has('ratingEnabled')
        );
});

test('admin can update rating setting and record audit log', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->patch(route('settings.application.rating'), [
            'rating_enabled' => true,
        ])
        ->assertRedirect();

    expect(Setting::get('rating_enabled'))->toBe('1');

    $log = AuditLog::where('event_type', 'setting.rating_enabled_changed')->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->meta['key'])->toBe('rating_enabled')
        ->and($log->meta['new_value'])->toBe('1');
});
