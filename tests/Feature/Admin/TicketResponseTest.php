<?php

use App\Jobs\SendTicketResponseNotification;
use App\Mail\TicketResponseSubmitted;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

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

test('admin can respond to a ticket and email is queued to reporter', function () {
    Queue::fake();

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
            'response_type' => 'respon_substantif',
            'response_message' => 'Terima kasih atas laporan Anda. Laporan telah kami tindak lanjuti.',
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

    Queue::assertPushed(SendTicketResponseNotification::class, function ($job) use ($ticket) {
        return $job->response->ticket_id === $ticket->id;
    });
});

test('admin response includes attachments and updates redis cache', function () {
    Queue::fake();
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
            'response_type' => 'respon_awal',
            'response_message' => 'Respon awal dengan dokumen terlampir.',
            'response_attachments' => [$file],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('response_attachments', [
        'original_name' => 'bukti_tindak_lanjut.pdf',
    ]);

    $responseModel = $ticket->responses()->first();
    expect(Cache::has("response:{$responseModel->id}"))->toBeTrue();

    Queue::assertPushed(SendTicketResponseNotification::class);
});

test('response does not downgrade a higher ticket status', function () {
    Mail::fake();

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0003',
        'period' => '2026-09',
        'sequence' => 3,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan pengujian status hierarchy.',
        'status' => 'respon_substantif',
        'completed_at' => now(),
    ]);

    actingAs($this->admin)
        ->post(route('dashboard.admin.laporan-masuk.responses.store', $ticket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Catatan tambahan tanpa menurunkan status tiket.',
        ])
        ->assertRedirect();

    expect($ticket->fresh()->status)->toBe('respon_substantif');
});

test('completed ticket cannot receive a new response', function () {
    Mail::fake();

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0004',
        'period' => '2026-09',
        'sequence' => 4,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan pengujian tiket selesai.',
        'status' => 'selesai',
        'completed_at' => now(),
    ]);

    actingAs($this->admin)
        ->post(route('dashboard.admin.laporan-masuk.responses.store', $ticket), [
            'response_type' => 'respon_substantif',
            'response_message' => 'Percobaan membalas tiket yang sudah selesai.',
        ])
        ->assertSessionHasErrors('response_message');

    expect($ticket->responses()->count())->toBe(0);
});

test('laporan masuk detail lists responses oldest first', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0005',
        'period' => '2026-09',
        'sequence' => 5,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan pengujian urutan riwayat tanggapan.',
        'status' => 'respon_substantif',
        'completed_at' => now(),
    ]);

    $older = TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $this->admin->id,
        'type' => 'respon_awal',
        'message' => 'Respon lama yang harus muncul di atas.',
        'sent_at' => now()->subHour(),
        'created_at' => now()->subHour(),
        'updated_at' => now()->subHour(),
    ]);

    $newer = TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $this->admin->id,
        'type' => 'respon_substantif',
        'message' => 'Respon baru yang harus muncul di bawah.',
        'sent_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk/show')
            ->where('ticket.responses.0.id', $older->id)
            ->where('ticket.responses.1.id', $newer->id)
        );
});
