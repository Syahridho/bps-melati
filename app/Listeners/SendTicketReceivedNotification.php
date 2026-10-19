<?php

namespace App\Listeners;

use App\Events\TicketCreated;
use App\Mail\TicketReceivedMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendTicketReceivedNotification implements ShouldQueue
{
    public string $queue = 'notifications';

    public int $tries = 3;

    public bool $afterCommit = true;

    /**
     * @var list<int>
     */
    public array $backoff = [10, 60, 300];

    /**
     * Handle the event.
     */
    public function handle(TicketCreated $event): void
    {
        $ticket = $event->ticket->fresh();

        if ($ticket === null || blank($ticket->reporter_email)) {
            return;
        }

        $cacheKey = "ticket-received-mail:{$ticket->id}";
        if (! Cache::add($cacheKey, true, now()->addDay())) {
            return;
        }

        Mail::to($ticket->reporter_email)->queue(new TicketReceivedMail($ticket));
    }

    public function failed(TicketCreated $event, ?Throwable $exception): void
    {
        $ticket = $event->ticket;
        Log::error("Gagal mengirim email konfirmasi tiket {$ticket?->ticket_number}: {$exception?->getMessage()}");
    }
}
