<?php

use App\Actions\AutoCloseTickets;
use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AssignmentModeService;
use App\Services\TicketAssignmentService;
use App\Support\InboxCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('badge: auto assign via round robin creates ticket', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);
    Setting::set(AssignmentModeService::SETTING_KEY, 'round_robin');

    $before = InboxCounter::getAssignedActiveCount($operator);

    $ticket = app(TicketAssignmentService::class)->createTicket([
        'ticket_number' => 'T-8001',
        'period' => now()->format('mY'),
        'sequence' => 8001,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'baru',
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect($ticket)->not->toBeNull();
    expect(InboxCounter::getAssignedActiveCount($operator))->toBeGreaterThanOrEqual($before);
});

test('badge: claim increments laporan saya', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-8002',
        'period' => now()->format('mY'),
        'sequence' => 8002,
        'classification' => 'pengaduan',
        'title' => 'Ticket',
        'content' => 'Content',
        'channel_id' => $channel->id,
        'reporter_name' => 'Reporter',
        'status' => 'baru',
        'assignment_mode' => 'claim',
        'source_app' => 'web',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(0);

    app(TicketAssignmentService::class)->claim($ticket, $operator);

    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(1);
});

test('badge: penutupan oleh pelapor decrements laporan masuk dan laporan saya', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-8003',
        'period' => now()->format('mY'),
        'sequence' => 8003,
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
    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(1);

    $ticket->update(['status' => 'selesai', 'completed_at' => now()]);

    expect(InboxCounter::getCounts()['semua'])->toBe(0);
    expect(InboxCounter::getAssignedActiveCount($operator))->toBe(0);
});

test('badge: audit flag review decrements new count', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $auditLog = AuditLog::create([
        'event_type' => 'test',
        'category' => 'test',
        'severity' => 'info',
    ]);

    $flag = AuditFlag::create([
        'type' => 'jaringan_sama',
        'severity' => 'warning',
        'status' => 'baru',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'tinggi'],
    ]);

    expect(AuditFlag::where('status', 'baru')->count())->toBe(1);

    $flag->update(['status' => 'wajar', 'reviewed_by' => $admin->id, 'reviewed_at' => now()]);
    expect(AuditFlag::where('status', 'baru')->count())->toBe(0);
});

test('badge: auto close closeOne decrements laporan masuk', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-8004',
        'period' => now()->format('mY'),
        'sequence' => 8004,
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

    expect(InboxCounter::getCounts()['semua'])->toBe(1);

    app(AutoCloseTickets::class)->closeOne($ticket->id, 3);

    expect(InboxCounter::getCounts()['semua'])->toBe(0);
});

test('badge: audit flag creation increments new count', function () {
    $auditLog = AuditLog::create([
        'event_type' => 'test',
        'category' => 'test',
        'severity' => 'info',
    ]);

    expect(AuditFlag::where('status', 'baru')->count())->toBe(0);

    AuditFlag::create([
        'type' => 'jaringan_sama',
        'severity' => 'warning',
        'status' => 'baru',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'tinggi'],
    ]);

    expect(AuditFlag::where('status', 'baru')->count())->toBe(1);
});
