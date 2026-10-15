<?php

declare(strict_types=1);

use App\Jobs\SendTicketResponseNotification;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function makeTicketWithResponse(array $responseOverrides = []): array
{
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $admin = User::factory()->admin()->create();

    $ticket = Ticket::create([
        'ticket_number' => 'TEST-RESEND-'.random_int(1000, 9999),
        'period' => now()->format('Y-m'),
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Tiket Uji Kirim Ulang',
        'channel_id' => $channel->id,
        'content' => 'Isi tiket untuk pengujian kirim ulang email.',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'reporter_email' => 'pelapor.lama@gmail.com',
        'created_by' => $admin->id,
    ]);

    $response = TicketResponse::create(array_merge([
        'ticket_id' => $ticket->id,
        'user_id' => $admin->id,
        'type' => 'respon_awal',
        'message' => 'Terima kasih atas laporannya.',
        'email_sent_at' => now()->subHour(),
        'email_status' => 'failed',
        'email_failed_at' => now()->subMinutes(30),
        'email_error' => 'Connection timed out',
    ], $responseOverrides));

    return [$ticket, $response, $admin];
}

test('admin can resend failed response email with new email', function () {
    Queue::fake();
    [$ticket, $response, $admin] = makeTicketWithResponse();

    actingAs($admin)
        ->from(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->withHeader('Accept', 'text/html')
        ->post(route('dashboard.admin.laporan-masuk.responses.resend', [
            'ticket' => $ticket->id,
            'response' => $response->id,
        ]), [
            'reporter_email' => 'pelapor.baru@gmail.com',
        ])
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    // Email pelapor diperbarui
    expect($ticket->fresh()->reporter_email)->toBe('pelapor.baru@gmail.com');

    // Flag idempotensi di-reset
    $freshResponse = $response->fresh();
    expect($freshResponse->email_sent_at)->toBeNull()
        ->and($freshResponse->email_status?->value ?? $freshResponse->email_status)->toBe('pending')
        ->and($freshResponse->email_failed_at)->toBeNull()
        ->and($freshResponse->email_error)->toBeNull();

    // Job di-dispatch ulang
    Queue::assertPushed(SendTicketResponseNotification::class);
});

test('operator cannot resend email (403)', function () {
    [$ticket, $response] = makeTicketWithResponse();
    $operator = User::factory()->operator()->create();

    actingAs($operator)
        ->post(route('dashboard.admin.laporan-masuk.responses.resend', [
            'ticket' => $ticket->id,
            'response' => $response->id,
        ]), [
            'reporter_email' => 'baru@gmail.com',
        ])
        ->assertForbidden();
});

test('resend rejects placeholder email', function () {
    [$ticket, $response, $admin] = makeTicketWithResponse();

    actingAs($admin)
        ->from(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->withHeader('Accept', 'text/html')
        ->post(route('dashboard.admin.laporan-masuk.responses.resend', [
            'ticket' => $ticket->id,
            'response' => $response->id,
        ]), [
            'reporter_email' => 'asd@gmail.com',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('reporter_email');
});

test('resend rejects response that is not failed or bounced', function () {
    [$ticket, $response, $admin] = makeTicketWithResponse(['email_status' => 'sent']);

    actingAs($admin)
        ->from(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->post(route('dashboard.admin.laporan-masuk.responses.resend', [
            'ticket' => $ticket->id,
            'response' => $response->id,
        ]), [
            'reporter_email' => 'baru@gmail.com',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('reporter_email');
});
