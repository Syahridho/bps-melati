<?php

use App\Events\AuditLogCreated;
use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function makeAuditFlagTicket(string $suffix): Ticket
{
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    return Ticket::create([
        'ticket_number' => 'AUD-BADGE-'.$suffix,
        'period' => now()->format('Y-m'),
        'sequence' => (int) preg_replace('/\D/', '', $suffix) ?: 1,
        'classification' => 'pengaduan',
        'title' => 'Tiket uji badge '.$suffix,
        'content' => 'Isi tiket uji badge audit log.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'source_app' => 'web',
    ]);
}

test('audit_log_badge hanya menghitung penanda berstatus baru dan sama dengan flags-summary', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
    ]);

    $ticketA = makeAuditFlagTicket('101');
    $ticketB = makeAuditFlagTicket('102');

    // Dua penanda 'baru' pada 1 tiket dihitung 1 grup.
    AuditFlag::create([
        'type' => AuditFlag::TYPE_JARINGAN_SAMA,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketA->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => [],
    ]);
    AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_NOTICE,
        'ticket_id' => $ticketA->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => [],
    ]);

    // Status selain 'baru' tidak dihitung.
    AuditFlag::create([
        'type' => AuditFlag::TYPE_JARINGAN_SAMA,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketB->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_DITINJAU,
        'details' => [],
    ]);

    actingAs($admin)
        ->get(route('audit-log.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 1));

    // Tetap 1 meskipun halaman dibuka dengan query filter.
    actingAs($admin)
        ->get(route('audit-log.index', ['severity' => 'warning', 'tab' => 'flags']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 1));

    actingAs($admin)
        ->getJson(route('audit-log.flags-summary'))
        ->assertOk()
        ->assertJsonPath('new_count', 1);
});

test('mengubah status penanda dari baru menurunkan audit_log_badge dan menyiarkan AuditLogCreated', function () {
    Event::fake([AuditLogCreated::class]);

    $admin = User::factory()->create(['role' => 'admin']);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
    ]);
    $ticket = makeAuditFlagTicket('201');

    $flag = AuditFlag::create([
        'type' => AuditFlag::TYPE_JARINGAN_SAMA,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticket->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => [],
    ]);

    actingAs($admin)
        ->get(route('audit-log.index'))
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 1));

    actingAs($admin)
        ->patchJson(route('audit-flag.update', ['flag' => $flag->id]), [
            'status' => AuditFlag::STATUS_TINDAK_LANJUT,
            'note' => 'Sudah ditindaklanjuti pada pengujian.',
        ])
        ->assertOk()
        ->assertJsonPath('new_status', AuditFlag::STATUS_TINDAK_LANJUT);

    Event::assertDispatched(AuditLogCreated::class, function (AuditLogCreated $event): bool {
        return $event->eventType === 'audit.flag_reviewed';
    });

    actingAs($admin)
        ->get(route('audit-log.index'))
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 0));
});

test('hanya admin yang menerima angka audit_log_badge dan bisa mengakses audit-log', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
    ]);

    AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_NOTICE,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => [],
    ]);

    actingAs($operator)
        ->get(route('dashboard.operator.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 0));

    actingAs($operator)
        ->get(route('audit-log.index'))
        ->assertForbidden();
});
