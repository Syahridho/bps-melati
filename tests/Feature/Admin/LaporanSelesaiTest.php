<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    $updatedAt = $attributes['updated_at'] ?? now();
    unset($attributes['updated_at']);

    $ticket = Ticket::create(array_merge([
        'ticket_number' => sprintf('L-1400/102026/%04d', $sequence),
        'period' => '2026-10',
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'title' => 'Laporan selesai',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan selesai untuk pengujian filter.',
        'status' => 'selesai',
        'source_app' => 'web',
        'completed_at' => now(),
    ], $attributes));

    DB::table('tickets')->where('id', $ticket->id)->update(['updated_at' => $updatedAt]);

    return $ticket->fresh();
}

it('defaults date range to current month', function () {
    $currentFrom = now('Asia/Jakarta')->startOfMonth()->toDateString();
    $currentTo = now('Asia/Jakarta')->endOfMonth()->toDateString();

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-selesai')
            ->where('filters.from', $currentFrom)
            ->where('filters.to', $currentTo)
        );
});

it('filters completed tickets by date range including last day without truncation', function () {
    $targetDate = '2026-10-15';

    selesaiTicket([
        'ticket_number' => 'TICK-001',
        'title' => 'Tiket Tanggal 15',
        'updated_at' => '2026-10-15 23:59:59',
    ]);

    selesaiTicket([
        'ticket_number' => 'TICK-002',
        'title' => 'Tiket Diluar Rentang',
        'updated_at' => '2026-10-20 10:00:00',
    ]);

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', [
            'from' => $targetDate,
            'to' => $targetDate,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket Tanggal 15')
        );
});

it('supports all time filter when from is semua', function () {
    selesaiTicket([
        'ticket_number' => 'OLD-001',
        'title' => 'Tiket Lama',
        'updated_at' => '2025-01-01 10:00:00',
    ]);

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', [
            'from' => 'semua',
            'to' => 'semua',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.from', 'semua')
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
        );
});

it('corrects invalid date range where to < from', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', [
            'from' => '2026-10-20',
            'to' => '2026-10-10',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.from', '2026-10-20')
            ->where('filters.to', '2026-10-20')
        );
});

it('calculates counts matching active date range and search', function () {
    selesaiTicket([
        'ticket_number' => 'MATCH-001',
        'classification' => 'pengaduan',
        'status' => 'selesai',
        'title' => 'Laporan Pengaduan',
        'updated_at' => '2026-10-10 10:00:00',
    ]);

    selesaiTicket([
        'ticket_number' => 'MATCH-002',
        'classification' => 'aspirasi',
        'status' => 'respon_awal',
        'title' => 'Laporan Aspirasi',
        'updated_at' => '2026-10-11 10:00:00',
    ]);

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.laporan-selesai.index', [
            'from' => '2026-10-01',
            'to' => '2026-10-31',
            'tab' => 'pengaduan',
            'q' => 'Pengaduan',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 0)
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
        );
});
