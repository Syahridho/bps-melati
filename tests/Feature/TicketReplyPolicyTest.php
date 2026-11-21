<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makePolicyTicket(array $overrides = []): Ticket
{
    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    static $sequence = 0;
    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
        'period' => '2026-11',
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'channel_id' => $channel->id,
        'content' => 'Laporan untuk pengujian kebijakan balasan tiket.',
        'status' => 'baru',
        'assignment_mode' => 'free',
    ], $overrides));
}

test('admin can always reply', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $pic = User::factory()->create(['role' => 'operator']);

    $ticket = makePolicyTicket([
        'assignment_mode' => 'claim',
        'assigned_to' => $pic->id,
        'assigned_at' => now(),
    ]);

    expect($admin->can('reply', $ticket))->toBeTrue();
});

test('operator who is the pic can reply', function () {
    $pic = User::factory()->create(['role' => 'operator']);
    $ticket = makePolicyTicket([
        'assignment_mode' => 'claim',
        'assigned_to' => $pic->id,
        'assigned_at' => now(),
    ]);

    expect($pic->can('reply', $ticket))->toBeTrue();
});

test('operator who is not the pic cannot reply', function () {
    $pic = User::factory()->create(['role' => 'operator']);
    $other = User::factory()->create(['role' => 'operator']);
    $ticket = makePolicyTicket([
        'assignment_mode' => 'claim',
        'assigned_to' => $pic->id,
        'assigned_at' => now(),
    ]);

    expect($other->can('reply', $ticket))->toBeFalse();
});

test('free ticket without pic can be replied by any operator', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makePolicyTicket(['assignment_mode' => 'free']);

    expect($operator->can('reply', $ticket))->toBeTrue();
});

test('claim ticket without pic cannot be replied before claiming', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makePolicyTicket(['assignment_mode' => 'claim']);

    expect($operator->can('reply', $ticket))->toBeFalse()
        ->and($operator->can('claim', $ticket))->toBeTrue();
});

test('round robin ticket without pic can be replied by any operator', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makePolicyTicket(['assignment_mode' => 'round_robin']);

    expect($operator->can('reply', $ticket))->toBeTrue();
});

test('operator tim cannot reply', function () {
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    $active = makePolicyTicket(['assignment_mode' => 'free']);

    expect($operatorTim->can('reply', $active))->toBeFalse();
});

test('non pic operator is rejected by the response endpoint', function () {
    $pic = User::factory()->create(['role' => 'operator']);
    $other = User::factory()->create(['role' => 'operator']);

    $ticket = makePolicyTicket([
        'assignment_mode' => 'claim',
        'assigned_to' => $pic->id,
        'assigned_at' => now(),
    ]);

    $this->actingAs($other)
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Percobaan membalas tiket milik operator lain.',
        ])
        ->assertForbidden();

    expect($ticket->responses()->count())->toBe(0);
});
