<?php

use App\Events\InboxUpdated;
use App\Events\TicketClosedByReporter;
use App\Events\TicketUpdated;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    Setting::set('rating_enabled', '1');
    $this->channel = Channel::create([
        'name' => 'Website BPS',
        'slug' => 'website-bps-rc',
        'is_active' => true,
    ]);
});

test('reporter closure with rating stores rating and audit log and dispatches events', function () {
    Event::fake([TicketUpdated::class, TicketClosedByReporter::class, InboxUpdated::class]);

    $accessCode = 'test-access-code-rating-123';
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0999',
        'period' => '2026-09',
        'sequence' => 999,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Laporan uji rating.',
        'access_code' => $accessCode,
        'status' => 'respon_substantif',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    $response = $this->post(route('tickets.check.complete', ['ticketNumber' => $ticket->ticket_number]), [
        'access_code' => $accessCode,
        'rating' => 5,
        'comment' => 'Bagus',
    ]);

    $response->assertRedirect();

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai');
    expect($ticket->rating)->toBe(5);
    expect($ticket->rating_comment)->toBe('Bagus');
    expect($ticket->rated_at)->not->toBeNull();

    expect(AuditLog::where('ticket_id', $ticket->id)->where('event_type', 'ticket.rated')->exists())->toBeTrue();

    Event::assertDispatched(TicketUpdated::class);
    Event::assertDispatched(TicketClosedByReporter::class);
});
