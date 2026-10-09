<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function tahunanChannel(): Channel
{
    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosial-media',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    return Channel::create([
        'name' => 'Instagram',
        'slug' => 'sosial-media-instagram',
        'parent_id' => $parent->id,
        'sort_order' => 1,
        'is_active' => true,
    ]);
}

function tahunanTicket(string $period, array $attributes = []): Ticket
{
    static $sequence = 0;

    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('T-1400/%s/%04d', str_replace('-', '', substr($period, 0, 7)), $sequence),
        'period' => $period,
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ], $attributes));
}

function tahunanUrl(array $query = []): string
{
    return route('dashboard.admin.rekap-tahunan.index', $query, absolute: false);
}

it('renders the yearly recap for an admin', function () {
    actingAs(User::factory()->admin()->create())
        ->get(tahunanUrl())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/tahunan')
            ->has('rows')
            ->has('totals')
            ->has('months', 12)
            ->has('years')
        );
});

it('blocks operators from the yearly recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(tahunanUrl())
        ->assertForbidden();
});

it('exports the yearly recap as an excel spreadsheet', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-tahunan.excel', ['year' => '2026']))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
        ->assertHeader('Content-Disposition', 'attachment; filename="rekap-tahunan-2026.xls"');
});

it('labels all twelve months of the year', function () {
    actingAs(User::factory()->admin()->create())
        ->get(tahunanUrl(['year' => '2026']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('year', '2026')
            ->where('yearLabel', 'Tahun 2026')
            ->where('months.0.key', '2026-01')
            ->where('months.0.label', 'Januari')
            ->where('months.11.key', '2026-12')
            ->where('months.11.label', 'Desember')
        );
});

it('aggregates child channel tickets into their own row per month', function () {
    $child = tahunanChannel();

    tahunanTicket('2026-03', ['channel_id' => $child->id]);
    tahunanTicket('2026-03', ['channel_id' => $child->id]);
    tahunanTicket('2026-11', ['channel_id' => $child->id]);

    actingAs(User::factory()->admin()->create())
        ->get(tahunanUrl(['year' => '2026']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('rows.0.channel', 'Sosial Media')
            ->where('rows.0.jumlah', 0)
            ->where('rows.0.children.0.channel', 'Instagram')
            ->where('rows.0.children.0.perPeriod.2026-03.pengaduan_pst', 2)
            ->where('rows.0.children.0.perPeriod.2026-11.pengaduan_pst', 1)
            ->where('rows.0.children.0.jumlah', 3)
            ->where('totals.jumlah', 3)
        );
});

it('excludes tickets outside the selected year', function () {
    $child = tahunanChannel();

    tahunanTicket('2025-12', ['channel_id' => $child->id]);
    tahunanTicket('2026-01', ['channel_id' => $child->id]);

    actingAs(User::factory()->admin()->create())
        ->get(tahunanUrl(['year' => '2026']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 1));
});

it('renders a landscape print view with the letterhead, month header and signatory', function () {
    DB::table('settings')->updateOrInsert(
        ['key' => 'nama_penanda_tangan'],
        ['value' => 'Budi Santoso', 'created_at' => now(), 'updated_at' => now()],
    );

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-tahunan.print', ['year' => '2026'], absolute: false))
        ->assertOk()
        ->assertSee('logo-bps.svg')
        ->assertSee('Badan Pusat Statistik')
        ->assertSee('Provinsi Riau')
        ->assertSee('A4 landscape')
        ->assertSee('Januari')
        ->assertSee('Desember')
        ->assertSee('KETUA TIM PENGADUAN')
        ->assertSee('Budi Santoso');
});

it('blocks operators from the printable yearly recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(route('dashboard.admin.rekap-tahunan.print', absolute: false))
        ->assertForbidden();
});

it('invalidates the yearly recap cache when a ticket is created', function () {
    $child = tahunanChannel();
    $admin = User::factory()->admin()->create();

    tahunanTicket('2026-03', ['channel_id' => $child->id]);

    actingAs($admin)
        ->get(tahunanUrl(['year' => '2026']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 1));

    tahunanTicket('2026-11', ['channel_id' => $child->id]);

    actingAs($admin)
        ->get(tahunanUrl(['year' => '2026']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 2));
});
