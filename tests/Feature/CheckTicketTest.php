<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

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
            'response_type' => 'respon_awal',
            'response_message' => 'Laporan Anda sudah kami terima dan sedang diproses.',
        ])->assertRedirect();

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

test('page /check produces signed download URLs instead of raw storage URLs', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0201',
        'period' => '2026-09',
        'sequence' => 201,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Pengaduan dengan lampiran',
        'status' => 'respon_awal',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    $att = $ticket->attachments()->create([
        'path' => 'attachments/test/sample.pdf',
        'original_name' => 'sample.pdf',
        'mime_type' => 'application/pdf',
        'size' => 1024,
    ]);

    $admin = User::factory()->create(['role' => 'admin']);
    $response = $ticket->responses()->create([
        'user_id' => $admin->id,
        'type' => 'respon_awal',
        'message' => 'Respon admin',
        'sent_at' => now(),
    ]);

    $respAtt = $response->attachments()->create([
        'path' => 'response_attachments/test/admin_note.pdf',
        'original_name' => 'admin_note.pdf',
        'mime_type' => 'application/pdf',
        'size' => 2048,
    ]);

    Cache::forget('ticket_check:'.md5($ticket->ticket_number));

    $res = $this->get('/check?ticket_number='.$ticket->ticket_number);
    $res->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('check')
            ->where('ticket.attachments.0.url', fn (string $url) => str_contains($url, '/check/lampiran/ticket/'.$att->id) && str_contains($url, 'signature='))
            ->where('ticket.responses.0.attachments.0.url', fn (string $url) => str_contains($url, '/check/lampiran/response/'.$respAtt->id) && str_contains($url, 'signature='))
        );
});

test('public reporter can download attachment with valid signed URL', function () {
    Storage::fake('public');
    Storage::disk('public')->put('response_attachments/1/doc.pdf', '%PDF-1.4 dummy content');

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0202',
        'period' => '2026-09',
        'sequence' => 202,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Pengaduan',
        'status' => 'respon_awal',
        'source_app' => 'web',
    ]);

    $response = $ticket->responses()->create([
        'user_id' => null,
        'type' => 'respon_awal',
        'message' => 'Balasan',
    ]);

    $att = $response->attachments()->create([
        'path' => 'response_attachments/1/doc.pdf',
        'original_name' => 'doc.pdf',
        'mime_type' => 'application/pdf',
        'size' => 100,
    ]);

    $signedUrl = URL::temporarySignedRoute(
        'check.attachments.download',
        now()->addMinutes(30),
        ['type' => 'response', 'id' => $att->id]
    );

    $download = $this->get($signedUrl);
    $download->assertOk();
    $download->assertHeader('Content-Type', 'application/pdf');
    $download->assertHeader('X-Content-Type-Options', 'nosniff');
});

test('tampered or unsigned attachment link is rejected with friendly message', function () {
    $unsignedUrl = route('check.attachments.download', ['type' => 'response', 'id' => 999]);

    $res = $this->get($unsignedUrl);
    $res->assertStatus(403);
    $res->assertInertia(fn (Assert $page) => $page
        ->component('error')
        ->where('status', 403)
        ->where('message', 'Tautan unduhan sudah kedaluwarsa. Muat ulang halaman status laporan lalu coba lagi.')
    );

    // Tampered signature
    $tampered = $unsignedUrl.'?signature=invalid123';
    $resTampered = $this->get($tampered);
    $resTampered->assertStatus(403);
});

test('expired signed link is rejected with friendly message', function () {
    $expiredUrl = URL::temporarySignedRoute(
        'check.attachments.download',
        now()->subMinutes(5),
        ['type' => 'response', 'id' => 1]
    );

    $res = $this->get($expiredUrl);
    $res->assertStatus(403);
    $res->assertInertia(fn (Assert $page) => $page
        ->component('error')
        ->where('status', 403)
        ->where('message', 'Tautan unduhan sudah kedaluwarsa. Muat ulang halaman status laporan lalu coba lagi.')
    );
});

test('attachment belonging to ticket A cannot be fetched via link created for ticket B (404)', function () {
    Storage::fake('public');
    Storage::disk('public')->put('attachments/test/doc_a.pdf', 'Content A');

    $ticketA = Ticket::create([
        'ticket_number' => 'L-1400/092026/0204',
        'period' => '2026-09',
        'sequence' => 204,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Tiket A',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $ticketB = Ticket::create([
        'ticket_number' => 'L-1400/092026/0205',
        'period' => '2026-09',
        'sequence' => 205,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Tiket B',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $attA = $ticketA->attachments()->create([
        'path' => 'attachments/test/doc_a.pdf',
        'original_name' => 'doc_a.pdf',
        'mime_type' => 'application/pdf',
        'size' => 100,
    ]);

    // Sign with Ticket B as the expected ticket
    $signedUrlMismatched = URL::temporarySignedRoute(
        'check.attachments.download',
        now()->addMinutes(30),
        ['type' => 'ticket', 'id' => $attA->id, 'ticket' => $ticketB->id]
    );

    $res = $this->get($signedUrlMismatched);
    $res->assertStatus(404);
    $res->assertInertia(fn (Assert $page) => $page
        ->component('error')
        ->where('status', 404)
        ->where('message', 'Lampiran tidak ditemukan.')
    );
});

test('missing physical file returns 404 with friendly message', function () {
    Storage::fake('public'); // empty storage

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0203',
        'period' => '2026-09',
        'sequence' => 203,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Pengaduan',
        'status' => 'respon_awal',
        'source_app' => 'web',
    ]);

    $att = $ticket->attachments()->create([
        'path' => 'attachments/nonexistent.pdf',
        'original_name' => 'nonexistent.pdf',
        'mime_type' => 'application/pdf',
        'size' => 100,
    ]);

    $signedUrl = URL::temporarySignedRoute(
        'check.attachments.download',
        now()->addMinutes(30),
        ['type' => 'ticket', 'id' => $att->id]
    );

    $res = $this->get($signedUrl);
    $res->assertStatus(404);
    $res->assertInertia(fn (Assert $page) => $page
        ->component('error')
        ->where('status', 404)
        ->where('message', 'Lampiran tidak ditemukan.')
    );
});
