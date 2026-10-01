<?php

use App\Mail\TicketResponseSubmitted;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        [
            'name' => 'Website',
            'sort_order' => 1,
            'is_active' => true,
        ]
    );

    $this->admin = User::factory()->create(['role' => 'admin']);
});

test('admin can respond to a ticket and email is sent to reporter', function () {
    Mail::fake();

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0001',
        'period' => '2026-09',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Budi Santoso',
        'reporter_email' => 'budi@example.com',
        'content' => 'Laporan pengujian tanggapan admin dan pengiriman email.',
        'status' => 'baru',
    ]);

    actingAs($this->admin)
        ->post(route('dashboard.admin.laporan-masuk.responses.store', $ticket), [
            'type' => 'respon_substantif',
            'message' => 'Terima kasih atas laporan Anda. Laporan telah kami tindak lanjuti.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('tickets', [
        'id' => $ticket->id,
        'status' => 'respon_substantif',
    ]);

    $this->assertDatabaseHas('ticket_responses', [
        'ticket_id' => $ticket->id,
        'type' => 'respon_substantif',
        'message' => 'Terima kasih atas laporan Anda. Laporan telah kami tindak lanjuti.',
    ]);

    Mail::assertQueued(TicketResponseSubmitted::class, function ($mail) use ($ticket) {
        return $mail->hasTo('budi@example.com') &&
            $mail->ticket->id === $ticket->id;
    });
});

test('admin response includes attachments and updates redis cache', function () {
    Mail::fake();
    Storage::fake('public');

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0002',
        'period' => '2026-09',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Siti Nurhaliza',
        'reporter_email' => 'siti@example.com',
        'content' => 'Laporan pengujian lampiran respon.',
        'status' => 'baru',
    ]);

    $file = UploadedFile::fake()->create('bukti_tindak_lanjut.pdf', 500, 'application/pdf');

    actingAs($this->admin)
        ->post(route('dashboard.admin.laporan-masuk.responses.store', $ticket), [
            'type' => 'respon_awal',
            'message' => 'Respon awal dengan dokumen terlampir.',
            'attachments' => [$file],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('response_attachments', [
        'original_name' => 'bukti_tindak_lanjut.pdf',
    ]);

    $responseModel = $ticket->responses()->first();
    expect(Cache::has("response:{$responseModel->id}"))->toBeTrue();

    Mail::assertQueued(TicketResponseSubmitted::class);
});
