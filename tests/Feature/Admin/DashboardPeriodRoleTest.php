<?php
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

it('admin can filter period', function () {
    $admin = User::factory()->admin()->create();
    actingAs($admin)->get(route('dashboard.admin.index', ['period' => 'last_month']))
        ->assertInertia(fn (Assert $p) => $p
            ->where('canFilterPeriod', true)
            ->where('period', 'last_month'));
});

it('operator forced to this_month even with period param', function () {
    $operator = User::factory()->operator()->create();
    actingAs($operator)->get(route('dashboard.operator.index', ['period' => 'this_year', 'month' => 1, 'year' => 2026]))
        ->assertInertia(fn (Assert $p) => $p
            ->where('canFilterPeriod', false)
            ->where('period', 'this_month'));
});

it('operator_tim forced to this_month even with period param', function () {
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    actingAs($operatorTim)->get(route('dashboard.operator.index', ['period' => 'custom', 'month' => 8, 'year' => 2026]))
        ->assertInertia(fn (Assert $p) => $p
            ->where('canFilterPeriod', false)
            ->where('period', 'this_month'));
});
