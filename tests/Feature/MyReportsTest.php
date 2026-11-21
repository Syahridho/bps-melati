<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketAssignmentService;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function makeMyReportsTicket(array $overrides = []): Ticket
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
        'title' => 'Laporan pengujian Laporan Saya',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan pengujian Laporan Saya.',
        'status' => 'baru',
        'assignment_mode' => 'claim',
        'source_app' => 'web',
    ], $overrides));
}

test('operator only sees active tickets assigned to themselves', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $otherOperator = User::factory()->create(['role' => 'operator']);

    $own = makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'title' => 'Milik Saya']);
    makeMyReportsTicket(['assigned_to' => $otherOperator->id, 'assigned_at' => now(), 'title' => 'Milik Operator Lain']);
    makeMyReportsTicket(['assigned_to' => null, 'title' => 'Tanpa PIC']);
    makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'status' => 'selesai', 'title' => 'Sudah Selesai']);

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator/my-reports/index')
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $own->ticket_number)
            ->where('tickets.data.0.title', 'Milik Saya')
            ->where('counts.semua', 1)
            ->where('my_reports_open_count', 1)
        );
});

test('search and category filters only apply to the operators own tickets', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $otherOperator = User::factory()->create(['role' => 'operator']);

    makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'title' => 'Jalan Rusak Alpha', 'classification' => 'pengaduan']);
    makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'title' => 'Aspirasi Taman', 'classification' => 'aspirasi']);
    makeMyReportsTicket(['assigned_to' => $otherOperator->id, 'assigned_at' => now(), 'title' => 'Jalan Rusak Alpha', 'classification' => 'pengaduan']);

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index', ['q' => 'Alpha']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Jalan Rusak Alpha')
            // counts mengikuti PIC, bukan pencarian
            ->where('counts.semua', 2)
        );

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index', ['tab' => 'aspirasi']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.classification', 'aspirasi')
        );
});

test('date range filter applies to the operators own tickets', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    $old = makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'title' => 'Laporan Lama']);
    $old->forceFill(['created_at' => Carbon::parse('2026-09-10 08:00:00')])->saveQuietly();

    $recent = makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now(), 'title' => 'Laporan Baru']);
    $recent->forceFill(['created_at' => Carbon::parse('2026-11-10 08:00:00')])->saveQuietly();

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index', ['from' => '2026-11-01', 'to' => '2026-11-30']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Laporan Baru')
        );
});

test('admin cannot access my reports and the badge prop stays zero', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);

    makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now()]);

    $this->actingAs($admin)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertForbidden();

    $this->actingAs($admin)
        ->get(route('dashboard.admin.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('my_reports_open_count', 0));
});

test('reassigning a ticket moves it between operator lists', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $first = User::factory()->create(['role' => 'operator']);
    $second = User::factory()->create(['role' => 'operator']);

    $ticket = makeMyReportsTicket(['assigned_to' => $first->id, 'assigned_at' => now()]);

    $this->actingAs($first)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('tickets.data', 1));

    app(TicketAssignmentService::class)->reassign($ticket->fresh(), $second, $admin, 'Pindah tugas');

    $this->actingAs($first)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('tickets.data', 0));

    $this->actingAs($second)
        ->get(route('dashboard.operator.my-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $ticket->ticket_number)
        );
});

test('ownership cannot be changed through request parameters', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $otherOperator = User::factory()->create(['role' => 'operator']);

    makeMyReportsTicket(['assigned_to' => $otherOperator->id, 'assigned_at' => now(), 'title' => 'Rahasia Operator Lain']);

    $this->actingAs($operator)
        ->get(route('dashboard.operator.my-reports.index', ['assigned_to' => $otherOperator->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('tickets.data', 0));
});

test('my reports detail origin enforces ownership and sets the back context', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $otherOperator = User::factory()->create(['role' => 'operator']);

    $own = makeMyReportsTicket(['assigned_to' => $operator->id, 'assigned_at' => now()]);
    $other = makeMyReportsTicket(['assigned_to' => $otherOperator->id, 'assigned_at' => now()]);

    $this->actingAs($operator)
        ->get(route('dashboard.operator.incoming-reports.show', [
            'ticketNumber' => $own->ticket_number,
            'origin' => 'my-reports',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('from', 'my-reports'));

    $this->actingAs($operator)
        ->get(route('dashboard.operator.incoming-reports.show', [
            'ticketNumber' => $other->ticket_number,
            'origin' => 'my-reports',
        ]))
        ->assertNotFound();
});
