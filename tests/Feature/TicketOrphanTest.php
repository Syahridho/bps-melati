<?php

use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function makeOrphanTicket(User $operator, array $overrides = []): Ticket
{
    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/'.fake()->unique()->numerify('6###'),
        'period' => '2026-11',
        'sequence' => fake()->unique()->numberBetween(1000, 9000),
        'classification' => 'pengaduan',
        'channel_id' => $channel->id,
        'content' => 'Tiket aktif milik operator yang akan dinonaktifkan.',
        'status' => 'baru',
        'assignment_mode' => 'claim',
        'assigned_to' => $operator->id,
        'assigned_at' => now(),
    ], $overrides));
}

test('admin is notified and can filter tickets whose pic is no longer active', function () {
    Setting::set('assignment_mode', 'claim');

    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator', 'is_available' => true]);

    $ticket = makeOrphanTicket($operator);

    expect(Ticket::withoutActivePic()->count())->toBe(0);

    $this->actingAs($admin)
        ->put(route('dashboard.admin.operator.update', $operator), [
            'name' => $operator->name,
            'role' => 'operator',
            'email' => $operator->email,
            'is_active' => true,
            'is_available' => false,
        ])
        ->assertRedirect();

    expect($operator->fresh()->is_available)->toBeFalse()
        ->and(Ticket::withoutActivePic()->count())->toBe(1);

    $notification = $admin->notifications()->first();

    expect($notification)->not->toBeNull()
        ->and($notification->data['type'])->toBe('tiket_yatim');

    $this->actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index', ['tab' => 'tanpa_pic']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/incoming-reports/index')
            ->where('tickets.data.0.ticket_number', $ticket->ticket_number)
            ->where('counts.tanpa_pic', 1)
        );
});

test('free mode tickets are not considered orphaned', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    makeOrphanTicket($operator, [
        'assignment_mode' => 'free',
        'assigned_to' => null,
        'assigned_at' => null,
    ]);

    expect(Ticket::withoutActivePic()->count())->toBe(0);
});
