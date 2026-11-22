<?php

use App\Actions\AutoCloseTickets;
use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('auto close closeOne closes eligible ticket', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-7002',
        'period' => now()->format('mY'),
        'sequence' => 7002,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'respon_awal',
        'last_staff_response_at' => now()->subDays(10),
        'source_app' => 'web',
        'created_at' => now()->subDays(10),
        'updated_at' => now()->subDays(10),
    ]);

    $action = app(AutoCloseTickets::class);
    $closed = $action->closeOne($ticket->id, 3);

    expect($closed)->toBeTrue();

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai');
    expect($ticket->closed_reason)->toBe(AutoCloseTickets::CLOSED_REASON);
    expect($ticket->completed_at)->not->toBeNull();
    expect($ticket->responses()->where('is_system', true)->count())->toBe(1);
});
