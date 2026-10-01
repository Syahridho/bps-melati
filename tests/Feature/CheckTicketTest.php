<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->channel = Channel::create([
        'name' => 'Website BPS',
        'slug' => 'website-bps',
        'is_active' => true,
    ]);
});

test('public page /check can be accessed without login', function () {
    $response = $this->get('/check');

    $response->assertOk();
});

test('public check retrieves ticket and caches result in redis', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0099',
        'period' => '2026-09',
        'sequence' => 99,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Laporan uji publik',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    $cacheKey = 'ticket_check:'.md5($ticket->ticket_number);
    Cache::forget($cacheKey);

    $response = $this->get('/check?ticket_number=L-1400/092026/0099');

    $response->assertOk();
    expect(Cache::has($cacheKey))->toBeTrue();
});

test('admin response clears ticket check cache', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0100',
        'period' => '2026-09',
        'sequence' => 100,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Laporan uji cache',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ]);

    // Initial check caches the ticket
    $this->get('/check?ticket_number=L-1400/092026/0100');
    $cacheKey = 'ticket_check:'.md5($ticket->ticket_number);
    expect(Cache::has($cacheKey))->toBeTrue();

    // Admin responds
    $this->actingAs($admin)
        ->post("/dashboard/admin/laporan-masuk/{$ticket->id}/responses", [
            'type' => 'respon_awal',
            'message' => 'Laporan Anda sudah kami terima dan sedang diproses.',
        ]);

    // Cache should be invalidated
    expect(Cache::has($cacheKey))->toBeFalse();
});

test('reporter can reply on check page using existing ticket', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/092026/0101',
        'period' => '2026-09',
        'sequence' => 101,
        'classification' => 'aspirasi',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Usulan perbaikan data.',
        'status' => 'respon_substantif',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    $response = $this->post(route('tickets.check.reply', ['ticketNumber' => $ticket->ticket_number]), [
        'message' => 'Terima kasih atas tanggapannya, tapi bagaimana dengan data bulan lalu?',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('flash.success');

    // Make sure no new ticket was created
    expect(Ticket::count())->toBe(1);

    $ticket->refresh();
    expect($ticket->is_read)->toBeFalse();

    $this->assertDatabaseHas('ticket_responses', [
        'ticket_id' => $ticket->id,
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Terima kasih atas tanggapannya, tapi bagaimana dengan data bulan lalu?',
    ]);
});

test('reporter can complete ticket on check page', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'I-1400/092026/0102',
        'period' => '2026-09',
        'sequence' => 102,
        'classification' => 'permintaan_informasi',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Mohon data inflasi terbaru.',
        'status' => 'respon_substantif',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    $response = $this->post(route('tickets.check.complete', ['ticketNumber' => $ticket->ticket_number]));

    $response->assertRedirect();
    $response->assertSessionHas('flash.success');

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai')
        ->and($ticket->completed_at)->not->toBeNull();
});

test('expired tickets auto close based on classification settings', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $ticketAspirasi = Ticket::create([
        'ticket_number' => 'A-1400/092026/0103',
        'period' => '2026-09',
        'sequence' => 103,
        'classification' => 'aspirasi',
        'channel_id' => $this->channel->id,
        'content' => 'Aspirasi uji auto close.',
        'status' => 'respon_substantif',
        'created_at' => now()->subDays(5),
    ]);

    $ticketAspirasi->responses()->create([
        'user_id' => $admin->id,
        'type' => 'respon_substantif',
        'message' => 'Respon dari petugas BPS.',
        'sent_at' => now()->subDays(2), // > 1 hari (default aspirasi)
        'created_at' => now()->subDays(2),
    ]);

    $closedCount = Ticket::autoCloseExpiredTickets();

    expect($closedCount)->toBe(1);

    $ticketAspirasi->refresh();
    expect($ticketAspirasi->status)->toBe('selesai')
        ->and($ticketAspirasi->completed_at)->not->toBeNull();
});

test('tickets auto-close artisan command works', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $ticketPengaduan = Ticket::create([
        'ticket_number' => 'L-1400/092026/0104',
        'period' => '2026-09',
        'sequence' => 104,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Pengaduan uji command auto close.',
        'status' => 'respon_substantif',
        'created_at' => now()->subDays(10),
    ]);

    $ticketPengaduan->responses()->create([
        'user_id' => $admin->id,
        'type' => 'respon_substantif',
        'message' => 'Respon petugas BPS.',
        'sent_at' => now()->subDays(4), // > 3 hari (default pengaduan)
        'created_at' => now()->subDays(4),
    ]);

    $this->artisan('tickets:auto-close')
        ->assertSuccessful();

    $ticketPengaduan->refresh();
    expect($ticketPengaduan->status)->toBe('selesai');
});
