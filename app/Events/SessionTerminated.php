<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sesi pengguna diakhiri oleh pihak lain (takeover, paksa logout admin,
 * penonaktifan akun, penggantian password).
 *
 * Broadcast ke private channel `user.{id}` sehingga browser yang sedang aktif
 * bisa menampilkan modal dan langsung kembali ke halaman login.
 *
 * Event ini TIDAK pernah membawa data sensitif: hanya kode alasan.
 */
class SessionTerminated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    public function __construct(
        public int $userId,
        public string $reason = 'forced_logout',
        public ?int $actorId = null,
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
        return 'session.terminated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'reason' => $this->reason,
            'message' => __('session.terminated_reasons.'.$this->reason, ['reason' => $this->reason]),
            'actor_id' => $this->actorId,
        ];
    }
}
