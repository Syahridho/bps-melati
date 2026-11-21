<?php

use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeClaimTicket(array $overrides = []): Ticket
{
    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/'.fake()->unique()->numerify('9###'),
        'period' => '2026-11',
        'sequence' => fake()->unique()->numberBetween(1000, 9000),
        'classification' => 'pengaduan',
        'channel_id' => $channel->id,
        'content' => 'Laporan untuk pengujian klaim tiket.',
        'status' => 'baru',
        'assignment_mode' => 'claim',
    ], $overrides));
}

beforeEach(function () {
    Setting::set('assignment_mode', 'claim');
});

test('operator can claim a ticket and becomes pic', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makeClaimTicket();

    $this->actingAs($operator)
        ->post(route('dashboard.operator.incoming-reports.claim', $ticket))
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    $ticket->refresh();

    expect($ticket->assigned_to)->toBe($operator->id)
        ->and($ticket->assigned_at)->not->toBeNull();

    $this->assertDatabaseHas('ticket_assignment_logs', [
        'ticket_id' => $ticket->id,
        'to_user_id' => $operator->id,
        'action' => 'claimed',
        'performed_by' => $operator->id,
    ]);
});

test('second claim fails atomically and returns 409 for json clients', function () {
    $first = User::factory()->create(['role' => 'operator']);
    $second = User::factory()->create(['role' => 'operator']);
    $ticket = makeClaimTicket();

    $this->actingAs($first)
        ->postJson(route('dashboard.operator.incoming-reports.claim', $ticket))
        ->assertOk();

    $this->actingAs($second)
        ->postJson(route('dashboard.operator.incoming-reports.claim', $ticket))
        ->assertStatus(409)
        ->assertJsonPath('code', 'already_claimed');

    expect($ticket->fresh()->assigned_to)->toBe($first->id);
});

test('claim service rejects a second claim without reading then writing', function () {
    $first = User::factory()->create(['role' => 'operator']);
    $second = User::factory()->create(['role' => 'operator']);
    $ticket = makeClaimTicket();
    $service = app(TicketAssignmentService::class);

    expect($service->claim($ticket, $first))->toBeTrue()
        ->and($service->claim($ticket->fresh(), $second))->toBeFalse();
});

test('admin cannot claim a ticket through the operator endpoint', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $ticket = makeClaimTicket();

    $this->actingAs($admin)
        ->post(route('dashboard.operator.incoming-reports.claim', $ticket))
        ->assertForbidden();

    expect($ticket->fresh()->assigned_to)->toBeNull();
});

test('operator cannot claim a free mode ticket', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makeClaimTicket(['assignment_mode' => 'free']);

    $this->actingAs($operator)
        ->post(route('dashboard.operator.incoming-reports.claim', $ticket))
        ->assertForbidden();
});

test('admin can reassign and release a ticket', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makeClaimTicket(['assigned_to' => $admin->id, 'assigned_at' => now()]);

    $this->actingAs($admin)
        ->post(route('dashboard.admin.incoming-reports.assignment.update', $ticket), [
            'assigned_to' => $operator->id,
            'note' => 'Pindah tugas',
        ])
        ->assertRedirect();

    expect($ticket->fresh()->assigned_to)->toBe($operator->id);

    $this->assertDatabaseHas('ticket_assignment_logs', [
        'ticket_id' => $ticket->id,
        'action' => 'reassigned',
        'from_user_id' => $admin->id,
        'to_user_id' => $operator->id,
    ]);

    $this->actingAs($admin)
        ->delete(route('dashboard.admin.incoming-reports.assignment.destroy', $ticket))
        ->assertRedirect();

    expect($ticket->fresh()->assigned_to)->toBeNull();
    expect($ticket->fresh()->assigned_at)->toBeNull();
});

test('admin cannot assign a ticket to an unavailable operator', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator', 'is_available' => false]);
    $ticket = makeClaimTicket();

    $this->actingAs($admin)
        ->post(route('dashboard.admin.incoming-reports.assignment.update', $ticket), [
            'assigned_to' => $operator->id,
        ])
        ->assertSessionHasErrors('assigned_to');

    expect($ticket->fresh()->assigned_to)->toBeNull();
});
