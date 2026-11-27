<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Services\AuditFlagDetector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

test('audit flag detector creates jaringan_sama and selesai_cepat flags once', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);
    $ticket = Ticket::create([
        'ticket_number' => 'T-9001',
        'period' => now()->format('mY'),
        'sequence' => 9001,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'selesai',
        'rating' => 5,
        'completed_at' => now(),
        'assigned_to' => $operator->id,
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'response',
        'message' => 'ok',
        'sent_at' => now()->subSeconds(30),
    ]);

    $replyIp = '203.0.113.5';
    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => $replyIp,
        'created_at' => now()->subSeconds(30),
    ]);

    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => $replyIp,
    ]);

    $request = Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => $replyIp]);

    $detector = app(AuditFlagDetector::class);
    $detector->detect($ticket, $completionLog, $request);
    $detector->detect($ticket, $completionLog, $request);

    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', 'jaringan_sama')->count())->toBe(1);
    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', 'selesai_cepat_setelah_balasan')->count())->toBe(1);
});

test('audit flag detector creates unified selesai_cepat_setelah_balasan flag instead of rating_cepat and is idempotent', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);
    $ticket = Ticket::create([
        'ticket_number' => 'T-9002',
        'period' => now()->format('mY'),
        'sequence' => 9002,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'selesai',
        'rating' => 4,
        'completed_at' => now()->subSeconds(30),
        'rated_at' => now(),
        'assigned_to' => $operator->id,
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'response',
        'message' => 'ok',
        'sent_at' => now()->subSeconds(60),
    ]);

    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.9',
        'created_at' => now()->subSeconds(60),
    ]);

    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.9',
    ]);

    $request = Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.9']);

    app(AuditFlagDetector::class)->detect($ticket, $completionLog, $request);
    app(AuditFlagDetector::class)->detect($ticket, $completionLog, $request);

    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', 'rating_cepat')->count())->toBe(0)
        ->and(AuditFlag::where('ticket_id', $ticket->id)->where('type', 'selesai_cepat_setelah_balasan')->count())->toBe(1);
});
