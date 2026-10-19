<?php

use App\Mail\TicketReceivedMail;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketCounter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

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

it('renders correct title and opening greeting for pengaduan', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/XX01',
        'period' => '2026-10',
        'sequence' => 1,
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Judul Test',
        'content' => 'Isi konten laporan uji coba.',
        'reporter_name' => 'Budi',
        'reporter_email' => 'budi@gmail.com',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $mailable = new TicketReceivedMail($ticket);
    $html = $mailable->render();
    $text = $mailable->renderText();

    expect($html)->toContain('Laporan Anda Telah Diterima')
        ->and($html)->not->toContain('</x-mail::header>')
        ->and($text)->toContain('Laporan Anda Telah Diterima')
        ->and($html)->toContain('Terima kasih telah membuat laporan melalui layanan Melati');
});

it('renders correct title and opening greeting for aspirasi', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/102026/XX02',
        'period' => '2026-10',
        'sequence' => 2,
        'channel_id' => $this->channel->id,
        'classification' => 'aspirasi',
        'title' => 'Judul Test',
        'content' => 'Isi konten aspirasi uji coba.',
        'reporter_name' => 'Siti',
        'reporter_email' => 'siti@gmail.com',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $mailable = new TicketReceivedMail($ticket);
    $html = $mailable->render();
    $text = $mailable->renderText();

    expect($html)->toContain('Aspirasi Anda Telah Diterima')
        ->and($html)->not->toContain('</x-mail::header>')
        ->and($text)->toContain('Aspirasi Anda Telah Diterima')
        ->and($html)->toContain('Terima kasih telah memberikan aspirasi Anda melalui layanan Melati');
});

it('renders correct title and opening greeting for permintaan_informasi', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'I-1400/102026/XX03',
        'period' => '2026-10',
        'sequence' => 3,
        'channel_id' => $this->channel->id,
        'classification' => 'permintaan_informasi',
        'title' => 'Judul Test',
        'content' => 'Isi konten informasi uji coba.',
        'reporter_name' => 'Andi',
        'reporter_email' => 'andi@gmail.com',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $mailable = new TicketReceivedMail($ticket);
    $html = $mailable->render();
    $text = $mailable->renderText();

    expect($html)->toContain('Permintaan Informasi Anda Telah Diterima')
        ->and($html)->not->toContain('</x-mail::header>')
        ->and($text)->toContain('Permintaan Informasi Anda Telah Diterima')
        ->and($html)->toContain('Terima kasih telah menghubungi layanan kami, Melati');
});

it('includes attachment notice and attaches files when ticket has attachments', function () {
    Storage::fake('public');
    Mail::fake();

    $file = UploadedFile::fake()->create('bukti.pdf', 500, 'application/pdf');

    $response = $this->post(route('tickets.store'), [
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Laporan dengan Lampiran',
        'service_type' => 'pst',
        'reporter_name' => 'Siti',
        'reporter_email' => 'siti.lampiran@gmail.com',
        'reporter_wa' => '081234567890',
        'content' => 'Uraian pengaduan dengan lampiran dokumen.',
        'attachments' => [$file],
    ]);

    $response->assertRedirect();

    $ticket = Ticket::latest('id')->first();

    $mailable = new TicketReceivedMail($ticket);
    $html = $mailable->render();
    $attachments = $mailable->attachments();

    expect($html)->toContain('Lampiran pendukung yang Anda sertakan juga kami lampirkan pada email ini.')
        ->and($attachments)->not->toBeEmpty();
});

it('does not include attachment notice when ticket has no attachments', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/YY01',
        'period' => '2026-10',
        'sequence' => 1,
        'channel_id' => $this->channel->id,
        'classification' => 'pengaduan',
        'title' => 'Tanpa Lampiran',
        'content' => 'Isi laporan tanpa lampiran pendukung.',
        'reporter_name' => 'Ani',
        'reporter_email' => 'ani@gmail.com',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $mailable = new TicketReceivedMail($ticket);
    $html = $mailable->render();

    expect($html)->not->toContain('Lampiran pendukung yang Anda sertakan');
});
