<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Support\TicketResponsePayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Balasan baru tersimpan pada tiket.
 *
 * Broadcast ke dua kanal:
 *  - `ticket.{ticket_number}` (publik) supaya halaman /check pelapor ikut ter-update.
 *  - `ticket.{id}` (presence, terautentikasi) untuk halaman detail Laporan Masuk
 *    yang dipakai banyak petugas secara bersamaan.
 *
 * afterCommit = true: tidak pernah terkirim sebelum baris respons benar-benar commit.
 */
class TicketResponseCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public Ticket $ticket,
        public TicketResponse $response,
        public ?User $actor = null,
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

    public function broadcastAs(): string
    {
        return 'ticket.response.created';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = TicketResponsePayload::from($this->response, $this->ticket);

        $payload['user_role'] = $this->actor?->role?->value;

        return [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'status' => $this->ticket->status,
            'version' => $this->ticket->version,
            'actor_id' => $this->actor?->id,
            'response' => $payload,
        ];
    }
}
