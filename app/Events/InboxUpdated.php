<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal ringan untuk halaman daftar: ada tiket yang berubah status / dibalas.
 * Dipakai frontend untuk menyegarkan baris terkait dan badge hitungan
 * (dengan debounce) tanpa reload penuh.
 *
 * ShouldBroadcastNow (bukan ShouldBroadcast): bila antrean `broadcasts` tidak
 * diproses worker, badge dan angka tab tidak pernah menyegarkan sampai petugas
 * memuat ulang halaman. Payload-nya kecil (id + status), jadi aman inline.
 *
 * Tidak ada afterCommit: pemanggil dispatch setelah status tiket tersimpan.
 */
class InboxUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

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
