<?php

use App\Models\User;

test('guests cannot access admin dashboard', function () {
    $this->get('/dashboard/admin')->assertRedirect('/login');
});

test('guests cannot access operator dashboard', function () {
    $this->get('/dashboard/operator')->assertRedirect('/login');
});

test('admin can access admin dashboard', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/dashboard/admin')->assertOk();
});

test('operator cannot access admin dashboard', function () {
    $operator = User::factory()->operator()->create();

    $this->actingAs($operator)->get('/dashboard/admin')->assertForbidden();
});

test('operator can access operator dashboard', function () {
    $operator = User::factory()->operator()->create();

    $this->actingAs($operator)->get('/dashboard/operator')->assertOk();
});

test('admin cannot access operator dashboard', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get('/dashboard/operator')->assertForbidden();
});

test('new users register as operators by default', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard.operator.index', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => 'operator',
    ]);
});

test('admins log in to the admin dashboard', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->post('/login', [
        'email' => $admin->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard.admin.index', absolute: false));
});

test('operators log in to the operator dashboard', function () {
    $operator = User::factory()->operator()->create();

    $response = $this->post('/login', [
        'email' => $operator->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard.operator.index', absolute: false));
});
