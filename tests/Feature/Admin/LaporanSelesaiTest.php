<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function selesaiTicket(array $attributes = []): Ticket
{
    static $sequence = 0;
    $sequence++;

    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'is_active' => true],
    );

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('L-1400/102026/%04d', $sequence),
        'period' => now()->format('Y-m'),
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'title' => 'Laporan selesai',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan selesai untuk pengujian filter bulanan.',
        'status' => 'selesai',
        'source_app' => 'web',
        'completed_at' => now(),
    ], $attributes));
}

it('defaults the monthly filter to the current period', function () {
    $current = now()->format('Y-m');

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-selesai')
            ->where('filters.period', $current)
            ->has('periods')
            ->where('periods.0.value', $current)
        );
});

it('filters completed tickets by selected month period', function () {
    $current = now()->format('Y-m');
    $previous = now()->subMonth()->format('Y-m');

    selesaiTicket([
        'ticket_number' => 'CUR-001',
        'period' => $current,
        'title' => 'Bulan Ini',
    ]);

    selesaiTicket([
        'ticket_number' => 'PREV-001',
        'period' => $previous,
        'sequence' => 99,
        'title' => 'Bulan Lalu',
    ]);

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', ['period' => $previous]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.period', $previous)
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Bulan Lalu')
        );
});

it('falls back to the current period when the query value is invalid', function () {
    $current = now()->format('Y-m');

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', ['period' => 'bukan-bulan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.period', $current)
        );
});
