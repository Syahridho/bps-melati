<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal ringan untuk halaman daftar: ada tiket yang berubah status / dibalas.
 * Dipakai frontend untuk menyegarkan baris terkait dan badge hitungan
 * (dengan debounce) tanpa reload penuh.
 */
class InboxUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public Ticket $ticket,
        public ?string $actorName = null,
        public ?User $actor = null,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('inbox.laporan-masuk'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'inbox.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'status' => $this->ticket->status,
            'version' => $this->ticket->version,
            'is_read' => $this->ticket->is_read,
            'actor_id' => $this->actor?->id,
            'actor_name' => $this->actorName,
        ];
    }
}
