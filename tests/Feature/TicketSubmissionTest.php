<?php

use App\Events\TicketCreated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketCounter;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    // Cegah broadcast sungguhan ke Reverb/Pusher (localhost:8080) saat test
    Event::fake([TicketCreated::class]);

    Channel::query()->delete();
    Ticket::query()->delete();
    TicketCounter::query()->delete();

    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        [
            'name' => 'Website',
            'sort_order' => 1,
            'is_active' => true,
        ]
    );
});

it('can submit a pengaduan ticket', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Jalan Rusak',
        'service_type' => 'pst',
        'reporter_name' => 'Ahmad Fauzi',
        'reporter_email' => 'ahmad@test.com',
        'reporter_wa' => '08123456789',
        'content' => 'Jalan rusak parah di daerah kami sudah 3 bulan.',
        'tanggal_kejadian' => '2026-09-20',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('ticket_number');

    $this->assertDatabaseCount('tickets', 1);

    $ticket = Ticket::first();
    expect($ticket->classification)->toBe('pengaduan')
        ->and($ticket->title)->toBe('Jalan Rusak')
        ->and($ticket->service_type)->toBe('pst')
        ->and($ticket->reporter_name)->toBe('Ahmad Fauzi')
        ->and($ticket->reporter_email)->toBe('ahmad@test.com')
        ->and($ticket->status)->toBe('baru')
        ->and($ticket->is_read)->toBeFalse()
        ->and($ticket->source_app)->toBe('web')
        ->and($ticket->ticket_number)->toStartWith('L-1400/');

    Event::assertDispatched(TicketCreated::class);
});

it('can submit an aspirasi ticket', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'aspirasi',
        'title' => 'Pelatihan Digital',
        'satuan_tugas' => 'Bagian Umum',
        'content' => 'Mohon diadakan pelatihan digital untuk UMKM di daerah kami.',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('ticket_number');

    $ticket = Ticket::first();
    expect($ticket->classification)->toBe('aspirasi')
        ->and($ticket->title)->toBe('Pelatihan Digital')
        ->and($ticket->satuan_tugas)->toBe('Bagian Umum')
        ->and($ticket->ticket_number)->toStartWith('A-1400/');
});

it('can submit a permintaan informasi ticket', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'permintaan_informasi',
        'title' => 'Prosedur IMB',
        'content' => 'Saya ingin mengetahui prosedur pengurusan IMB.',
    ]);

    $response->assertRedirect();

    $ticket = Ticket::first();
    expect($ticket->classification)->toBe('permintaan_informasi')
        ->and($ticket->title)->toBe('Prosedur IMB')
        ->and($ticket->ticket_number)->toStartWith('I-1400/');
});

it('generates sequential ticket numbers within same period', function () {
    $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Laporan Pertama',
        'service_type' => 'pst',
        'content' => 'Laporan pertama untuk test nomor urut.',
        'tanggal_kejadian' => '2026-09-20',
    ])->assertRedirect();

    $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Kedua',
        'satuan_tugas' => 'Bagian Umum',
        'content' => 'Aspirasi kedua untuk test nomor urut.',
    ])->assertRedirect();

    $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'permintaan_informasi',
        'title' => 'Permintaan Ketiga',
        'content' => 'Permintaan ketiga untuk test nomor urut.',
    ])->assertRedirect();

    $tickets = Ticket::orderBy('sequence')->get();
    expect($tickets)->toHaveCount(3)
        ->and($tickets[0]->sequence)->toBe(1)
        ->and($tickets[1]->sequence)->toBe(2)
        ->and($tickets[2]->sequence)->toBe(3);
});

it('validates classification is required', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'content' => 'Some content here for validation.',
    ]);

    $response->assertSessionHasErrors('classification');
});

it('validates title is required', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'content' => 'Content valid minimal 10 karakter.',
        'tanggal_kejadian' => '2026-09-20',
    ]);

    $response->assertSessionHasErrors('title');
});

it('validates content is required', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'tanggal_kejadian' => '2026-09-20',
    ]);

    $response->assertSessionHasErrors('content');
});

it('validates content minimum length', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Judul Test',
        'service_type' => 'pst',
        'content' => 'pendek',
        'tanggal_kejadian' => '2026-09-20',
    ]);

    $response->assertSessionHasErrors('content');
});

it('validates invalid classification is rejected', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'invalid_type',
        'title' => 'Judul Test',
        'content' => 'Some content for invalid classification test.',
    ]);

    $response->assertSessionHasErrors('classification');
});

it('caches ticket data in redis after creation', function () {
    $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Judul Cache',
        'service_type' => 'pst',
        'content' => 'Laporan untuk test caching di Redis.',
        'tanggal_kejadian' => '2026-09-20',
    ])->assertRedirect();

    $ticket = Ticket::first();
    $cached = cache("ticket:{$ticket->ticket_number}");

    expect($cached)->not->toBeNull()
        ->and($cached['ticket_number'])->toBe($ticket->ticket_number)
        ->and($cached['classification'])->toBe('pengaduan')
        ->and($cached['status'])->toBe('baru');
});

it('allows optional reporter fields to be empty', function () {
    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'aspirasi',
        'title' => 'Judul Aspirasi',
        'satuan_tugas' => 'Bagian Umum',
        'content' => 'Aspirasi tanpa data pelapor sama sekali.',
    ]);

    $response->assertRedirect();

    $ticket = Ticket::first();
    expect($ticket->reporter_name)->toBeNull()
        ->and($ticket->reporter_email)->toBeNull()
        ->and($ticket->reporter_wa)->toBeNull();
});
