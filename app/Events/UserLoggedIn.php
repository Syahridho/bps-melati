<?php

namespace App\Events;

use App\Models\User;
use App\Support\IpMasker;
use App\Support\UserAgentParser;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserLoggedIn implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public User $user)
    {
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin.operators'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'UserLoggedIn';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->user->id,
            'last_login_at' => $this->user->last_login_at?->toIso8601String(),
            'last_login_device' => UserAgentParser::label($this->user->last_login_agent),
            'last_login_ip' => IpMasker::mask($this->user->last_login_ip),
            'has_session' => filled($this->user->current_session_id),
        ];
    }
}
