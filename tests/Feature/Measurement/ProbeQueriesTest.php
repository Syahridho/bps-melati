<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('probe empty db queries', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $queries = [];
    DB::listen(function ($q) use (&$queries) {
        $queries[] = $q->sql;
    });

    $this->actingAs($operator)->get(route('dashboard.operator.my-reports.index'));

    // Assert: my-reports should have 6 queries (as measured)
    $queryCounts = array_count_values($queries);
    expect($queries)->toHaveCount(6);

    // tickets.check empty ticket_number should have 1 query
    $q2 = [];
    DB::listen(function ($q) use (&$q2) {
        $q2[] = $q->sql;
    });
    $this->get(route('tickets.check'));
    expect($q2)->toHaveCount(1);
});
