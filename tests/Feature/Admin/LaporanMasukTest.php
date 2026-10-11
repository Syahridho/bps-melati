<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\InboxCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('laporan masuk excludes tickets created via input data (source_app admin)', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    // Public ticket
    Ticket::create([
        'ticket_number' => 'PUB-001',
        'period' => now()->format('Y-m'),
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Laporan dari Publik',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan dari publik',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    // Admin input-data ticket
    Ticket::create([
        'ticket_number' => 'ADM-001',
        'period' => now()->format('Y-m'),
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Laporan dari Input Data Admin',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan input manual admin',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Laporan dari Publik')
        );
});

test('counts and inbox_open_count increment when a new ticket is created', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $res1 = actingAs($admin)->get(route('dashboard.admin.laporan-masuk.index'));
    $res1->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 0)
            ->where('counts.pengaduan', 0)
            ->where('counts.belum_dibaca', 0)
            ->where('inbox_open_count', 0)
        );

    Ticket::create([
        'ticket_number' => 'PUB-101',
        'period' => now()->format('Y-m'),
        'sequence' => 101,
        'classification' => 'pengaduan',
        'title' => 'Pengaduan Baru',
        'channel_id' => $channel->id,
        'content' => 'Isi keluhan warga',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    $res2 = actingAs($admin)->get(route('dashboard.admin.laporan-masuk.index'));
    $res2->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->where('counts.pengaduan', 1)
            ->where('counts.belum_dibaca', 1)
            ->where('inbox_open_count', 1)
        );
});

test('sidebar inbox_open_count matches counts.semua and counts.semua matches unfiltered total', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    // Unread ticket
    Ticket::create([
        'ticket_number' => 'PUB-201',
        'period' => now()->format('Y-m'),
        'sequence' => 201,
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Belum Dibaca',
        'channel_id' => $channel->id,
        'content' => 'Aspirasi warga',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    // Read ticket
    Ticket::create([
        'ticket_number' => 'PUB-202',
        'period' => now()->format('Y-m'),
        'sequence' => 202,
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Sudah Dibaca',
        'channel_id' => $channel->id,
        'content' => 'Aspirasi lainnya',
        'status' => 'respon_awal',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    // Selesai ticket (should not be counted in laporan-masuk)
    Ticket::create([
        'ticket_number' => 'PUB-203',
        'period' => now()->format('Y-m'),
        'sequence' => 203,
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Selesai',
        'channel_id' => $channel->id,
        'content' => 'Sudah selesai',
        'status' => 'selesai',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 2)
            ->where('counts.belum_dibaca', 1)
            ->where('inbox_open_count', 2)
            ->has('tickets.data', 2)
        );
});

test('completing a ticket decreases badge while marking read does not change badge', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    // Buat 3 tiket belum selesai
    $ticket1 = Ticket::create([
        'ticket_number' => 'PUB-501',
        'period' => now()->format('Y-m'),
        'sequence' => 501,
        'classification' => 'pengaduan',
        'title' => 'Tiket 1',
        'channel_id' => $channel->id,
        'content' => 'Konten 1',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    $ticket2 = Ticket::create([
        'ticket_number' => 'PUB-502',
        'period' => now()->format('Y-m'),
        'sequence' => 502,
        'classification' => 'aspirasi',
        'title' => 'Tiket 2',
        'channel_id' => $channel->id,
        'content' => 'Konten 2',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    $ticket3 = Ticket::create([
        'ticket_number' => 'PUB-503',
        'period' => now()->format('Y-m'),
        'sequence' => 503,
        'classification' => 'permintaan_informasi',
        'title' => 'Tiket 3',
        'channel_id' => $channel->id,
        'content' => 'Konten 3',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    // Selesaikan 1 tiket
    $ticket3->update(['status' => 'selesai', 'completed_at' => now()]);

    // Cek: badge (inbox_open_count) = 2 dan counts.semua = 2
    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 2)
            ->where('inbox_open_count', 2)
            ->where('counts.belum_dibaca', 2)
            ->has('tickets.data', 2)
        );

    // Tandai tiket 1 sebagai dibaca (membuka detail tiket)
    $ticket1->update(['is_read' => true]);

    // Badge (inbox_open_count) tetap 2, counts.belum_dibaca berkurang jadi 1
    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 2)
            ->where('inbox_open_count', 2)
            ->where('counts.belum_dibaca', 1)
            ->has('tickets.data', 2)
        );
});

test('counts is not affected by search, filter, page, or per_page', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    Ticket::create([
        'ticket_number' => 'PUB-301',
        'period' => now()->format('Y-m'),
        'sequence' => 301,
        'classification' => 'pengaduan',
        'title' => 'Keluhan Jalan Rusak',
        'channel_id' => $channel->id,
        'content' => 'Jalan berlubang parah',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    Ticket::create([
        'ticket_number' => 'PUB-302',
        'period' => now()->format('Y-m'),
        'sequence' => 302,
        'classification' => 'aspirasi',
        'title' => 'Taman Kota',
        'channel_id' => $channel->id,
        'content' => 'Perbanyak pohon di taman',
        'status' => 'respon_awal',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    // Search for non-existent keyword and filter by aspirasi
    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index', [
            'search' => 'kata_kunci_yang_tidak_ada_12345',
            'filter' => 'aspirasi',
            'per_page' => 20,
            'page' => 1,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 0) // Results filtered to 0
            ->where('counts.semua', 2) // Counts remain total 2
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->where('counts.belum_dibaca', 1)
            ->where('inbox_open_count', 2)
        );
});

test('operator only counts tickets in their scope and unauthorized users get 0', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    Ticket::create([
        'ticket_number' => 'PUB-401',
        'period' => now()->format('Y-m'),
        'sequence' => 401,
        'classification' => 'permintaan_informasi',
        'title' => 'Data Sensus',
        'channel_id' => $channel->id,
        'content' => 'Minta data publik',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    actingAs($operator)
        ->get(route('dashboard.operator.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->where('counts.semua', 1)
            ->where('counts.permintaan', 1)
            ->where('counts.belum_dibaca', 1)
            ->where('inbox_open_count', 1)
        );

    // Unauthenticated or arbitrary user instance check
    $guestCounts = InboxCounter::getCounts(null);
    expect($guestCounts['semua'])->toBe(1);

    // If an inactive or non-admin/operator user is passed
    $fakeUser = new User;
    $fakeUser->role = null;
    $unauthCounts = InboxCounter::getCounts($fakeUser);
    expect($unauthCounts['semua'])->toBe(0);
});
