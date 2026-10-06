<?php

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

test('guest cannot access settings page', function () {
    get(route('dashboard.admin.pengaturan.index'))
        ->assertRedirect(route('login'));
});

test('operator cannot access settings page', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->get(route('dashboard.admin.pengaturan.index'))
        ->assertForbidden();
});

test('admin can access settings page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('dashboard.admin.pengaturan.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/pengaturan')
            ->has('settings')
        );
});

test('admin can update signatory settings and update redis cache', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->post(route('dashboard.admin.pengaturan.update'), [
            'nama_penanda_tangan' => 'Dr. Budi Santoso, M.Si',
            'jabatan_penanda_tangan' => 'KEPALA BPS PROVINSI',
            'kota_penanda_tangan' => 'Pekanbaru',
            'auto_close_pengaduan_days' => 4,
            'auto_close_aspirasi_days' => 2,
            'auto_close_permintaan_informasi_days' => 7,
        ])
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    $this->assertDatabaseHas('settings', [
        'key' => 'nama_penanda_tangan',
        'value' => 'Dr. Budi Santoso, M.Si',
    ]);

    $this->assertDatabaseHas('settings', [
        'key' => 'auto_close_pengaduan_days',
        'value' => '4',
    ]);

    expect(Setting::get('nama_penanda_tangan'))->toBe('Dr. Budi Santoso, M.Si')
        ->and(Setting::get('auto_close_pengaduan_days'))->toBe('4')
        ->and(Setting::get('auto_close_aspirasi_days'))->toBe('2')
        ->and(Setting::get('auto_close_permintaan_informasi_days'))->toBe('7')
        ->and(Cache::get('setting:nama_penanda_tangan'))->toBe('Dr. Budi Santoso, M.Si');
});

test('operator can access operator settings page', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->get(route('dashboard.operator.pengaturan.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/pengaturan')
            ->has('settings')
        );
});
