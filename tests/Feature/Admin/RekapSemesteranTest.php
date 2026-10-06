<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function semesterChannel(): Channel
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

function semesterTicket(string $period, array $attributes = []): Ticket
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

function semesterUrl(array $query = []): string
{
    return route('dashboard.admin.rekap-semesteran.index', $query, absolute: false);
}

it('renders the semester recap for an admin', function () {
    actingAs(User::factory()->admin()->create())
        ->get(semesterUrl())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/semesteran')
            ->has('rows')
            ->has('totals')
            ->has('months', 6)
            ->has('semesters')
        );
});

it('blocks operators from the semester recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(semesterUrl())
        ->assertForbidden();
});

it('exports the semester recap as an excel spreadsheet', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-semesteran.excel', ['semester' => '2026-1']))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
        ->assertHeader('Content-Disposition', 'attachment; filename="rekap-semesteran-2026-1.xls"');
});

it('labels the six months of the second semester', function () {
    actingAs(User::factory()->admin()->create())
        ->get(semesterUrl(['semester' => '2026-2']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('semester', '2026-2')
            ->where('semesterLabel', 'Semester II (Juli - Desember) 2026')
            ->where('months.0.key', '2026-07')
            ->where('months.0.label', 'Juli')
            ->where('months.5.key', '2026-12')
            ->where('months.5.label', 'Desember')
        );
});

it('aggregates child channel tickets into their own row per month', function () {
    $child = semesterChannel();

    semesterTicket('2026-08', ['channel_id' => $child->id]);
    semesterTicket('2026-08', ['channel_id' => $child->id]);
    semesterTicket('2026-09', ['channel_id' => $child->id]);

    actingAs(User::factory()->admin()->create())
        ->get(semesterUrl(['semester' => '2026-2']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('rows.0.channel', 'Sosial Media')
            ->where('rows.0.jumlah', 0)
            ->where('rows.0.children.0.channel', 'Instagram')
            ->where('rows.0.children.0.perPeriod.2026-08.pengaduan_pst', 2)
            ->where('rows.0.children.0.perPeriod.2026-09.pengaduan_pst', 1)
            ->where('rows.0.children.0.jumlah', 3)
            ->where('totals.jumlah', 3)
        );
});

it('excludes tickets outside the selected semester', function () {
    $child = semesterChannel();

    semesterTicket('2026-06', ['channel_id' => $child->id]);
    semesterTicket('2026-07', ['channel_id' => $child->id]);

    actingAs(User::factory()->admin()->create())
        ->get(semesterUrl(['semester' => '2026-2']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 1));
});

it('renders a landscape print view with the letterhead, month header and signatory', function () {
    DB::table('settings')->updateOrInsert(
        ['key' => 'nama_penanda_tangan'],
        ['value' => 'Budi Santoso', 'created_at' => now(), 'updated_at' => now()],
    );

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-semesteran.print', ['semester' => '2026-2'], absolute: false))
        ->assertOk()
        ->assertSee('logo-bps.webp')
        ->assertSee('Badan Pusat Statistik')
        ->assertSee('Provinsi Riau')
        ->assertSee('A4 landscape')
        ->assertSee('Juli')
        ->assertSee('Desember')
        ->assertSee('KETUA TIM PENGADUAN')
        ->assertSee('Budi Santoso');
});

it('blocks operators from the printable semester recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(route('dashboard.admin.rekap-semesteran.print', absolute: false))
        ->assertForbidden();
});

it('invalidates the semester recap cache when a ticket is created', function () {
    $child = semesterChannel();
    $admin = User::factory()->admin()->create();

    semesterTicket('2026-08', ['channel_id' => $child->id]);

    actingAs($admin)
        ->get(semesterUrl(['semester' => '2026-2']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 1));

    semesterTicket('2026-09', ['channel_id' => $child->id]);

    actingAs($admin)
        ->get(semesterUrl(['semester' => '2026-2']))
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 2));
});
