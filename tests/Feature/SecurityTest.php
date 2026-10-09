<?php

use App\Models\Channel;
use App\Models\Ticket;

it('sanitizes input and strips html tags from title and content', function () {
    $channel = Channel::where('slug', 'website')->first();

    $response = $this->post(route('tickets.store'), [
        'classification' => 'pengaduan',
        'title' => '<b>Judul bahaya</b><script>alert(1)</script>',
        'content' => '<p>Uraian laporan dengan html tag dan script <script>evil()</script></p>',
        'channel_id' => $channel->id,
        'reporter_name' => '<i>John Doe</i>',
    ]);

    $response->assertSessionHasNoErrors();

    $ticket = Ticket::latest('id')->first();
    expect($ticket->title)->toBe('Judul bahayaalert(1)');
    expect($ticket->reporter_name)->toBe('John Doe');
    expect($ticket->content)->not->toContain('<script>');
});

it('prevents mass assignment of guarded status or access_code from public request', function () {
    $channel = Channel::where('slug', 'website')->first();

    $response = $this->post(route('tickets.store'), [
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Masayarakat',
        'content' => 'Isi aspirasi publik untuk pengujian mass assignment.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'is_read' => true,
        'access_code' => 'HACKED123456',
        'sequence' => 9999,
    ]);

    $response->assertSessionHasNoErrors();

    $ticket = Ticket::latest('id')->first();
    expect($ticket->status)->toBe('baru');
    expect($ticket->is_read)->toBeFalse();
    expect($ticket->access_code)->not->toBe('HACKED123456');
    expect($ticket->sequence)->not->toBe(9999);
});

it('does not leak reporter email or wa in public api check', function () {
    $channel = Channel::where('slug', 'website')->first();

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/TEST01',
        'period' => '2026-10',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Laporan uji coba leak PII',
        'content' => 'Isi laporan untuk pengujian API check.',
        'channel_id' => $channel->id,
        'reporter_email' => 'private@example.com',
        'reporter_wa' => '081234567890',
        'status' => 'baru',
    ]);

    $apiKey = config('app.api_key');

    $response = $this->withHeader('X-API-KEY', $apiKey)
        ->getJson("/api/check/{$ticket->ticket_number}");

    $response->assertOk();
    $data = $response->json('data');

    expect($data)->not->toHaveKey('reporter_email');
    expect($data)->not->toHaveKey('reporter_wa');
    expect($data)->not->toHaveKey('access_code');
});

it('adds security headers to responses', function () {
    $response = $this->get('/');

    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});
