<?php

use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Broadcast;
use Inertia\Testing\AssertableInertia as Assert;

test('operator opening /settings/password receives auth.user with operator role and name', function () {
    $operator = User::factory()->create([
        'name' => 'Operator Melati',
        'role' => UserRole::Operator,
    ]);

    $this->actingAs($operator)
        ->get('/settings/password')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.id', $operator->id)
            ->where('auth.user.name', 'Operator Melati')
            ->where('auth.user.role', 'operator')
        );
});

test('operator accessing admin routes gets 403 forbidden', function () {
    $operator = User::factory()->operator()->create();

    $this->actingAs($operator)->get('/dashboard/admin/operator')->assertForbidden();
    $this->actingAs($operator)->get('/dashboard/admin/laporan-masuk')->assertForbidden();
});

test('operator_tim accessing admin and operator-only routes gets 403 forbidden', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    $this->actingAs($operatorTim)->get('/dashboard/admin')->assertForbidden();
    $this->actingAs($operatorTim)->get('/dashboard/admin/operator')->assertForbidden();
    $this->actingAs($operatorTim)->get('/dashboard/operator/laporan-masuk')->assertForbidden();
    $this->actingAs($operatorTim)->get('/dashboard/operator/laporan-selesai')->assertForbidden();
});

test('authenticated response contains Cache-Control no-store and private', function () {
    $operator = User::factory()->operator()->create();

    $response = $this->actingAs($operator)->get('/settings/password');

    $response->assertOk();
    $cacheControl = $response->headers->get('Cache-Control');
    expect($cacheControl)->toContain('no-store');
    expect($cacheControl)->toContain('private');
    expect($response->headers->get('Pragma'))->toBe('no-cache');
});

test('admin logout and subsequent operator login gives operator auth.user in next request', function () {
    $admin = User::factory()->admin()->create(['name' => 'Admin User']);
    $operator = User::factory()->operator()->create(['name' => 'Operator User']);

    $this->actingAs($admin)
        ->get('/settings/password')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.id', $admin->id)
            ->where('auth.user.name', 'Admin User')
        );

    $this->post('/logout')->assertRedirect('/');

    $this->actingAs($operator)
        ->get('/settings/password')
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.id', $operator->id)
            ->where('auth.user.name', 'Operator User')
            ->where('auth.user.role', 'operator')
        );
});

test('operator cannot subscribe to admin broadcast channels', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $operator = User::factory()->operator()->create();

    $this->actingAs($operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-inbox.invalid-channel',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();

    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    $this->actingAs($operatorTim)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-inbox.laporan-masuk',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});
