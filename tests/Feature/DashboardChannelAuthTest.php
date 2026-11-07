<?php

use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Broadcast;

test('admin can access dashboard.admin channel', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $admin = User::factory()->create([
        'role' => UserRole::Admin,
        'is_active' => true,
    ]);

    $this->actingAs($admin);

    $response = $this->post('/broadcasting/auth', [
        'channel_name' => 'private-dashboard.admin',
        'socket_id' => '1234.5678',
    ]);

    $response->assertSuccessful();
});

test('non-admin cannot access dashboard.admin channel', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $operator = User::factory()->create([
        'role' => UserRole::Operator,
        'is_active' => true,
    ]);

    $this->actingAs($operator);

    $response = $this->post('/broadcasting/auth', [
        'channel_name' => 'private-dashboard.admin',
        'socket_id' => '1234.5678',
    ]);

    $response->assertForbidden();
});
