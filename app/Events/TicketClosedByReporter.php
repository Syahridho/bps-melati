<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketClosedByReporter implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, int>  $operatorUserIds
     */
    public function __construct(
        public int $ticketId,
        public string $ticketNumber,
        public string $status,
        public ?int $rating = null,
        public ?string $ratingComment = null,
        public ?string $ratedAt = null,
        public ?string $closedAt = null,
        public array $operatorUserIds = [],
    ) {}

    /**
     * @return array<int, PresenceChannel|PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PresenceChannel('ticket.'.$this->ticketId),
            new PrivateChannel('laporan.admin'),
        ];

        foreach ($this->operatorUserIds as $userId) {
            $channels[] = new PrivateChannel('laporan.operator.'.$userId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'ticket.closed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'ticket_number' => $this->ticketNumber,
            'status' => $this->status,
            'rating' => $this->rating,
            'rating_comment' => $this->ratingComment,
            'rated_at' => $this->ratedAt,
            'closed_at' => $this->closedAt,
        ];
    }
}
