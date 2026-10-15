<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketResponseEmailStatusUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, Queueable, SerializesModels;

    public function __construct(
        public TicketResponse $response,
        public Ticket $ticket,
    ) {
        $this->onQueue('notifications');
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('ticket.'.$this->ticket->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.response.email-status-updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'response_id' => $this->response->id,
            'email_status' => $this->response->email_status?->value ?? $this->response->email_status,
            'email_sent_at' => $this->response->email_sent_at?->toIso8601String(),
            'email_failed_at' => $this->response->email_failed_at?->toIso8601String(),
            'email_error' => $this->response->email_error,
        ];
    }
}
