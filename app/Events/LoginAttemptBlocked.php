<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Ada percobaan login ke akun pengguna dari perangkat lain, sementara sesi
 * lamanya masih aktif. Sesi pengguna yang aktif diberi tahu lewat toast.
 *
 * Tidak membawa email maupun alamat IP — hanya waktu relatif.
 */
class LoginAttemptBlocked implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public int $userId,
        public ?string $device = null,
        public ?string $occurredAtHuman = null,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.'.$this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'login.attempt.blocked';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'device' => $this->device,
            'occurred_at' => $this->occurredAtHuman,
            'message' => 'Ada percobaan login ke akun Anda dari perangkat lain'.($this->device !== null ? ' ('.$this->device.')' : '').'.',
        ];
    }
}
