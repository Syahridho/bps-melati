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
