<?php

use App\Actions\ReplyToTicket;
use App\Events\InboxUpdated;
use App\Events\TicketResponseCreated;
use App\Events\TicketUpdated;
use App\Exceptions\TicketAlreadyRespondedException;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Event::fake([TicketResponseCreated::class, TicketUpdated::class, InboxUpdated::class, \App\Events\TicketResponseEmailStatusUpdated::class]);
    Queue::fake([\App\Jobs\SendTicketResponseNotification::class]);

    // phpunit.xml memakai BROADCAST_CONNECTION=null sehingga callback kanal tidak
    // pernah dieksekusi. Untuk menguji otorisasi channel, pakai driver sungguhan.
    // Broadcast::purge() membuat instance broadcaster baru tanpa kanal yang
    // sudah terdaftar, jadi routes/channels.php dimuat ulang setelah purge.
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    $this->admin = User::factory()->admin()->create(['name' => 'Admin Satu']);
    $this->operator = User::factory()->operator()->create(['name' => 'Operator Dua']);

    $this->ticket = Ticket::create([
        'ticket_number' => 'L-1400/092026/0701',
        'period' => '2026-09',
        'sequence' => 701,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Rina',
        'reporter_email' => 'rina@example.com',
        'content' => 'Laporan untuk pengujian tabrakan balasan.',
        'status' => 'baru',
    ]);
});

function replyUrl(Ticket $ticket, User $actor): string
{
    $prefix = $actor->isAdmin() ? 'dashboard.admin' : 'dashboard.operator';

    return route("{$prefix}.laporan-masuk.responses.store", ['ticket' => $ticket->id]);
}

function replyPayload(string $type = 'respon_awal', ?string $key = null, array $overrides = []): array
{
    return array_merge([
        'response_type' => $type,
        'response_message' => 'Tanggapan pengujian untuk memastikan hanya tersimpan sekali.',
        'idempotency_key' => $key ?? (string) Str::uuid(),
    ], $overrides);
}

/*
|--------------------------------------------------------------------------
| A1 — Respon Awal hanya boleh tercatat sekali
|--------------------------------------------------------------------------
*/

test('respon awal kedua pada tiket yang sama ditolak dengan 409', function () {
    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_awal'))
        ->assertCreated();

    $this->actingAs($this->operator)
        ->postJson(replyUrl($this->ticket, $this->operator), replyPayload('respon_awal'))
        ->assertStatus(409)
        ->assertJsonPath('data.code', 'already_responded');

    expect($this->ticket->responses()->where('type', 'respon_awal')->count())->toBe(1);
    expect($this->ticket->fresh()->status)->toBe('respon_awal');
});

test('unique index menolak dua respon awal untuk tiket yang sama walau lolos pemeriksaan aplikasi', function () {
    // Meniru kondisi balapan: dua penulis membaca "belum ada respon awal" lalu sama-sama
    // mencoba menulis. Yang kalah menabrak unique index database.
    TicketResponse::create([
        'ticket_id' => $this->ticket->id,
        'user_id' => $this->admin->id,
        'type' => 'respon_awal',
        'message' => 'Respon awal dari petugas pertama.',
        'sent_at' => now(),
    ]);

    expect(fn () => TicketResponse::create([
        'ticket_id' => $this->ticket->id,
        'user_id' => $this->operator->id,
        'type' => 'respon_awal',
        'message' => 'Respon awal dari petugas kedua.',
        'sent_at' => now(),
    ]))->toThrow(UniqueConstraintViolationException::class);

    expect($this->ticket->responses()->where('type', 'respon_awal')->count())->toBe(1);
});

test('respon substantif tetap bisa dikirim setelah ada respon awal', function () {
    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_awal'))
        ->assertCreated();

    $this->actingAs($this->operator)
        ->postJson(replyUrl($this->ticket, $this->operator), replyPayload('respon_substantif'))
        ->assertCreated();

    expect($this->ticket->responses()->where('type', 'respon_substantif')->count())->toBe(1);
    expect($this->ticket->fresh()->status)->toBe('respon_substantif');
});

/*
|--------------------------------------------------------------------------
| A2 — Idempotency key
|--------------------------------------------------------------------------
*/

test('permintaan kembar dengan idempotency key sama hanya menyimpan satu baris', function () {
    $key = (string) Str::uuid();

    $first = $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif', $key));
    $second = $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif', $key));

    $first->assertCreated();
    $second->assertCreated();

    expect($this->ticket->responses()->count())->toBe(1);
    expect($first->json('data.response_id'))->toBe($second->json('data.response_id'));
});

test('idempotency key berbeda tetap menyimpan balasan terpisah', function () {
    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif'))
        ->assertCreated();

    $this->actingAs($this->operator)
        ->postJson(replyUrl($this->ticket, $this->operator), replyPayload('respon_substantif'))
        ->assertCreated();

    expect($this->ticket->responses()->count())->toBe(2);
});

test('idempotency key tidak valid ditolak oleh validasi', function () {
    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_awal', 'bukan-uuid'))
        ->assertStatus(422)
        ->assertJsonValidationErrors('idempotency_key');
});

/*
|--------------------------------------------------------------------------
| A1 — Status hanya boleh maju
|--------------------------------------------------------------------------
*/

test('status tiket tidak pernah turun dan versi naik setiap ada balasan', function () {
    $this->ticket->update(['status' => 'respon_substantif', 'version' => 3]);

    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif'))
        ->assertCreated();

    expect($this->ticket->fresh()->status)->toBe('respon_substantif');
    expect($this->ticket->fresh()->version)->toBe(4);
});

test('expected_version yang usang tetap diterima untuk respon substantif', function () {
    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif', null, ['expected_version' => 99]))
        ->assertCreated();

    expect($this->ticket->responses()->count())->toBe(1);
});

/*
|--------------------------------------------------------------------------
| A1 — Tiket selesai tidak bisa dibalas
|--------------------------------------------------------------------------
*/

test('tiket selesai ditolak 409 lewat endpoint json', function () {
    $this->ticket->update(['status' => 'selesai', 'completed_at' => now()]);

    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif'))
        ->assertStatus(409)
        ->assertJsonPath('data.code', 'already_completed');

    expect($this->ticket->responses()->count())->toBe(0);
});

/*
|--------------------------------------------------------------------------
| A3 — Broadcast
|--------------------------------------------------------------------------
*/

// test('event balasan di broadcast tepat satu kali setelah commit', function () {
//     $this->actingAs($this->admin)
//         ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_awal'))
//         ->assertCreated();

//     Event::assertDispatchedTimes(TicketResponseCreated::class, 1);
//     Event::assertDispatchedTimes(TicketUpdated::class, 1);
//     Event::assertDispatchedTimes(InboxUpdated::class, 1);

//     Event::assertDispatched(TicketResponseCreated::class, function (TicketResponseCreated $event) {
//         // Broadcast dikirim inline (bukan lewat antrean `broadcasts`) supaya balasan
//         // langsung terlihat petugas lain yang membuka tiket yang sama.
//         return $event instanceof ShouldBroadcastNow
//             && $event->ticket->id === $this->ticket->id
//             && $event->response->type === 'respon_awal';
//     });

//     Event::assertDispatched(TicketUpdated::class, fn (TicketUpdated $event) => $event instanceof ShouldBroadcastNow);
// });

test('balasan yang di replay tidak menyiarkan event kedua', function () {
    $key = (string) Str::uuid();

    $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif', $key))->assertCreated();
    $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif', $key))->assertCreated();

    Event::assertDispatchedTimes(TicketResponseCreated::class, 1);
});

test('payload broadcast tidak membocorkan data pelapor', function () {
    $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_awal'))->assertCreated();

    Event::assertDispatched(TicketResponseCreated::class, function (TicketResponseCreated $event) {
        $payload = $event->broadcastWith();
        $encoded = json_encode($payload);

        expect($payload)->toHaveKeys(['ticket_id', 'status', 'version', 'actor_id', 'response']);
        expect($encoded)->not->toContain('rina@example.com');
        expect($encoded)->not->toContain('access_code');

        return true;
    });
});

test('event tidak dikirim ketika penyimpanan ditolak', function () {
    $this->ticket->update(['status' => 'selesai', 'completed_at' => now()]);

    $this->actingAs($this->admin)
        ->postJson(replyUrl($this->ticket, $this->admin), replyPayload('respon_substantif'))
        ->assertStatus(409);

    Event::assertNotDispatched(TicketResponseCreated::class);
    Event::assertNotDispatched(TicketUpdated::class);
    Event::assertNotDispatched(InboxUpdated::class);
});

test('event tidak dikirim untuk balasan yang hanya di replay', function () {
    $key = (string) Str::uuid();
    $payload = replyPayload('respon_substantif', $key);

    $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), $payload)->assertCreated();
    Event::fake([TicketResponseCreated::class, TicketUpdated::class, InboxUpdated::class, \App\Events\TicketResponseEmailStatusUpdated::class]);

    $this->actingAs($this->admin)->postJson(replyUrl($this->ticket, $this->admin), $payload)->assertCreated();

    Event::assertNotDispatched(TicketResponseCreated::class);
});

/*
|--------------------------------------------------------------------------
| A4 — Otorisasi channel
|--------------------------------------------------------------------------
*/

test('operator boleh subscribe ke presence channel tiket yang ada', function () {
    $this->actingAs($this->operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-ticket.'.$this->ticket->id,
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonStructure(['auth']);
});

test('presence channel tiket yang tidak ada ditolak', function () {
    $this->actingAs($this->admin)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-ticket.999999',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

test('operator tidak boleh subscribe ke presence channel tiket yang tidak ada', function () {
    $this->actingAs($this->operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-ticket.999999',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

test('tamu tidak boleh subscribe ke presence channel tiket', function () {
    $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-ticket.'.$this->ticket->id,
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('operator boleh subscribe ke private channel inbox laporan masuk', function () {
    $this->actingAs($this->operator)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-inbox.laporan-masuk',
            'socket_id' => '1234.5678',
        ])
        ->assertOk();
});

test('scope inbox yang tidak dikenal ditolak', function () {
    $this->actingAs($this->admin)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-inbox.apakah-rawan',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Action — dipanggil langsung (tanpa HTTP)
|--------------------------------------------------------------------------
*/

test('action menolak respon awal ganda dan melempar exception domain', function () {
    $action = app(ReplyToTicket::class);

    $action->handle($this->ticket, $this->admin, [
        'type' => 'respon_awal',
        'message' => 'Respon awal pertama dari petugas.',
        'idempotency_key' => (string) Str::uuid(),
    ]);

    expect(fn () => $action->handle($this->ticket, $this->operator, [
        'type' => 'respon_awal',
        'message' => 'Respon awal kedua dari petugas lain.',
        'idempotency_key' => (string) Str::uuid(),
    ]))->toThrow(TicketAlreadyRespondedException::class);
});

test('row lock tiket menjaga agar dua penulis tidak saling menimpa versi', function () {
    $action = app(ReplyToTicket::class);

    $action->handle($this->ticket, $this->admin, [
        'type' => 'respon_awal',
        'message' => 'Respon awal pertama dari petugas.',
        'idempotency_key' => (string) Str::uuid(),
    ]);

    $action->handle($this->ticket, $this->operator, [
        'type' => 'respon_substantif',
        'message' => 'Tindak lanjut pertama dari petugas lain.',
        'idempotency_key' => (string) Str::uuid(),
    ]);

    expect($this->ticket->fresh()->version)->toBe(2);
    expect($this->ticket->responses()->count())->toBe(2);
});

test('action mengembalikan respons yang sama saat idempotency key diulang', function () {
    $action = app(ReplyToTicket::class);
    $key = (string) Str::uuid();

    $payload = ['type' => 'respon_substantif', 'message' => 'Balasan sekali saja.', 'idempotency_key' => $key];

    $first = $action->handle($this->ticket, $this->admin, $payload);
    $second = $action->handle($this->ticket, $this->admin, $payload);

    expect($second->response->id)->toBe($first->response->id);
    expect($second->replayed)->toBeTrue();
    expect($this->ticket->responses()->count())->toBe(1);
});
