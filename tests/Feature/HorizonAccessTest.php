<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

test('guest is redirected from horizon dashboard', function () {
    get('/horizon')->assertRedirect(route('login'));
});

test('operator cannot access horizon dashboard', function () {
    actingAs(User::factory()->operator()->create())
        ->get('/horizon')
        ->assertForbidden();
});

test('admin can access horizon dashboard', function () {
    actingAs(User::factory()->admin()->create())
        ->get('/horizon')
        ->assertOk();
});
