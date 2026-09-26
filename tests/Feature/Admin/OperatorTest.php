<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

test('guest cannot access operator management', function () {
    get(route('dashboard.admin.operator.index'))
        ->assertRedirect(route('login'));
});

test('operator cannot access operator management', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->get(route('dashboard.admin.operator.index'))
        ->assertForbidden();
});

test('admin can view user list with redis cache', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    User::factory()->count(3)->create(['role' => 'operator']);

    actingAs($admin)
        ->get(route('dashboard.admin.operator.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/operator/index')
            ->has('operators.data', 4) // 1 admin + 3 operators
        );
});

test('admin can create a new admin or operator and update cache version', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->post(route('dashboard.admin.operator.store'), [
            'name' => 'Admin Tambahan',
            'role' => 'admin',
            'email' => 'admin.baru@bps.go.id',
            'password' => 'password123',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'name' => 'Admin Tambahan',
        'email' => 'admin.baru@bps.go.id',
        'role' => 'admin',
    ]);

    expect(Cache::has('operators:version'))->toBeTrue();
});

test('admin can update user details and role', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create([
        'name' => 'Operator Lama',
        'email' => 'operator.lama@bps.go.id',
        'role' => 'operator',
    ]);

    actingAs($admin)
        ->put(route('dashboard.admin.operator.update', $user), [
            'name' => 'Operator Diperbarui',
            'role' => 'admin',
            'email' => 'operator.diperbarui@bps.go.id',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Operator Diperbarui',
        'role' => 'admin',
        'email' => 'operator.diperbarui@bps.go.id',
    ]);
});

test('admin can delete an operator or user', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($admin)
        ->delete(route('dashboard.admin.operator.destroy', $operator))
        ->assertRedirect();

    $this->assertDatabaseMissing('users', [
        'id' => $operator->id,
    ]);
});
