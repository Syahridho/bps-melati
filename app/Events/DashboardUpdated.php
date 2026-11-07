<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DashboardUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param array<string, mixed> $ticketSummary
     */
    public function __construct(
        public string $type,
        public int $ticketId,
        public ?string $classification = null,
        public ?string $channel = null,
        public ?string $oldStatus = null,
        public ?string $newStatus = null,
        public array $ticketSummary = [],
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('dashboard.admin'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'ticket_id' => $this->ticketId,
            'classification' => $this->classification,
            'channel' => $this->channel,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'ticket' => $this->ticketSummary,
        ];
    }
}
