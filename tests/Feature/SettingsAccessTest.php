<?php

use App\Models\User;
use App\UserRole;

test('operator and operator_tim can access settings password and appearance but not application settings', function () {
    foreach ([UserRole::Operator, UserRole::OperatorTim] as $role) {
        $user = User::factory()->create(['role' => $role]);

        $this->actingAs($user)
            ->get('/settings/password')
            ->assertSuccessful();

        $this->actingAs($user)
            ->get('/settings/appearance')
            ->assertSuccessful();

        $this->actingAs($user)
            ->get('/settings/application')
            ->assertForbidden();
    }
});

test('admin can access all settings', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($admin)
        ->get('/settings/password')
        ->assertSuccessful();

    $this->actingAs($admin)
        ->get('/settings/appearance')
        ->assertSuccessful();

    $this->actingAs($admin)
        ->get('/settings/application')
        ->assertSuccessful();
});
