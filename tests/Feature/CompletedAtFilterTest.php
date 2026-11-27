<?php

use App\Enums\UserRole;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;

uses(RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow();
});

function createSelesaiTicket(Channel $channel, array $overrides = []): Ticket
{
    static $seq = 1;

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/CAT'.sprintf('%03d', $seq++),
        'period' => '2026-11',
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'title' => 'Tiket Selesai '.$seq,
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'content' => 'Isi laporan selesai.',
        'status' => 'selesai',
        'completed_at' => now('Asia/Jakarta'),
        'source_app' => 'web',
    ], $overrides));
}

test('completed ticket from last month rated today does not appear in this month filter', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::create(2026, 11, 15, 10, 0, 0, 'Asia/Jakarta'));

    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create(['name' => 'Website', 'slug' => 'web-cat-1', 'sort_order' => 1, 'is_active' => true]);

    $lastMonthTicket = createSelesaiTicket($channel, [
        'title' => 'Tiket Bulan Lalu',
        'completed_at' => Carbon::create(2026, 10, 20, 14, 0, 0, 'Asia/Jakarta'),
    ]);

    $thisMonthTicket = createSelesaiTicket($channel, [
        'title' => 'Tiket Bulan Ini',
        'completed_at' => Carbon::create(2026, 11, 5, 9, 0, 0, 'Asia/Jakarta'),
    ]);

    // Pelapor memberi rating hari ini (mengubah updated_at menjadi 2026-11-15)
    $lastMonthTicket->update([
        'rating' => 5,
        'rated_at' => now('Asia/Jakarta'),
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.id', $thisMonthTicket->id)
        );
});

test('flagging or pengawasan change does not alter completed_at order and tie-breaker is id desc', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::create(2026, 11, 15, 10, 0, 0, 'Asia/Jakarta'));

    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create(['name' => 'Website', 'slug' => 'web-cat-2', 'sort_order' => 1, 'is_active' => true]);

    $sameTime = Carbon::create(2026, 11, 10, 12, 0, 0, 'Asia/Jakarta');
    $older = createSelesaiTicket($channel, ['completed_at' => Carbon::create(2026, 11, 5, 8, 0, 0, 'Asia/Jakarta')]);
    $sameFirst = createSelesaiTicket($channel, ['completed_at' => $sameTime]);
    $sameSecond = createSelesaiTicket($channel, ['completed_at' => $sameTime]);

    // Tandai & aktifkan pengawasan pada tiket paling lama hari ini
    $older->update([
        'is_flagged' => true,
        'flagged_at' => now('Asia/Jakarta'),
        'flagged_by' => $admin->id,
        'is_pengawasan' => true,
        'pengawasan_at' => now('Asia/Jakarta'),
        'pengawasan_by' => $admin->id,
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 3)
            ->where('counts.ditandai', 1)
            ->where('counts.berkadar_pengawasan', 1)
            ->where('tickets.data.0.id', $sameSecond->id)
            ->where('tickets.data.1.id', $sameFirst->id)
            ->where('tickets.data.2.id', $older->id)
        );
});

test('date range is inclusive of 00:00:00 and 23:59:59 Asia/Jakarta and null completed_at uses fallback', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::create(2026, 11, 15, 10, 0, 0, 'Asia/Jakarta'));

    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create(['name' => 'Website', 'slug' => 'web-cat-3', 'sort_order' => 1, 'is_active' => true]);

    $startEdge = createSelesaiTicket($channel, ['completed_at' => '2026-11-10 00:00:00']);
    $endEdge = createSelesaiTicket($channel, ['completed_at' => '2026-11-12 23:59:59']);
    createSelesaiTicket($channel, ['completed_at' => '2026-11-09 23:59:59']);
    createSelesaiTicket($channel, ['completed_at' => '2026-11-13 00:00:00']);

    // Tiket lama dengan completed_at NULL namun updated_at masuk rentang
    $nullFallback = createSelesaiTicket($channel, ['completed_at' => null]);
    DB::table('tickets')->where('id', $nullFallback->id)->update([
        'completed_at' => null,
        'updated_at' => '2026-11-11 15:30:00',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.completed-reports.index', [
            'from' => '2026-11-10',
            'to' => '2026-11-12',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 3)
            ->has('tickets.data', 3)
            ->where('tickets.data.0.id', $endEdge->id)
            ->where('tickets.data.1.id', $nullFallback->id)
            ->where('tickets.data.2.id', $startEdge->id)
        );
});

test('operator tim cannot access completed reports index', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    actingAs($operatorTim)
        ->get(route('dashboard.operator.completed-reports.index'))
        ->assertForbidden();
});

test('backfill completed_at dry-run does not modify data and force fills only null completed_at', function () {
    Carbon::setTestNow(Carbon::create(2026, 11, 15, 10, 0, 0, 'Asia/Jakarta'));
    $channel = Channel::create(['name' => 'Website', 'slug' => 'web-cat-4', 'sort_order' => 1, 'is_active' => true]);

    $existingTime = Carbon::create(2026, 10, 1, 9, 0, 0, 'Asia/Jakarta');
    $withCompletedAt = createSelesaiTicket($channel, ['completed_at' => $existingTime]);
    $withoutCompletedAt = createSelesaiTicket($channel, ['completed_at' => null]);
    DB::table('tickets')->where('id', $withoutCompletedAt->id)->update([
        'completed_at' => null,
        'updated_at' => '2026-10-15 11:22:33',
    ]);

    // Dry-run (default)
    artisan('tickets:backfill-completed-at')->assertExitCode(0);
    expect($withoutCompletedAt->fresh()->completed_at)->toBeNull();
    expect($withCompletedAt->fresh()->completed_at->toDateTimeString())->toBe($existingTime->toDateTimeString());

    // Force
    artisan('tickets:backfill-completed-at --force')->assertExitCode(0);
    expect($withoutCompletedAt->fresh()->completed_at->toDateTimeString())->toBe('2026-10-15 11:22:33');
    expect($withCompletedAt->fresh()->completed_at->toDateTimeString())->toBe($existingTime->toDateTimeString());
});
