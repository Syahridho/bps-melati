<?php

use App\Events\UserLoggedIn;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

test('presence channel online-users only allows authenticated active users and only returns id', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactive = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false]);

    // Admin can join
    $this->actingAs($admin)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-online-users',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonPath('channel_data', json_encode(['user_id' => (string) $admin->id, 'user_info' => ['id' => $admin->id]]));

    // Operator can join
    $this->actingAs($operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-online-users',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonPath('channel_data', json_encode(['user_id' => (string) $operator->id, 'user_info' => ['id' => $operator->id]]));

    // Operator tim can join
    $this->actingAs($operatorTim)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-online-users',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonPath('channel_data', json_encode(['user_id' => (string) $operatorTim->id, 'user_info' => ['id' => $operatorTim->id]]));

    // Inactive user rejected
    $this->actingAs($inactive)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-online-users',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();

    // Guest rejected
    $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('private channel admin.operators only allows active admin users', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);

    $this->actingAs($admin)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-admin.operators',
            'socket_id' => '1234.5678',
        ])
        ->assertOk();

    $this->actingAs($operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-admin.operators',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();

    $this->actingAs($operatorTim)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-admin.operators',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

test('login dispatches UserLoggedIn event with correct payload', function () {
    Event::fake([UserLoggedIn::class]);

    $operator = User::factory()->create([
        'email' => 'operator.presence@bps.go.id',
        'password' => bcrypt('password123'),
        'role' => UserRole::Operator,
    ]);

    $this->post('/login', [
        'email' => 'operator.presence@bps.go.id',
        'password' => 'password123',
    ])->assertRedirect();

    Event::assertDispatched(UserLoggedIn::class, function (UserLoggedIn $event) use ($operator) {
        expect($event->user->id)->toBe($operator->id);
        $payload = $event->broadcastWith();
        expect($payload)->toHaveKeys(['id', 'last_login_at', 'last_login_device', 'last_login_ip', 'has_session']);
        expect($payload['id'])->toBe($operator->id);
        return true;
    });
});

test('touchActivity does not write last_activity_at more than once within 60 seconds', function () {
    $user = User::factory()->create([
        'last_activity_at' => now(),
    ]);

    $initialActivity = $user->last_activity_at;

    // Call touchActivity immediately (within 60s)
    $touched = $user->touchActivity();
    expect($touched)->toBeFalse();
    expect($user->fresh()->last_activity_at->toIso8601String())->toBe($initialActivity->toIso8601String());

    // Travel 61 seconds into the future
    $this->travel(61)->seconds();

    $touchedLater = $user->touchActivity();
    expect($touchedLater)->toBeTrue();
    expect($user->fresh()->last_activity_at->greaterThan($initialActivity))->toBeTrue();
});
