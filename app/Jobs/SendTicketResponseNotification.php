<?php

namespace App\Jobs;

use App\Events\TicketResponseEmailStatusUpdated;
use App\Mail\TicketResponseSubmitted;
use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Kirim notifikasi balasan ke pelapor via antrean Redis.
 *
 * Idempoten: sebelum mengirim, dicek apakah respons sudah pernah dinotifikasi
 * lewat flag email_sent_at. Retry job (atau reply ganda yang lolos guard) tidak
 * akan mengirim email dua kali. Kegagalan notifikasi tidak pernah membatalkan
 * balasan yang sudah tersimpan di database.
 */
class SendTicketResponseNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @var list<int>
     */
    public array $backoff = [10, 60, 300];

    public function __construct(public TicketResponse $response)
    {
        $this->onQueue('notifications');
    }

    /**
     * Tag untuk pencarian di Horizon dashboard.
     *
     * @return list<string>
     */
    public function tags(): array
    {
        return [
            'notification',
            'ticket:'.$this->response->ticket_id,
            'response:'.$this->response->id,
        ];
    }

    public function handle(): void
    {
        $response = $this->response->fresh(['ticket']);

        if ($response === null || $response->email_sent_at !== null) {
            return;
        }

        $ticket = $response->ticket;

        if ($ticket === null || blank($ticket->reporter_email)) {
            $response->forceFill(['email_status' => 'skipped'])->save();

            $this->clearCacheAndBroadcast($response, $ticket);

            return;
        }

        try {
            Mail::to($ticket->reporter_email)->send(new TicketResponseSubmitted($ticket, $response));

            $response->forceFill([
                'email_sent_at' => now(),
                'email_status' => 'sent',
                'email_failed_at' => null,
                'email_error' => null,
            ])->save();
        } catch (\Throwable $e) {
            $response->forceFill([
                'email_status' => 'failed',
                'email_failed_at' => now(),
                'email_error' => Str::limit($e->getMessage(), 500),
            ])->save();
            throw $e;
        }

        $this->clearCacheAndBroadcast($response, $ticket);
    }

    public function failed(?Throwable $exception): void
    {
        $maskedEmail = $this->maskedEmail();

        Log::error('Gagal mengirim notifikasi email tanggapan.', [
            'response_id' => $this->response->id,
            'ticket_id' => $this->response->ticket_id,
            'email' => $maskedEmail,
            'error' => Str::limit($exception?->getMessage() ?? '', 500),
        ]);

        // Catat kegagalan di database tanpa mengubah email_sent_at (idempotensi tetap utuh)
        $response = $this->response->fresh(['ticket']);
        if ($response !== null) {
            $response->forceFill([
                'email_status' => 'failed',
                'email_failed_at' => now(),
                'email_error' => Str::limit($exception?->getMessage() ?? '', 500),
            ])->save();

            $this->clearCacheAndBroadcast($response, $response->ticket);
        }
    }

    private function clearCacheAndBroadcast(TicketResponse $response, ?Ticket $ticket): void
    {
        if ($ticket !== null) {
            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");

            TicketResponseEmailStatusUpdated::dispatch($response, $ticket);
        }
    }

    private function maskedEmail(): string
    {
        $email = $this->response->ticket?->reporter_email;
        if (blank($email) || ! str_contains($email, '@')) {
            return '***';
        }

        [$local, $domain] = explode('@', $email, 2);

        return Str::limit($local, 3, '***').'@'.$domain;
    }
}
