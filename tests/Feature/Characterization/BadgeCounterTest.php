<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\InboxCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('inbox counter tracks assigned active tickets and invalidates', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-7001',
        'period' => now()->format('mY'),
        'sequence' => 7001,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'respon_awal',
        'assigned_to' => $operator->id,
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(1);

    $ticket->update(['status' => 'selesai']);
    InboxCounter::invalidate();

    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(0);
});
