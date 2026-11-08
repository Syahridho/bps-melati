<?php

use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('guest cannot access API settings page', function () {
    get(route('settings.api'))
        ->assertRedirect(route('login'));
});

test('operator cannot access API settings page', function () {
    $operator = User::factory()->create(['role' => UserRole::Operator]);

    actingAs($operator)
        ->get(route('settings.api'))
        ->assertForbidden();
});

test('admin can access API settings page', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    actingAs($admin)
        ->get(route('settings.api'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/api/index')
            ->has('baseUrl')
            ->has('apiKeyHeaderName')
            ->where('baseUrl', 'http://localhost:8000/api')
            ->where('apiKeyHeaderName', 'X-API-KEY')
            ->missing('apiKey')
            ->missing('API_KEY')
        );
});

test('API settings page does not expose API key value in props', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    $response = actingAs($admin)
        ->get(route('settings.api'))
        ->assertOk();

    $inertia = $response->getOriginalContent() ?? $response->getContent();
    $inertiaJson = is_string($inertia) ? $inertia : json_encode($inertia);

    // API key value harus tidak muncul di props Inertia
    expect($inertiaJson)->not->toContain('melati-secret-api-key');
    expect($inertiaJson)->not->toContain('YOUR_API_KEY');
    expect($inertiaJson)->not->toContain('API_KEY');
});
