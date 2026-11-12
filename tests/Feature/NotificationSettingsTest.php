<?php

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\patchJson;

uses(RefreshDatabase::class);

test('guest cannot access notification settings page', function () {
    get(route('settings.notification'))
        ->assertRedirect(route('login'));
});

test('admin can access notification settings page', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->get(route('settings.notification'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/notification/index')
            ->where('dashboardLiveEnabled', true)
            ->where('canManageGlobal', true));
});

test('operator can access notification settings page but cannot manage global', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->get(route('settings.notification'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/notification/index')
            ->where('canManageGlobal', false));
});

test('operator_tim can access notification settings page but cannot manage global', function () {
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);

    actingAs($operatorTim)
        ->get(route('settings.notification'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/notification/index')
            ->where('canManageGlobal', false));
});

test('admin can update dashboard_live_enabled via PATCH endpoint', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    // Default is true (Setting::get default), set to false first
    Setting::set('dashboard_live_enabled', '0');
    Cache::forget('setting:dashboard_live_enabled');

    actingAs($admin)
        ->patchJson(route('settings.notification.dashboard-live'), [
            'dashboard_live_enabled' => true,
        ])
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('dashboard_live_enabled', true);

    $this->assertDatabaseHas('settings', [
        'key' => 'dashboard_live_enabled',
        'value' => '1',
    ]);

    expect(Setting::get('dashboard_live_enabled'))->toBe('1');
});

test('admin can disable dashboard_live_enabled via PATCH endpoint', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    Setting::set('dashboard_live_enabled', '1');
    Cache::forget('setting:dashboard_live_enabled');

    actingAs($admin)
        ->patchJson(route('settings.notification.dashboard-live'), [
            'dashboard_live_enabled' => false,
        ])
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('dashboard_live_enabled', false);

    $this->assertDatabaseHas('settings', [
        'key' => 'dashboard_live_enabled',
        'value' => '0',
    ]);

    expect(Setting::get('dashboard_live_enabled'))->toBe('0');
});

test('operator cannot update dashboard_live_enabled (403)', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    Setting::set('dashboard_live_enabled', '1');
    Cache::forget('setting:dashboard_live_enabled');

    actingAs($operator)
        ->patchJson(route('settings.notification.dashboard-live'), [
            'dashboard_live_enabled' => false,
        ])
        ->assertStatus(403);

    // Value must not change
    expect(Setting::get('dashboard_live_enabled'))->toBe('1');
});

test('PATCH endpoint rejects invalid input', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->patchJson(route('settings.notification.dashboard-live'), [
            'dashboard_live_enabled' => 'not-a-boolean',
        ])
        ->assertStatus(422);
});

test('guest cannot access dashboard-live PATCH endpoint', function () {
    patchJson(route('settings.notification.dashboard-live'), [
        'dashboard_live_enabled' => false,
    ])->assertStatus(401);
});
