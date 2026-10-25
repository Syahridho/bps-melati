<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function periodikChannel(): Channel
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

function periodikTicket(string $period, array $attributes = []): Ticket
{
    static $sequence = 0;

    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('S-1400/%s/%04d', str_replace('-', '', substr($period, 0, 7)), $sequence),
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

function periodikUrl(array $query = []): string
{
    return route('dashboard.admin.rekap-periodik.index', $query, absolute: false);
}

it('renders the periodic recap for an admin', function () {
    actingAs(User::factory()->admin()->create())
        ->get(periodikUrl(['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->has('rows')
            ->has('totals')
            ->has('months', 3)
            ->has('years')
            ->has('monthOptions', 12)
        );
});

it('blocks operators from admin periodic recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(periodikUrl())
        ->assertForbidden();
});

it('redirects old semesteran and tahunan routes to periodic recap', function () {
    actingAs(User::factory()->admin()->create());

    test()->get('/dashboard/admin/rekap-semesteran')
        ->assertRedirect('/dashboard/admin/rekap-periodik');

    test()->get('/dashboard/admin/rekap-tahunan')
        ->assertRedirect('/dashboard/admin/rekap-periodik');
});

it('exports periodic recap to excel', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.ms-excel; charset=utf-8');
});

it('renders periodic print view', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => '2026', 'months' => '1,2,3'], absolute: false))
        ->assertOk()
        ->assertSee('REKAP LAPORAN PERIODIK BPS PROVINSI RIAU');
});
