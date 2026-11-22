<?php

use App\Enums\UserRole;
use App\Models\User;

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

        $this->actingAs($user)
            ->get('/settings/application/penugasan')
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
        ->assertRedirect('/settings/application/penugasan');

    $this->actingAs($admin)
        ->get('/settings/application/penugasan')
        ->assertSuccessful();
});
