<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event dipublikasikan setelah AuditLog disimpan ke database.
 * Dijalankan setelah commit lewat queue agar tidak menghambat aksi pengguna.
 *
 * Payload hanya berisi ringkas tanpa data sensitif (tidak ada laporan/komentar/kata sandi).
 */
class AuditLogCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $eventType,
        public string $category,
        public ?string $severity = 'info',
        public ?int $actorId = null,
        public ?string $actorName = null,
        public ?string $actorRole = null,
        public ?int $ticketId = null,
        public ?string $ip = null,
        public ?string $userAgent = null,
        public array $meta = [],
        public ?int $id = null,
        public ?string $ticketNumber = null,
    ) {}

    public function broadcastOn(): array
    {
        // Hanya channel privat untuk admin
        return [
            new PrivateChannel('audit.log'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'audit.log.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->id,
            'event_type' => $this->eventType,
            'category' => $this->category,
            'severity' => $this->severity,
            'actor_id' => $this->actorId,
            'actor_name' => $this->actorName,
            'actor_role' => $this->actorRole,
            'ticket_id' => $this->ticketId,
            'ticket_number' => $this->ticketNumber,
            'ip' => $this->ip,
            // user_agent dan meta dimasukkan dengan hati-hati, tanpa data sensitif
            'meta_keys' => array_keys($this->meta ?? []),
            'created_at' => now()->toIso8601String(),
        ];
    }
}
