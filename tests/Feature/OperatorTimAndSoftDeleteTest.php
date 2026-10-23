<?php

use App\Models\User;
use App\UserRole;

test('operator_tim can access dashboard and input data but is forbidden elsewhere', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    $this->actingAs($operatorTim)
        ->get('/dashboard/operator')
        ->assertSuccessful();

    $this->actingAs($operatorTim)
        ->get('/dashboard/operator/input-data')
        ->assertSuccessful();

    $this->actingAs($operatorTim)
        ->get('/dashboard/admin/operator')
        ->assertForbidden();

    $this->actingAs($operatorTim)
        ->get('/dashboard/admin/laporan-masuk')
        ->assertForbidden();
});

test('user soft delete works correctly and blocks login', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'email' => 'op@example.com', 'password' => bcrypt('password')]);

    $response = $this->actingAs($admin)
        ->delete(route('dashboard.admin.operator.destroy', $operator));

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    expect($operator->fresh()->trashed())->toBeTrue();

    auth()->logout();

    // Soft deleted user cannot authenticate
    $loginResponse = $this->post('/login', [
        'email' => 'op@example.com',
        'password' => 'password',
    ]);

    $loginResponse->assertSessionHasErrors('email');
    $this->assertGuest();
});
