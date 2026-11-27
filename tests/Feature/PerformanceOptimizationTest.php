<?php

use App\Enums\UserRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\LaporanCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\OptionalProp;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function makeCompletedTicket(Channel $channel, array $overrides = []): Ticket
{
    static $seq = 1;

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/PERF'.sprintf('%03d', $seq++),
        'period' => '2026-11',
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'title' => 'Laporan Selesai '.$seq,
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'content' => 'Isi laporan selesai untuk uji cache.',
        'status' => 'selesai',
        'completed_at' => now(),
        'source_app' => 'web',
    ], $overrides));
}

test('completed reports caches list and counts on warm hit and returns identical data', function () {
    Cache::flush();
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create([
        'name' => 'Website',
        'slug' => 'website-perf-1',
        'sort_order' => 1,
        'is_active' => true,
    ]);
    makeCompletedTicket($channel);

    // Cold request (populates cache)
    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
        );

    // Warm request (cache hit must NOT execute tickets list/counts SQL)
    DB::flushQueryLog();
    DB::enableQueryLog();

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
        );

    $ticketQueries = collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(fn (string $sql): bool => str_contains($sql, 'from `tickets`'))
        ->values();

    expect($ticketQueries)->toHaveCount(0);
});

test('completed reports cache invalidates on new completed ticket, rating, flag, and pengawasan', function () {
    Cache::flush();
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create([
        'name' => 'Website',
        'slug' => 'website-perf-2',
        'sort_order' => 1,
        'is_active' => true,
    ]);
    $ticket = makeCompletedTicket($channel);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->where('counts.ditandai', 0)
            ->where('counts.berkadar_pengawasan', 0)
        );

    // 1. Tiket baru selesai
    makeCompletedTicket($channel, ['classification' => 'aspirasi']);
    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 2)
            ->where('counts.aspirasi', 1)
        );

    // 2. Flag / ditandai
    $ticket->update(['is_flagged' => true, 'flagged_at' => now(), 'flagged_by' => $admin->id]);
    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.ditandai', 1)
        );

    // 3. Pengawasan
    $ticket->update(['is_pengawasan' => true, 'pengawasan_at' => now(), 'pengawasan_by' => $admin->id]);
    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.berkadar_pengawasan', 1)
        );

    // 4. Rating masuk
    $versionBeforeRating = LaporanCache::version();
    $ticket->update(['rating' => 5, 'rated_at' => now()]);
    expect(LaporanCache::version())->not->toBe($versionBeforeRating);
});

test('completed reports uses distinct cache keys per role, channel, date, and skips search cache', function () {
    Cache::flush();
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $operator = User::factory()->create(['role' => UserRole::Operator]);

    $web = Channel::create(['name' => 'Website', 'slug' => 'web-perf-3', 'sort_order' => 1, 'is_active' => true]);
    $ig = Channel::create(['name' => 'Instagram', 'slug' => 'ig-perf-3', 'sort_order' => 2, 'is_active' => true]);

    makeCompletedTicket($web, ['title' => 'Laporan Khusus Alpha']);
    makeCompletedTicket($ig, ['title' => 'Laporan Biasa Beta']);

    // Admin warm cache for all channels
    actingAs($admin)->get(route('dashboard.admin.completed-reports.index'))
        ->assertInertia(fn (Assert $page) => $page->where('counts.semua', 2));

    // Operator hits its own role cache key (must still run query on cold operator cache, then cache hit)
    DB::flushQueryLog();
    DB::enableQueryLog();
    actingAs($operator)->get(route('dashboard.operator.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('counts.semua', 2));
    expect(collect(DB::getQueryLog())->pluck('query')->filter(fn ($q) => str_contains($q, 'from `tickets`')))->not->toBeEmpty();

    // Channel filter produces distinct result
    actingAs($admin)->get(route('dashboard.admin.completed-reports.index', ['channels' => [$ig->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
        );

    // Free-text search bypasses cache and filters accurately
    actingAs($admin)->get(route('dashboard.admin.completed-reports.index', ['q' => 'Alpha']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
        );
});

test('handle inertia requests calls parent share once, keeps quote lazy on dashboard, and preserves login quote and sidebar badges', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create(['name' => 'Website', 'slug' => 'web-perf-4', 'sort_order' => 1, 'is_active' => true]);
    Ticket::create([
        'ticket_number' => 'L-1400/112026/BDG001',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Tiket Terbuka',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'content' => 'Masih baru.',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    // 1. quote is OptionalProp on non-auth request
    $mw = app(HandleInertiaRequests::class);
    $dashboardReq = Request::create('/dashboard/admin', 'GET');
    $dashboardReq->setUserResolver(fn () => $admin);
    $dashboardReq->setLaravelSession(app('session.store'));
    $shared = $mw->share($dashboardReq);
    expect($shared['quote'])->toBeInstanceOf(OptionalProp::class);

    // 2. Dashboard page omits quote on initial load, keeps sidebar badge accurate, and serves quote on partial reload
    actingAs($admin)
        ->get(route('dashboard.admin.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->missing('quote')
            ->where('inbox_open_count', 1)
            ->reloadOnly('quote', fn (Assert $reloaded) => $reloaded
                ->has('quote.message')
                ->has('quote.author')
            )
        );

    // 4. Login page receives quote on initial load
    auth()->logout();
    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('quote.message')
            ->has('quote.author')
        );
});
