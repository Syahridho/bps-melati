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
            ->component('dashboard/admin/kelola-operator/index')
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

test('admin can filter users by role (OR combination)', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $admin2 = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);
    User::factory()->create(['role' => 'operator_tim']);

    actingAs($admin)
        ->get(route('dashboard.admin.operator.index', ['roles' => ['admin', 'operator']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('operators.data', 3) // 2 admin + 1 operator
        );
});

test('roles filter with no roles or empty returns all users', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    User::factory()->count(2)->create(['role' => 'operator']);

    // No roles parameter -> all users
    actingAs($admin)
        ->get(route('dashboard.admin.operator.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('operators.data', 3)
        );

    // Empty roles array -> all users
    actingAs($admin)
        ->get(route('dashboard.admin.operator.index', ['roles' => []]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('operators.data', 3)
        );
});

test('all three roles selected equals no filter (returns all users)', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    User::factory()->count(2)->create(['role' => 'operator']);

    actingAs($admin)
        ->get(route('dashboard.admin.operator.index', ['roles' => ['admin', 'operator', 'operator_tim']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('operators.data', 3) // all users, no roles filter applied
        );
});

test('unknown role value is ignored', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    User::factory()->count(2)->create(['role' => 'operator']);

    actingAs($admin)
        ->get(route('dashboard.admin.operator.index', ['roles' => ['admin', 'unknown_role']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('operators.data', 1) // only the admin
        );
});

test('admin can delete an operator or user', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($admin)
        ->delete(route('dashboard.admin.operator.destroy', $operator))
        ->assertRedirect();

    $this->assertSoftDeleted('users', [
        'id' => $operator->id,
    ]);
});
