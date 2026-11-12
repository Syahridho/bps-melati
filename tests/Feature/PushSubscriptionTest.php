<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function pushSubscriptionPayload(string $endpoint = 'https://fcm.googleapis.com/fcm/send/test-123'): array
{
    return [
        'endpoint' => $endpoint,
        'keys' => [
            'p256dh' => 'BI6...fake-p256dh-key...',
            'auth' => 'fake-auth-key',
        ],
    ];
}

test('guest cannot save push subscription', function () {
    $payload = pushSubscriptionPayload();

    $response = $this->postJson(route('push-subscriptions.store'), $payload);

    $response->assertStatus(401);
});

test('guest cannot delete push subscription', function () {
    $payload = pushSubscriptionPayload();

    $response = $this->deleteJson(route('push-subscriptions.destroy'), $payload);

    $response->assertStatus(401);
});

test('user can save push subscription and it belongs to correct user', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $payload = pushSubscriptionPayload('https://fcm.googleapis.com/fcm/send/test-user-a');

    actingAs($user)
        ->postJson(route('push-subscriptions.store'), $payload)
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('push_subscriptions', [
        'subscribable_type' => User::class,
        'subscribable_id' => $user->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-user-a',
    ]);

    expect($user->pushSubscriptions()->count())->toBe(1);
});

test('sending same endpoint again does not duplicate subscription (idempotent)', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-idempotent';
    $payload = pushSubscriptionPayload($endpoint);

    actingAs($user)->postJson(route('push-subscriptions.store'), $payload)->assertStatus(200);
    actingAs($user)->postJson(route('push-subscriptions.store'), $payload)->assertStatus(200);

    expect($user->pushSubscriptions()->count())->toBe(1);
    $this->assertDatabaseHas('push_subscriptions', [
        'subscribable_type' => User::class,
        'subscribable_id' => $user->id,
        'endpoint' => $endpoint,
    ]);
});

test('same endpoint from another user transfers ownership', function () {
    $userA = User::factory()->create(['role' => 'admin']);
    $userB = User::factory()->create(['role' => 'operator']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-transfer';

    // User A saves first
    actingAs($userA)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);
    expect($userA->pushSubscriptions()->count())->toBe(1);

    // User B saves same endpoint -> ownership transfers to B
    actingAs($userB)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    expect($userB->pushSubscriptions()->count())->toBe(1);
    expect($userA->pushSubscriptions()->count())->toBe(0);
    $this->assertDatabaseHas('push_subscriptions', [
        'subscribable_type' => User::class,
        'subscribable_id' => $userB->id,
        'endpoint' => $endpoint,
    ]);
});

test('user can delete their own push subscription', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-delete';
    actingAs($user)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    expect($user->pushSubscriptions()->count())->toBe(1);

    actingAs($user)
        ->deleteJson(route('push-subscriptions.destroy'), ['endpoint' => $endpoint])
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    expect($user->pushSubscriptions()->count())->toBe(0);
    $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => $endpoint]);
});

test('user cannot delete another user push subscription', function () {
    $userA = User::factory()->create(['role' => 'admin']);
    $userB = User::factory()->create(['role' => 'operator']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-cross-delete';

    actingAs($userA)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    // User B tries to delete user A's subscription -> should not delete
    actingAs($userB)
        ->deleteJson(route('push-subscriptions.destroy'), ['endpoint' => $endpoint])
        ->assertStatus(200);

    expect($userA->pushSubscriptions()->count())->toBe(1);
    $this->assertDatabaseHas('push_subscriptions', ['endpoint' => $endpoint]);
});

test('status endpoint returns subscribed true when user has subscription', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-status';
    actingAs($user)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    $response = actingAs($user)
        ->getJson(route('push-subscriptions.status', ['endpoint' => $endpoint]))
        ->assertStatus(200);

    $response->assertJsonPath('subscribed', true);
});

test('status endpoint returns subscribed false when user has no subscription', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $response = actingAs($user)
        ->getJson(route('push-subscriptions.status', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/test-nonexistent']))
        ->assertStatus(200);

    $response->assertJsonPath('subscribed', false);
});

test('validation rejects missing p256dh key', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $payload = pushSubscriptionPayload();
    unset($payload['keys']['p256dh']);

    actingAs($user)
        ->postJson(route('push-subscriptions.store'), $payload)
        ->assertStatus(422);
});

test('validation rejects missing auth key', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $payload = pushSubscriptionPayload();
    unset($payload['keys']['auth']);

    actingAs($user)
        ->postJson(route('push-subscriptions.store'), $payload)
        ->assertStatus(422);
});

test('operator can save push subscription', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $payload = pushSubscriptionPayload('https://fcm.googleapis.com/fcm/send/test-operator');

    actingAs($operator)
        ->postJson(route('push-subscriptions.store'), $payload)
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('push_subscriptions', [
        'subscribable_type' => User::class,
        'subscribable_id' => $operator->id,
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-operator',
    ]);

    expect($operator->pushSubscriptions()->count())->toBe(1);
});

test('operator can delete their own push subscription', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-operator-delete';
    actingAs($operator)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    expect($operator->pushSubscriptions()->count())->toBe(1);

    actingAs($operator)
        ->deleteJson(route('push-subscriptions.destroy'), ['endpoint' => $endpoint])
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    expect($operator->pushSubscriptions()->count())->toBe(0);
    $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => $endpoint]);
});

test('operator status endpoint returns subscribed true when has subscription', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $endpoint = 'https://fcm.googleapis.com/fcm/send/test-operator-status';
    actingAs($operator)->postJson(route('push-subscriptions.store'), pushSubscriptionPayload($endpoint))->assertStatus(200);

    $response = actingAs($operator)
        ->getJson(route('push-subscriptions.status', ['endpoint' => $endpoint]))
        ->assertStatus(200);

    $response->assertJsonPath('subscribed', true);
});
