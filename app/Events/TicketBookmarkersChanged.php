<?php

namespace App\Events;

use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketBookmarkersChanged implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public int $ticketId,
        public array $others,
        public int $othersCount
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel("ticket.{$this->ticketId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.bookmarkers.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'others' => $this->others,
            'others_count' => $this->othersCount,
        ];
    }
}
