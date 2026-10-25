<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createFlagTestTicket(Channel $channel, array $attributes = []): Ticket
{
    static $seq = 0;
    $seq++;

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('L-FLAG/102026/%04d', $seq),
        'period' => '2026-10',
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'title' => 'Flag test ticket',
        'channel_id' => $channel->id,
        'content' => 'Test content.',
        'status' => 'selesai',
        'source_app' => 'web',
        'completed_at' => now(),
    ], $attributes));
}

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'is_active' => true],
    );
    $this->admin = User::factory()->create(['role' => 'admin']);
    $this->operator = User::factory()->create(['role' => 'operator']);
    $this->ticket = createFlagTestTicket($this->channel);
});

test('admin can flag a ticket', function () {
    $this->actingAs($this->admin)
        ->patchJson(route('dashboard.admin.laporan-selesai.tandai', $this->ticket->ticket_number), [
            'aktif' => true,
            'note' => 'Sulit dijawab',
        ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'is_flagged' => true,
            'flag_note' => 'Sulit dijawab',
        ]);

    $this->ticket->refresh();
    expect($this->ticket->is_flagged)->toBeTrue();
    expect($this->ticket->flag_note)->toBe('Sulit dijawab');
    expect($this->ticket->flagged_by)->toBe($this->admin->id);
});

test('admin can unflag a ticket', function () {
    $this->ticket->update([
        'is_flagged' => true,
        'flagged_at' => now(),
        'flagged_by' => $this->admin->id,
        'flag_note' => 'test',
    ]);

    $this->actingAs($this->admin)
        ->patchJson(route('dashboard.admin.laporan-selesai.tandai', $this->ticket->ticket_number), [
            'aktif' => false,
        ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'is_flagged' => false,
        ]);

    $this->ticket->refresh();
    expect($this->ticket->is_flagged)->toBeFalse();
    expect($this->ticket->flag_note)->toBeNull();
});

test('operator can flag a ticket', function () {
    $this->actingAs($this->operator)
        ->patchJson(route('dashboard.operator.laporan-selesai.tandai', $this->ticket->ticket_number), [
            'aktif' => true,
        ])
        ->assertOk()
        ->assertJson(['success' => true, 'is_flagged' => true]);
});

test('flag creates system response', function () {
    $this->actingAs($this->admin)
        ->patchJson(route('dashboard.admin.laporan-selesai.tandai', $this->ticket->ticket_number), [
            'aktif' => true,
            'note' => 'Perlu koordinasi',
        ])
        ->assertOk();

    $response = $this->ticket->responses()->latest()->first();
    expect($response)->not->toBeNull();
    expect($response->is_system)->toBeTruthy();
    expect($response->message)->toContain('ditandai');
    expect($response->message)->toContain('Perlu koordinasi');
});

test('note max 255 validated', function () {
    $this->actingAs($this->admin)
        ->patchJson(route('dashboard.admin.laporan-selesai.tandai', $this->ticket->ticket_number), [
            'aktif' => true,
            'note' => str_repeat('x', 256),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('note');
});

test('unauthenticated user cannot flag', function () {
    $this->patchJson(route('dashboard.admin.laporan-selesai.tandai', $this->ticket->ticket_number), [
        'aktif' => true,
    ])->assertUnauthorized();
});

test('ditandai filter works in index', function () {
    $flagged = createFlagTestTicket($this->channel, [
        'is_flagged' => true,
        'flagged_at' => now(),
        'flagged_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-selesai.index', ['tab' => 'ditandai', 'from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/laporan-selesai')
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $flagged->ticket_number)
        );
});

test('counts include ditandai', function () {
    createFlagTestTicket($this->channel, [
        'is_flagged' => true,
        'flagged_at' => now(),
        'flagged_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-selesai.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('counts.ditandai', 1)
        );
});
