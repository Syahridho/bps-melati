<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('probe empty db queries2', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    // Just check that DB listening works and we can count queries
    $names = ['audit-log.summary-weekly', 'audit-log.flags-summary', 'audit-flag.index', 'audit-log.index'];
    $counts = [];
    foreach ($names as $name) {
        $queries = [];
        DB::listen(function ($q) use (&$queries) {
            $queries[] = $q->sql;
        });
        $this->actingAs($admin)->get(route($name));
        $counts[$name] = count($queries);
    }
    // Assert each endpoint has queries
    foreach ($counts as $name => $n) {
        expect($n)->toBeGreaterThan(0);
    }
});
