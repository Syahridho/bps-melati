<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\InboxCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('cache invalidation happens after commit, not before', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-8100',
        'period' => now()->format('mY'),
        'sequence' => 8100,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'respon_substantif',
        'assigned_to' => $operator->id,
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(InboxCounter::getCounts()['semua'])->toBe(1);
    $versionBefore = InboxCounter::version();

    $versionDuring = null;

    DB::transaction(function () use ($ticket, &$versionDuring, $versionBefore) {
        $ticket->update(['status' => 'selesai', 'completed_at' => now()]);

        // Cache must still be stale inside the transaction (invalidation deferred).
        $versionDuring = InboxCounter::version();
        expect($versionDuring)->toBe($versionBefore);
    });

    // After commit, invalidation runs and the version rotates.
    expect(InboxCounter::version())->not->toBe($versionBefore);
    expect(InboxCounter::getCounts()['semua'])->toBe(0);
});
