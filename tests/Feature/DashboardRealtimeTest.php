<?php

use App\Events\DashboardUpdated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('dashboard updated event is dispatched when ticket is created', function () {
    Event::fake([DashboardUpdated::class]);

    $channel = Channel::first() ?? Channel::factory()->create();

    $ticket = Ticket::create([
        'ticket_number' => 'TEST/123/01',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Test Realtime Ticket',
        'content' => 'Test content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter Test',
        'status' => 'baru',
    ]);

    Event::assertDispatched(DashboardUpdated::class, function ($event) use ($ticket) {
        return $event->type === 'created' && $event->ticketId === $ticket->id;
    });
});

test('dashboard updated event is dispatched when ticket status changes', function () {
    Event::fake([DashboardUpdated::class]);

    $channel = Channel::first() ?? Channel::factory()->create();

    $ticket = Ticket::create([
        'ticket_number' => 'TEST/123/02',
        'period' => '2026-11',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Test Status Change Ticket',
        'content' => 'Test content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter Test',
        'status' => 'baru',
    ]);

    $ticket->update(['status' => 'respon_awal']);

    Event::assertDispatched(DashboardUpdated::class, function ($event) use ($ticket) {
        return $event->type === 'status_changed' && $event->ticketId === $ticket->id && $event->newStatus === 'respon_awal';
    });
});

test('dashboard updated event is dispatched when ticket is deleted', function () {
    Event::fake([DashboardUpdated::class]);

    $channel = Channel::first() ?? Channel::factory()->create();

    $ticket = Ticket::create([
        'ticket_number' => 'TEST/123/03',
        'period' => '2026-11',
        'sequence' => 3,
        'classification' => 'pengaduan',
        'title' => 'Test Delete Ticket',
        'content' => 'Test content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter Test',
        'status' => 'baru',
    ]);

    $ticket->delete();

    Event::assertDispatched(DashboardUpdated::class, function ($event) use ($ticket) {
        return $event->type === 'deleted' && $event->ticketId === $ticket->id;
    });
});
