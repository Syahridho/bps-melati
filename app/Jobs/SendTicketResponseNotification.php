<?php

namespace App\Jobs;

use App\Mail\TicketResponseSubmitted;
use App\Models\TicketResponse;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
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
        $response = $this->response->fresh();

        if ($response === null || $response->email_sent_at !== null) {
            return;
        }

        $ticket = $response->ticket;

        if ($ticket === null || blank($ticket->reporter_email)) {
            return;
        }

        Mail::to($ticket->reporter_email)->queue(new TicketResponseSubmitted($ticket, $response));

        $response->forceFill(['email_sent_at' => now()])->save();
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Gagal mengirim notifikasi email tanggapan: '.$exception->getMessage(), [
            'response_id' => $this->response->id,
            'ticket_id' => $this->response->ticket_id,
        ]);
    }
}
