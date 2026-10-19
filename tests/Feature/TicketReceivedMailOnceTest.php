<?php

use App\Events\TicketCreated;
use App\Listeners\SendTicketReceivedNotification;
use App\Mail\TicketReceivedMail;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketCounter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
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

it('listener SendTicketReceivedNotification is registered exactly once for TicketCreated', function () {
    $listeners = Event::getListeners(TicketCreated::class);
    expect(count($listeners))->toBe(1);
});

it('sends exactly one confirmation email when ticket submitted via web', function () {
    Mail::fake();

    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Laporan Uji Sekali Kirim',
        'service_type' => 'pst',
        'reporter_name' => 'Budi',
        'reporter_email' => 'budi.sekali@gmail.com',
        'reporter_wa' => '081234567890',
        'content' => 'Uraian pengaduan uji coba kirim satu email.',
    ]);

    $response->assertRedirect();

    Mail::assertQueued(TicketReceivedMail::class, 1);
    Mail::assertQueued(TicketReceivedMail::class, function ($mail) {
        return $mail->hasTo('budi.sekali@gmail.com');
    });
});

it('sends exactly one confirmation email when ticket submitted via api', function () {
    Mail::fake();

    $response = $this->withHeaders([
        'X-API-KEY' => config('services.api.key', 'melati-secret-api-key'),
    ])->postJson('/api/tickets', [
        'classification' => 'aspirasi',
        'title' => 'Aspirasi API Sekali',
        'reporter_name' => 'Siti',
        'reporter_email' => 'siti.sekali@gmail.com',
        'reporter_wa' => '081298765432',
        'content' => 'Uraian aspirasi lewat API.',
    ]);

    $response->assertStatus(201);

    Mail::assertQueued(TicketReceivedMail::class, 1);
    Mail::assertQueued(TicketReceivedMail::class, function ($mail) {
        return $mail->hasTo('siti.sekali@gmail.com');
    });
});

it('does not send confirmation email when reporter email is empty', function () {
    Mail::fake();

    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'permintaan_informasi',
        'title' => 'Tanpa Email',
        'service_type' => 'pst',
        'reporter_name' => 'Anonim',
        'reporter_email' => '',
        'content' => 'Uraian permintaan informasi tanpa email.',
    ]);

    $response->assertRedirect();

    Mail::assertNotQueued(TicketReceivedMail::class);
});

it('does not send email when validation fails', function () {
    Mail::fake();

    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'invalid',
        'title' => '',
        'reporter_email' => 'budi.sekali@gmail.com',
        'content' => 'pendek',
    ]);

    $response->assertSessionHasErrors(['classification', 'title', 'content']);

    Mail::assertNotQueued(TicketReceivedMail::class);
});
