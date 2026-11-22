<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('incoming reports inertia props contract', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    Ticket::create([
        'ticket_number' => 'PUB-201',
        'period' => now()->format('mY'),
        'sequence' => 201,
        'classification' => 'pengaduan',
        'title' => 'Laporan test',
        'content' => 'Isi',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'baru',
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/incoming-reports/index')
            ->has('tickets.data')
            ->has('counts')
        );
});

test('my reports inertia props contract', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator/my-reports/index')
        );
});

test('completed reports inertia props contract', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/completed-reports/index')
        );
});
