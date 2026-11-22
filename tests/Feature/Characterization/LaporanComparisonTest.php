<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('incoming reports query, order, pagination, and props match expected pre-refactor behaviour', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $base = [
        'period' => now()->format('mY'),
        'classification' => 'pengaduan',
        'title' => 'Judul',
        'content' => 'Isi',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ];

    // Oldest -> newest; expected listing is newest first.
    $t1 = Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-IN-1', 'sequence' => 1, 'status' => 'baru',
        'created_at' => now()->subMinutes(3), 'updated_at' => now()->subMinutes(3),
    ]));
    $t2 = Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-IN-2', 'sequence' => 2, 'status' => 'respon_awal',
        'created_at' => now()->subMinutes(2), 'updated_at' => now()->subMinutes(2),
    ]));
    // Completed: excluded from incoming active list.
    Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-IN-3', 'sequence' => 3, 'status' => 'selesai',
        'completed_at' => now(), 'created_at' => now()->subMinute(), 'updated_at' => now()->subMinute(),
    ]));
    // Admin input-data: excluded from incoming list.
    Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-IN-4', 'sequence' => 4, 'status' => 'baru',
        'source_app' => 'admin', 'created_by' => $admin->id,
        'created_at' => now(), 'updated_at' => now(),
    ]));

    actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index', ['per_page' => 10]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/incoming-reports/index')
            ->where('tickets.total', 2)
            ->where('tickets.per_page', 10)
            ->where('tickets.current_page', 1)
            ->where('tickets.last_page', 1)
            ->where('tickets.data.0.ticket_number', 'T-IN-2')
            ->where('tickets.data.1.ticket_number', 'T-IN-1')
        );
});

test('my reports query, order, pagination, and props match expected pre-refactor behaviour', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $base = [
        'period' => now()->format('mY'),
        'classification' => 'pengaduan',
        'title' => 'Judul',
        'content' => 'Isi',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ];

    $a = Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-MY-1', 'sequence' => 10, 'status' => 'baru',
        'assigned_to' => $operator->id, 'assignment_mode' => 'claim',
        'created_at' => now()->subMinutes(3), 'updated_at' => now()->subMinutes(3),
    ]));
    $b = Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-MY-2', 'sequence' => 11, 'status' => 'respon_substantif',
        'assigned_to' => $operator->id, 'assignment_mode' => 'claim',
        'created_at' => now()->subMinutes(2), 'updated_at' => now()->subMinutes(2),
    ]));
    // Not assigned to this operator: excluded.
    Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-MY-3', 'sequence' => 12, 'status' => 'baru',
        'created_at' => now()->subMinute(), 'updated_at' => now()->subMinute(),
    ]));
    // Assigned but completed: excluded.
    Ticket::forceCreate(array_merge($base, [
        'ticket_number' => 'T-MY-4', 'sequence' => 13, 'status' => 'selesai',
        'assigned_to' => $operator->id, 'assignment_mode' => 'claim',
        'completed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
    ]));

    actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index', ['per_page' => 10]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator/my-reports/index')
            ->where('tickets.total', 2)
            ->where('tickets.per_page', 10)
            ->where('tickets.current_page', 1)
            ->where('tickets.data.0.ticket_number', 'T-MY-2')
            ->where('tickets.data.1.ticket_number', 'T-MY-1')
        );
});
