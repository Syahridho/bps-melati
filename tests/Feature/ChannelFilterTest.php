<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function makeChannelFilterTicket(Channel $channel, array $overrides = []): Ticket
{
    static $sequence = 1;

    return Ticket::create(array_merge([
        'ticket_number' => 'CHF-'.sprintf('%04d', $sequence++),
        'period' => now()->format('Y-m'),
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'title' => 'Tiket kanal '.$channel->name,
        'channel_id' => $channel->id,
        'content' => 'Isi laporan untuk pengujian filter kanal',
        'status' => 'baru',
        'source_app' => 'web',
    ], $overrides));
}

function makeChannelFilterTree(): array
{
    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosmed-filter-test',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $instagram = Channel::create([
        'name' => 'Instagram',
        'slug' => 'instagram-filter-test',
        'parent_id' => $parent->id,
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $youtube = Channel::create([
        'name' => 'YouTube',
        'slug' => 'youtube-filter-test',
        'parent_id' => $parent->id,
        'sort_order' => 2,
        'is_active' => true,
    ]);

    $website = Channel::create([
        'name' => 'Website',
        'slug' => 'website-filter-test',
        'sort_order' => 2,
        'is_active' => true,
    ]);

    return [$parent, $instagram, $youtube, $website];
}

test('input-data filters by a single channel and updates tab counts', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['source_app' => 'admin', 'classification' => 'pengaduan']);
    makeChannelFilterTicket($youtube, ['source_app' => 'admin', 'classification' => 'aspirasi']);
    makeChannelFilterTicket($website, ['source_app' => 'admin', 'classification' => 'aspirasi']);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['channels' => [$instagram->id]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/input-data/index')
            ->where('filters.channels', [$instagram->id])
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 0)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket kanal Instagram')
        );
});

test('input-data parent channel includes all children without duplication', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [$parent, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['source_app' => 'admin']);
    makeChannelFilterTicket($youtube, ['source_app' => 'admin']);
    makeChannelFilterTicket($website, ['source_app' => 'admin']);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['channels' => [$parent->id]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.channels', [$parent->id])
            ->where('counts.semua', 2)
            ->has('tickets.data', 2)
        );
});

test('incoming reports combines channel filter with tab filter and counts', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [$parent, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['classification' => 'pengaduan']);
    makeChannelFilterTicket($youtube, ['classification' => 'aspirasi']);
    makeChannelFilterTicket($website, ['classification' => 'pengaduan']);

    actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index', [
            'channels' => [$parent->id],
            'tab' => 'aspirasi',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/incoming-reports/index')
            ->where('filters.channels', [$parent->id])
            ->where('filters.filter', 'aspirasi')
            ->where('counts.semua', 2)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket kanal YouTube')
        );
});

test('invalid channel ids are ignored', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['source_app' => 'admin']);
    makeChannelFilterTicket($youtube, ['source_app' => 'admin']);
    makeChannelFilterTicket($website, ['source_app' => 'admin']);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['channels' => [999999]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.channels', [])
            ->where('counts.semua', 3)
            ->has('tickets.data', 3)
        );
});

test('channel tree only contains active channels ordered by sort order', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [$parent, $instagram, $youtube, $website] = makeChannelFilterTree();

    $inactive = Channel::create([
        'name' => 'Kanal Nonaktif',
        'slug' => 'inactive-filter-test',
        'sort_order' => 3,
        'is_active' => false,
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('channels', function ($channels) use ($parent, $instagram, $youtube, $inactive) {
                $collection = collect($channels);
                $parentNode = $collection->firstWhere('id', $parent->id);

                return $parentNode !== null
                    && collect($parentNode['children'])->pluck('id')->all() === [$instagram->id, $youtube->id]
                    && ! $collection->pluck('id')->contains($inactive->id);
            })
        );

    expect($inactive->is_active)->toBeFalse();
});

test('completed reports filters by a single channel and updates tab counts', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['status' => 'selesai', 'classification' => 'pengaduan']);
    makeChannelFilterTicket($youtube, ['status' => 'selesai', 'classification' => 'aspirasi']);
    makeChannelFilterTicket($website, ['status' => 'selesai', 'classification' => 'aspirasi']);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index', ['channels' => [$instagram->id]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/completed-reports/index')
            ->where('filters.channels', [$instagram->id])
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 0)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket kanal Instagram')
            ->has('channels')
        );
});

test('completed reports parent channel includes all children without duplication', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [$parent, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['status' => 'selesai']);
    makeChannelFilterTicket($youtube, ['status' => 'selesai']);
    makeChannelFilterTicket($website, ['status' => 'selesai']);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index', ['channels' => [$parent->id]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.channels', [$parent->id])
            ->where('counts.semua', 2)
            ->has('tickets.data', 2)
        );
});

test('completed reports combines multiple channels with date range and tab filter', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [, $instagram, $youtube, $website] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['status' => 'selesai', 'classification' => 'pengaduan']);
    makeChannelFilterTicket($youtube, ['status' => 'selesai', 'classification' => 'aspirasi']);
    $oldWebsiteTicket = makeChannelFilterTicket($website, ['status' => 'selesai', 'classification' => 'aspirasi']);
    $oldWebsiteTicket->forceFill(['updated_at' => now()->subMonths(2)])->saveQuietly();

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index', [
            'channels' => [$instagram->id, $website->id],
            'tab' => 'pengaduan',
            'from' => now()->startOfMonth()->toDateString(),
            'to' => now()->endOfMonth()->toDateString(),
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.channels', [$instagram->id, $website->id])
            ->where('filters.filter', 'pengaduan')
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 0)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket kanal Instagram')
        );
});

test('operator can filter completed reports by channel and operator_tim is forbidden', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    [, $instagram, $youtube] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['status' => 'selesai', 'classification' => 'pengaduan']);
    makeChannelFilterTicket($youtube, ['status' => 'selesai', 'classification' => 'aspirasi']);

    actingAs($operator)
        ->get(route('dashboard.operator.completed-reports.index', ['channels' => [$youtube->id]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator/completed-reports/index')
            ->where('filters.channels', [$youtube->id])
            ->where('counts.semua', 1)
            ->where('counts.aspirasi', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket kanal YouTube')
        );

    actingAs($operatorTim)
        ->get(route('dashboard.operator.completed-reports.index', ['channels' => [$youtube->id]]))
        ->assertForbidden();
});

test('completed reports ignores invalid channel ids', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    [, $instagram, $youtube] = makeChannelFilterTree();

    makeChannelFilterTicket($instagram, ['status' => 'selesai']);
    makeChannelFilterTicket($youtube, ['status' => 'selesai']);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index', ['channels' => [999999]]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.channels', [])
            ->where('counts.semua', 2)
            ->has('tickets.data', 2)
        );
});
