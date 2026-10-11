<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Support\TicketResponsePayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Status / isi tiket berubah (balasan baru, pelapor membalas, tiket selesai).
 *
 * Kanal publik `ticket.{ticket_number}` tetap dipertahankan karena halaman
 * /check milik pelapor Spanyol belum login dan hanya boleh memakai kanal publik.
 */
class TicketUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public Ticket $ticket,
        public ?TicketResponse $response = null,
        public ?int $actorId = null,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('ticket.'.$this->ticket->ticket_number),
            new PresenceChannel('ticket.'.$this->ticket->id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'status' => $this->ticket->status,
            'version' => $this->ticket->version,
            'actor_id' => $this->actorId,
        ];

        if ($this->response !== null) {
            $payload['response'] = TicketResponsePayload::from($this->response, $this->ticket);
        }

        return $payload;
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }
}
