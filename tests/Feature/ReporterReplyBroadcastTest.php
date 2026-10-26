<?php

use App\Events\InboxUpdated;
use App\Events\TicketReplyFromReporter;
use App\Events\TicketResponseCreated;
use App\Events\TicketUpdated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;

function createBroadcastTestTicket(Channel $channel, array $attributes = []): Ticket
{
    static $sequence = 700;

    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/102026/'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
        'period' => '2026-10',
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'channel_id' => $channel->id,
        'reporter_name' => 'Fulan',
        'content' => 'Isi laporan untuk pengujian broadcast balasan pelapor.',
        'status' => 'respon_substantif',
        'is_read' => true,
        'source_app' => 'web',
    ], $attributes));
}

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'is_active' => true],
    );

    // Semua event broadcast di-fake agar test tidak menyentuh Reverb/Pusher.
    Event::fake([
        TicketUpdated::class,
        TicketResponseCreated::class,
        InboxUpdated::class,
        TicketReplyFromReporter::class,
    ]);
});

test('web reporter reply dispatches TicketReplyFromReporter after commit', function () {
    $ticket = createBroadcastTestTicket($this->channel);

    $this->post(route('tickets.check.reply', ['ticketNumber' => $ticket->ticket_number]), [
        'message' => 'Terima kasih, saya sudah membaca jawaban dari petugas.',
    ])->assertRedirect();

    $this->assertDatabaseHas('ticket_responses', [
        'ticket_id' => $ticket->id,
        'user_id' => null,
        'type' => 'balasan_pelapor',
    ]);

    Event::assertDispatched(TicketReplyFromReporter::class, function (TicketReplyFromReporter $event) use ($ticket) {
        $payload = $event->broadcastWith();

        return $event->ticket->id === $ticket->id
            && $event->response->type === 'balasan_pelapor'
            && $payload['ticket_id'] === $ticket->id
            && $payload['ticket_number'] === $ticket->ticket_number
            && $payload['reply_id'] === $event->response->id
            && $payload['reporter_name'] === 'Fulan'
            && $payload['excerpt'] !== ''
            && $payload['has_attachment'] === false
            && $payload['is_input_data'] === false
            && $event->broadcastAs() === 'ticket.reply.from.reporter';
    });
});

test('api reporter reply also dispatches TicketReplyFromReporter', function () {
    $ticket = createBroadcastTestTicket($this->channel, ['source_app' => 'flutter']);

    $this->withHeader('X-API-KEY', config('app.api_key'))
        ->postJson('/api/check/'.$ticket->ticket_number.'/reply', [
            'message' => 'Balasan pelapor dari aplikasi mobile.',
        ])
        ->assertStatus(201)
        ->assertJsonPath('success', true);

    Event::assertDispatched(TicketReplyFromReporter::class, fn (TicketReplyFromReporter $event) => $event->ticket->id === $ticket->id);
});

test('staff reply does not dispatch TicketReplyFromReporter', function () {
    $admin = User::factory()->admin()->create();
    $ticket = createBroadcastTestTicket($this->channel);

    actingAs($admin)
        ->post("/dashboard/admin/laporan-masuk/{$ticket->id}/responses", [
            'response_type' => 'respon_substantif',
            'response_message' => 'Berikut tanggapan lengkap dari petugas BPS.',
        ])
        ->assertRedirect();

    Event::assertNotDispatched(TicketReplyFromReporter::class);
});

test('private user channel is authorized only for its owner', function () {
    // phpunit.xml memakai broadcaster "null" yang selalu meloloskan otorisasi.
    // Ganti ke driver reverb untuk test ini, lalu daftarkan ulang definisi kanal
    // pada driver tersebut (saat boot, channels.php terdaftar di driver "null").
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    require base_path('routes/channels.php');

    $owner = User::factory()->operator()->create();
    $other = User::factory()->operator()->create();
    $inactive = User::factory()->operator()->create(['is_active' => false]);

    $this->actingAs($owner)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-App.Models.User.'.$owner->id,
    ])->assertOk();

    $this->actingAs($owner)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-App.Models.User.'.$other->id,
    ])->assertForbidden();

    $this->actingAs($inactive)->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-App.Models.User.'.$inactive->id,
    ])->assertForbidden();
});

test('recipient list follows existing dashboard access rules', function () {
    $admin = User::factory()->admin()->create();
    $operator = User::factory()->operator()->create();
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    $inactiveOperator = User::factory()->operator()->create(['is_active' => false]);

    $webTicket = createBroadcastTestTicket($this->channel);
    $webEvent = new TicketReplyFromReporter($webTicket, TicketResponse::create([
        'ticket_id' => $webTicket->id,
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Balasan pelapor pada tiket Laporan Masuk.',
        'sent_at' => now(),
    ]));

    $webChannels = array_map(fn ($channel) => $channel->name, $webEvent->broadcastOn());

    expect($webChannels)
        ->toContain('private-App.Models.User.'.$admin->id)
        ->toContain('private-App.Models.User.'.$operator->id)
        ->not->toContain('private-App.Models.User.'.$operatorTim->id)
        ->not->toContain('private-App.Models.User.'.$inactiveOperator->id);

    $inputTicket = createBroadcastTestTicket($this->channel, ['source_app' => 'admin', 'status' => 'respon_awal']);
    $inputEvent = new TicketReplyFromReporter($inputTicket, TicketResponse::create([
        'ticket_id' => $inputTicket->id,
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Balasan pelapor pada tiket Input Data.',
        'sent_at' => now(),
    ]));

    $inputChannels = array_map(fn ($channel) => $channel->name, $inputEvent->broadcastOn());

    expect($inputChannels)
        ->toContain('private-App.Models.User.'.$admin->id)
        ->toContain('private-App.Models.User.'.$operator->id)
        ->toContain('private-App.Models.User.'.$operatorTim->id);
});
