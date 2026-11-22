<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RatingSettingChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public bool $enabled,
        public ?string $changedBy = null,
        public ?string $changedAt = null,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];
        foreach (['staff', 'settings', 'settings.staff', 'dashboard.staff'] as $name) {
            $channels[] = new PrivateChannel($name);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'rating.setting.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'enabled' => $this->enabled,
            'changed_by' => $this->changedBy,
            'changed_at' => $this->changedAt,
        ];
    }
}
