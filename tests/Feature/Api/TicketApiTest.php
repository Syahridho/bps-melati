<?php

use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->apiKey = config('app.api_key', 'melati-secret-api-key');
    $this->channel = Channel::where('slug', 'website')->first()
        ?? Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
});

test('requests without api key header return 401 unauthorized', function () {
    $response = $this->getJson('/api/check?ticket_number=INVALID');

    $response->assertStatus(401)
        ->assertJson([
            'success' => false,
            'message' => 'Unauthorized. Invalid or missing API key.',
        ]);
});

test('requests with invalid api key header return 401 unauthorized', function () {
    $response = $this->withHeader('X-API-KEY', 'wrong-key')
        ->getJson('/api/check?ticket_number=INVALID');

    $response->assertStatus(401)
        ->assertJson([
            'success' => false,
            'message' => 'Unauthorized. Invalid or missing API key.',
        ]);
});

test('can create ticket via post /api/tickets with valid api key and validation', function () {
    Storage::fake('public');

    $payload = [
        'classification' => 'pengaduan',
        'title' => 'Pengaduan Layanan dari Flutter',
        'content' => 'Ini adalah isi pengaduan dari aplikasi mobile Flutter yang dikirim via API.',
        'reporter_name' => 'Budi Flutter',
        'reporter_email' => 'budi.flutter@example.com',
        'reporter_wa' => '081234567890',
        'attachments' => [
            UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf'),
        ],
    ];

    $response = $this->withHeader('X-API-KEY', $this->apiKey)
        ->postJson('/api/tickets', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Tiket berhasil dibuat.')
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'id',
                'ticket_number',
                'classification',
                'title',
                'status',
                'created_at',
                'attachments',
            ],
        ]);

    $ticketNumber = $response->json('data.ticket_number');
    $this->assertDatabaseHas('tickets', [
        'ticket_number' => $ticketNumber,
        'classification' => 'pengaduan',
        'source_app' => 'flutter',
    ]);
});

test('validation prevents invalid inputs or sql injection strings', function () {
    $payload = [
        'classification' => "pengaduan' OR '1'='1",
        'title' => '',
        'content' => 'pendek',
        'reporter_email' => 'invalid-email-format',
        'reporter_wa' => '0812abc345',
    ];

    $response = $this->withHeader('X-API-KEY', $this->apiKey)
        ->postJson('/api/tickets', $payload);

    $response->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonStructure(['errors']);
});

test('can check ticket status via get /api/check', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'P-1400/102026/FL01',
        'period' => '102026',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Cek Status Tiket',
        'content' => 'Isi laporan status tiket yang ingin dicek via Flutter',
        'reporter_name' => 'Siti Flutter',
        'channel_id' => $this->channel->id,
        'status' => 'baru',
    ]);

    $response = $this->withHeader('X-API-KEY', $this->apiKey)
        ->getJson("/api/check/{$ticket->ticket_number}");

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.ticket_number', $ticket->ticket_number)
        ->assertJsonPath('data.title', 'Cek Status Tiket');
});

test('can reply and complete ticket via api', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'P-1400/102026/FL02',
        'period' => '102026',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Balas Tiket',
        'content' => 'Isi laporan tiket yang akan dibalas dan diselesaikan',
        'channel_id' => $this->channel->id,
        'status' => 'respon_awal',
    ]);

    // Reply
    $replyResponse = $this->withHeader('X-API-KEY', $this->apiKey)
        ->postJson("/api/check/{$ticket->ticket_number}/reply", [
            'message' => 'Terima kasih atas tanggapannya, ini informasi tambahan.',
        ]);

    $replyResponse->assertStatus(201)
        ->assertJsonPath('success', true);

    // Complete
    $completeResponse = $this->withHeader('X-API-KEY', $this->apiKey)
        ->postJson("/api/check/{$ticket->ticket_number}/complete");

    $completeResponse->assertStatus(200)
        ->assertJsonPath('success', true);

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai');
});
