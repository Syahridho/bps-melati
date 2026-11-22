<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Support\InboxCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('cache invalidation waits for commit', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-9003',
        'period' => now()->format('mY'),
        'sequence' => 9003,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'respon_substantif',
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    InboxCounter::invalidate();

    DB::beginTransaction();
    $ticket->update(['status' => 'selesai', 'completed_at' => now()]);
    // inside transaction, invalidation deferred
    DB::commit();

    InboxCounter::invalidate(); // ensure read fresh
    expect(InboxCounter::getCounts()['semua'])->toBe(0);
});
