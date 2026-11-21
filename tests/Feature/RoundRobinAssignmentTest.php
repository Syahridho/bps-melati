<?php

use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    Setting::set('assignment_mode', 'round_robin');

    $this->service = app(TicketAssignmentService::class);
});

function roundRobinPayload(string $title): array
{
    $channel = Channel::where('slug', 'website')->firstOrFail();

    return [
        'ticket_number' => 'L-1400/112026/'.fake()->unique()->numerify('8###'),
        'period' => '2026-11',
        'sequence' => fake()->unique()->numberBetween(1000, 9000),
        'classification' => 'pengaduan',
        'title' => $title,
        'channel_id' => $channel->id,
        'content' => 'Laporan untuk pengujian round robin.',
        'status' => 'baru',
    ];
}

test('round robin assigns tickets in stable operator order', function () {
    $first = User::factory()->create(['role' => 'operator']);
    $second = User::factory()->create(['role' => 'operator']);
    $third = User::factory()->create(['role' => 'operator']);

    $ticketOne = $this->service->createTicket(roundRobinPayload('Tiket satu'));
    $ticketTwo = $this->service->createTicket(roundRobinPayload('Tiket dua'));
    $ticketThree = $this->service->createTicket(roundRobinPayload('Tiket tiga'));
    $ticketFour = $this->service->createTicket(roundRobinPayload('Tiket empat'));

    expect($ticketOne->assigned_to)->toBe($first->id)
        ->and($ticketTwo->assigned_to)->toBe($second->id)
        ->and($ticketThree->assigned_to)->toBe($third->id)
        ->and($ticketFour->assigned_to)->toBe($first->id);

    $this->assertDatabaseHas('ticket_assignment_logs', [
        'ticket_id' => $ticketOne->id,
        'action' => 'auto_assigned',
        'to_user_id' => $first->id,
    ]);
});

test('round robin skips inactive unavailable soft deleted and non operator users', function () {
    $inactive = User::factory()->create(['role' => 'operator', 'is_active' => false]);
    $unavailable = User::factory()->create(['role' => 'operator', 'is_available' => false]);
    $deleted = User::factory()->create(['role' => 'operator']);
    $deleted->delete();
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    $eligible = User::factory()->create(['role' => 'operator']);

    $ticket = $this->service->createTicket(roundRobinPayload('Tiket dengan kandidat terbatas'));

    expect($ticket->assigned_to)->toBe($eligible->id)
        ->and($ticket->assigned_to)->not->toBe($inactive->id)
        ->and($ticket->assigned_to)->not->toBe($unavailable->id)
        ->and($ticket->assigned_to)->not->toBe($deleted->id)
        ->and($ticket->assigned_to)->not->toBe($operatorTim->id);
});

test('round robin leaves ticket without pic and notifies admin when no operator is eligible', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    User::factory()->create(['role' => 'operator', 'is_active' => false]);
    User::factory()->create(['role' => 'operator', 'is_available' => false]);

    $ticket = $this->service->createTicket(roundRobinPayload('Tiket tanpa operator'));

    expect($ticket->assigned_to)->toBeNull();

    $notification = $admin->notifications()->first();

    expect($notification)->not->toBeNull()
        ->and($notification->data['type'])->toBe('tiket_tanpa_pic');
});

test('public ticket submission follows the active round robin mode', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Laporan publik round robin',
        'service_type' => 'pst',
        'content' => 'Laporan publik untuk pengujian integrasi round robin.',
    ])->assertRedirect();

    $ticket = Ticket::where('title', 'Laporan publik round robin')->firstOrFail();

    expect($ticket->assignment_mode)->toBe('round_robin')
        ->and($ticket->assigned_to)->toBe($operator->id);
});
