<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\RekapYears;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function rekapPeriodikUrl(array $query = []): string
{
    return route('dashboard.admin.rekap-periodik.index', $query, absolute: false);
}

it('renders the periodic recap with months up to current month for current year', function () {
    actingAs(User::factory()->admin()->create())
        ->get(rekapPeriodikUrl())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->has('rows')
            ->has('totals')
            ->has('months', 10)
            ->where('dari', '1')
            ->where('sampai', '10')
            ->where('tampilan', 'detail')
        );
});

it('renders 12 months when a past year is requested', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);
    Ticket::create([
        'ticket_number' => 'L-1400/012025/AB01',
        'channel_id' => $channel->id,
        'period' => '2025-01',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Tester',
        'source_app' => 'web',
    ]);
    RekapYears::invalidate();

    actingAs(User::factory()->admin()->create())
        ->get(rekapPeriodikUrl(['year' => 2025]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->has('months', 12)
        );
});

it('filters by custom month range (dari and sampai)', function () {
    actingAs(User::factory()->admin()->create())
        ->get(rekapPeriodikUrl(['dari' => '3', 'sampai' => '6']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->where('dari', '3')
            ->where('sampai', '6')
            ->has('months', 4)
        );
});

it('corrects invalid dari greater than sampai', function () {
    actingAs(User::factory()->admin()->create())
        ->get(rekapPeriodikUrl(['dari' => '8', 'sampai' => '3']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dari', '8')
            ->where('sampai', '8')
            ->has('months', 1)
        );
});

it('renders ringkas view mode correctly', function () {
    actingAs(User::factory()->admin()->create())
        ->get(rekapPeriodikUrl(['tampilan' => 'ringkas']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('tampilan', 'ringkas')
            ->has('ringkasRows')
            ->has('ringkasTotals')
        );
});

it('exports periodic rekap as excel', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);
    Ticket::create([
        'ticket_number' => 'L-1400/012025/AB02',
        'channel_id' => $channel->id,
        'period' => '2025-01',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Tester',
        'source_app' => 'web',
    ]);
    RekapYears::invalidate();

    $response = actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => 2025, 'dari' => 1, 'sampai' => 6]))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');

    expect($response->headers->get('Content-Disposition'))->toMatch('/^attachment; filename="Rekap-Periodik-.+\.xls"$/');
});

it('exports periodic rekap as print view with 1 or 2 pages based on month count', function () {
    $admin = User::factory()->admin()->create();

    // <= 4 months -> 1 page
    actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => 2025, 'dari' => 1, 'sampai' => 4], absolute: false))
        ->assertOk()
        ->assertDontSee('(LANJUTAN)');

    // >= 5 months -> 2 pages
    actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => 2025, 'dari' => 1, 'sampai' => 5], absolute: false))
        ->assertOk()
        ->assertSee('(LANJUTAN)');
});

it('blocks operators from accessing rekap periodik', function () {
    $operator = User::factory()->operator()->create();

    actingAs($operator)
        ->get(rekapPeriodikUrl())
        ->assertForbidden();
});

it('redirects guests to login when accessing rekap periodik', function () {
    $this->get(rekapPeriodikUrl())
        ->assertRedirect(route('login'));
});
