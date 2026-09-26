<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

/**
 * @return array{parent: Channel, child: Channel}
 */
function seedChannelTree(): array
{
    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosial-media',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $child = Channel::create([
        'name' => 'Instagram',
        'slug' => 'sosial-media-instagram',
        'parent_id' => $parent->id,
        'sort_order' => 1,
        'is_active' => true,
    ]);

    return ['parent' => $parent, 'child' => $child];
}

function createTicket(array $attributes = []): Ticket
{
    static $sequence = 0;

    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('L-1400/092026/%04d', $sequence),
        'period' => now()->format('Y-m'),
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ], $attributes));
}

function rekapUrl(): string
{
    return route('dashboard.admin.rekap-bulanan.index', absolute: false);
}

it('renders the monthly recap for an admin', function () {
    actingAs(User::factory()->admin()->create())
        ->get(rekapUrl())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/bulanan')
            ->has('rows')
            ->has('totals')
            ->has('periods')
        );
});

it('blocks operators from the monthly recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(rekapUrl())
        ->assertForbidden();
});

it('splits pengaduan by service type and counts every classification', function () {
    $channel = seedChannelTree()['child'];

    createTicket(['channel_id' => $channel->id, 'classification' => 'pengaduan', 'service_type' => 'pst']);
    createTicket(['channel_id' => $channel->id, 'classification' => 'pengaduan', 'service_type' => 'pst']);
    createTicket(['channel_id' => $channel->id, 'classification' => 'pengaduan', 'service_type' => 'lainnya']);
    createTicket(['channel_id' => $channel->id, 'classification' => 'aspirasi', 'service_type' => null, 'satuan_tugas' => 'Statistik']);
    createTicket(['channel_id' => $channel->id, 'classification' => 'permintaan_informasi', 'service_type' => null]);

    actingAs(User::factory()->admin()->create())
        ->get(rekapUrl())
        ->assertInertia(fn (Assert $page) => $page
            ->where('totals.pengaduan_pst', 2)
            ->where('totals.pengaduan_lainnya', 1)
            ->where('totals.aspirasi', 1)
            ->where('totals.permintaan_informasi', 1)
            ->where('totals.jumlah', 5)
        );
});

it('aggregates a child channel into its own row and not the parent', function () {
    ['parent' => $parent, 'child' => $child] = seedChannelTree();

    createTicket(['channel_id' => $child->id]);

    actingAs(User::factory()->admin()->create())
        ->get(rekapUrl())
        ->assertInertia(fn (Assert $page) => $page
            ->where('rows.0.channel', 'Sosial Media')
            ->where('rows.0.jumlah', 0)
            ->where('rows.0.children.0.channel', 'Instagram')
            ->where('rows.0.children.0.jumlah', 1)
        );
});

it('renders the print view with the letterhead and signatory from settings', function () {
    DB::table('settings')->updateOrInsert(
        ['key' => 'nama_penanda_tangan'],
        ['value' => 'Budi Santoso', 'created_at' => now(), 'updated_at' => now()],
    );

    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-bulanan.print', absolute: false))
        ->assertOk()
        ->assertSee('logo-bps.webp')
        ->assertSee('Badan Pusat Statistik')
        ->assertSee('Provinsi Riau')
        ->assertSee('KETUA TIM PENGADUAN')
        ->assertSee('Budi Santoso');
});

it('blocks operators from the printable recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(route('dashboard.admin.rekap-bulanan.print', absolute: false))
        ->assertForbidden();
});

it('invalidates the recap cache when a ticket is created', function () {
    $channel = seedChannelTree()['child'];
    $admin = User::factory()->admin()->create();

    createTicket(['channel_id' => $channel->id]);

    actingAs($admin)
        ->get(rekapUrl())
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 1));

    createTicket(['channel_id' => $channel->id]);

    actingAs($admin)
        ->get(rekapUrl())
        ->assertInertia(fn (Assert $page) => $page->where('totals.jumlah', 2));
});
