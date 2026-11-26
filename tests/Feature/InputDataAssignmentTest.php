<?php

use App\Enums\AssignmentMode;
use App\Enums\UserRole;
use App\Events\LaporanChanged;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\TicketAssignmentLog;
use App\Models\User;
use App\Services\TicketAssignmentService;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;

function inputDataAssignmentChannel(): Channel
{
    return Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'is_active' => true]
    );
}

test('operator pembuat input data otomatis menjadi PIC, melewati round robin, tercatat di riwayat, dan dispatch event sekali', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    Setting::set(TicketAssignmentService::SETTING_RR_LAST_USER, null);

    $otherOperator = User::factory()->create([
        'role' => UserRole::Operator,
        'is_active' => true,
        'is_available' => true,
    ]);
    $creator = User::factory()->create([
        'role' => UserRole::Operator,
        'is_active' => true,
        'is_available' => true,
    ]);

    Event::fake([LaporanChanged::class]);

    actingAs($creator)->post(route('dashboard.operator.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Laporan dari operator',
        'content' => 'Isi laporan input data yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Laporan dari operator')->firstOrFail();

    expect($ticket->assigned_to)->toBe($creator->id)
        ->and($ticket->assigned_at)->not->toBeNull()
        ->and($ticket->assignment_mode)->toBe(AssignmentMode::RoundRobin->value)
        ->and(Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBeNull();

    $log = TicketAssignmentLog::where('ticket_id', $ticket->id)->firstOrFail();
    expect($log->action)->toBe(TicketAssignmentLog::ACTION_CREATOR_ASSIGNED)
        ->and($log->to_user_id)->toBe($creator->id)
        ->and($log->performed_by)->toBe($creator->id)
        ->and($log->actionLabel())->toBe('Ditugaskan ke pembuat (Input Data)');

    Event::assertDispatchedTimes(LaporanChanged::class, 1);
    Event::assertDispatched(LaporanChanged::class, fn (LaporanChanged $event) => $event->action === 'created' && $event->ticketId === $ticket->id);

    expect($otherOperator->id)->not->toBe($creator->id);
});

test('admin pembuat input data juga menjadi PIC, melewati round robin, dan tercatat di riwayat', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    Setting::set(TicketAssignmentService::SETTING_RR_LAST_USER, null);

    User::factory()->create([
        'role' => UserRole::Operator,
        'is_active' => true,
        'is_available' => true,
    ]);
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);

    Event::fake([LaporanChanged::class]);

    actingAs($admin)->post(route('dashboard.admin.input-data.store'), [
        'classification' => 'aspirasi',
        'title' => 'Aspirasi dibuat admin',
        'content' => 'Isi aspirasi dari admin yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Aspirasi dibuat admin')->firstOrFail();

    expect($ticket->assigned_to)->toBe($admin->id)
        ->and($ticket->assigned_at)->not->toBeNull()
        ->and(Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBeNull();

    $log = TicketAssignmentLog::where('ticket_id', $ticket->id)->firstOrFail();
    expect($log->action)->toBe(TicketAssignmentLog::ACTION_CREATOR_ASSIGNED)
        ->and($log->to_user_id)->toBe($admin->id)
        ->and($log->performed_by)->toBe($admin->id);

    Event::assertDispatchedTimes(LaporanChanged::class, 1);
});

test('operator tim pembuat input data menjadi PIC dan dapat membalas tiketnya sendiri, sementara non-PIC ditolak', function () {
    Setting::set('assignment_mode', AssignmentMode::Claim->value);

    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $otherOperator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    actingAs($operatorTim)->post(route('dashboard.operator.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Laporan dari operator tim',
        'content' => 'Isi laporan dari operator tim yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Laporan dari operator tim')->firstOrFail();

    expect($ticket->assigned_to)->toBe($operatorTim->id)
        ->and($operatorTim->can('reply', $ticket))->toBeTrue()
        ->and($otherOperator->can('reply', $ticket))->toBeFalse();

    actingAs($operatorTim)
        ->get(route('dashboard.operator.input-data.show', $ticket->ticket_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('can.reply', true)
            ->where('ticket.assigned_to', $operatorTim->id)
            ->where('ticket.assigned_to_name', $operatorTim->name)
        );

    actingAs($operatorTim)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Balasan dari pembuat operator tim.',
        ])
        ->assertRedirect();

    actingAs($otherOperator)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticket), [
            'response_type' => 'respon_substantif',
            'response_message' => 'Percobaan balas oleh operator lain.',
        ])
        ->assertForbidden();

    expect($ticket->responses()->count())->toBe(1);
});

test('jalur website publik tetap memakai round robin', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    Setting::set(TicketAssignmentService::SETTING_RR_LAST_USER, null);

    $operator = User::factory()->create([
        'role' => UserRole::Operator,
        'is_active' => true,
        'is_available' => true,
    ]);

    $this->post(route('tickets.store'), [
        'classification' => 'pengaduan',
        'title' => 'Laporan publik',
        'content' => 'Isi pengaduan publik yang cukup panjang untuk validasi.',
        'reporter_name' => 'Pelapor Publik',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Laporan publik')->firstOrFail();

    expect($ticket->assigned_to)->toBe($operator->id)
        ->and((int) Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBe($operator->id);
});

test('detail input data mengirim props penugasan dan otorisasi sesuai role', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $pic = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $other = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    actingAs($pic)->post(route('dashboard.operator.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Tiket untuk cek detail',
        'content' => 'Isi laporan input data yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Tiket untuk cek detail')->firstOrFail();

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.show', $ticket->ticket_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('can.reply', true)
            ->where('can.reassign', true)
            ->where('can.view_assignment_history', true)
            ->where('ticket.assigned_to', $pic->id)
            ->where('ticket.assigned_to_name', $pic->name)
            ->has('assignmentLogs', 1)
            ->has('assignableOperators', 2)
        );

    actingAs($pic)
        ->get(route('dashboard.operator.input-data.show', $ticket->ticket_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('can.reply', true)
            ->where('can.reassign', false)
            ->where('can.view_assignment_history', false)
            ->where('assignmentLogs', [])
            ->where('assignableOperators', [])
        );

    actingAs($other)
        ->get(route('dashboard.operator.input-data.show', $ticket->ticket_number))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('can.reply', false)
            ->where('can.reassign', false)
        );
});

test('pembatasan balasan: PIC dan admin boleh membalas, operator lain ditolak 403, tiket tanpa PIC tetap bebas', function () {
    Setting::set('assignment_mode', AssignmentMode::Free->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $pic = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $other = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    actingAs($pic)->post(route('dashboard.operator.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Tiket PIC operator',
        'content' => 'Isi laporan input data yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticketWithPic = Ticket::where('title', 'Tiket PIC operator')->firstOrFail();

    // Operator lain ditolak 403
    actingAs($other)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticketWithPic), [
            'response_type' => 'respon_awal',
            'response_message' => 'Percobaan balas oleh operator non-PIC.',
        ])
        ->assertForbidden();

    // PIC boleh membalas
    actingAs($pic)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticketWithPic), [
            'response_type' => 'respon_awal',
            'response_message' => 'Balasan resmi dari PIC tiket.',
        ])
        ->assertRedirect();

    // Admin boleh membalas tiket milik PIC mana pun
    actingAs($admin)
        ->post(route('dashboard.admin.incoming-reports.responses.store', $ticketWithPic), [
            'response_type' => 'respon_substantif',
            'response_message' => 'Balasan lanjutan dari admin.',
        ])
        ->assertRedirect();

    expect($ticketWithPic->responses()->count())->toBe(2);

    // Tiket tanpa PIC (setelah PIC dilepas pada mode free) tetap boleh dibalas operator
    actingAs($admin)->post(route('dashboard.admin.input-data.store'), [
        'classification' => 'aspirasi',
        'title' => 'Tiket tanpa PIC',
        'content' => 'Isi aspirasi tanpa PIC yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $unassignedTicket = Ticket::where('title', 'Tiket tanpa PIC')->firstOrFail();
    actingAs($admin)->delete(route('dashboard.admin.incoming-reports.assignment.destroy', $unassignedTicket))->assertRedirect();

    actingAs($other)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $unassignedTicket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Balasan operator pada tiket tanpa PIC.',
        ])
        ->assertRedirect();

    expect($unassignedTicket->responses()->count())->toBe(1);
});

test('hanya admin yang boleh mengubah atau melepas PIC, dan lepas PIC mengembalikan aturan balasan tanpa PIC', function () {
    Setting::set('assignment_mode', AssignmentMode::Free->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $pic = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $other = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    actingAs($pic)->post(route('dashboard.operator.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Tiket untuk ubah PIC',
        'content' => 'Isi laporan input data yang cukup panjang untuk validasi.',
        'channel_id' => inputDataAssignmentChannel()->id,
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Tiket untuk ubah PIC')->firstOrFail();

    // Operator ditolak 403 saat ubah/lepas PIC
    actingAs($other)
        ->post(route('dashboard.admin.incoming-reports.assignment.update', $ticket), [
            'assigned_to' => $other->id,
        ])
        ->assertForbidden();

    actingAs($pic)
        ->delete(route('dashboard.admin.incoming-reports.assignment.destroy', $ticket))
        ->assertForbidden();

    // Admin mengubah PIC ke operator lain
    actingAs($admin)
        ->post(route('dashboard.admin.incoming-reports.assignment.update', $ticket), [
            'assigned_to' => $other->id,
            'note' => 'Alihkan ke operator pengganti',
        ])
        ->assertRedirect();

    $ticket->refresh();
    expect($ticket->assigned_to)->toBe($other->id);

    // Admin melepas PIC -> kembali tanpa PIC, operator awal boleh membalas lagi
    actingAs($admin)
        ->delete(route('dashboard.admin.incoming-reports.assignment.destroy', $ticket))
        ->assertRedirect();

    $ticket->refresh();
    expect($ticket->assigned_to)->toBeNull()
        ->and(TicketAssignmentLog::where('ticket_id', $ticket->id)->count())->toBe(3);

    actingAs($pic)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Balasan setelah PIC dilepas.',
        ])
        ->assertRedirect();

    expect($ticket->responses()->count())->toBe(1);
});
