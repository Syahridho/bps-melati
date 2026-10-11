<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Support\TicketResponsePayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Status / isi tiket berubah (balasan baru, pelapor membalas, tiket selesai).
 *
 * Kanal publik `ticket.{ticket_number}` tetap dipertahankan karena halaman
 * /check milik pelapor belum login dan hanya boleh memakai kanal publik. Nama
 * kanal dinormalisasi lewat `Ticket::publicChannelName()` karena nomor tiket
 * memuat `/` yang tidak diizinkan protokol Pusher/Reverb.
 *
 * ShouldBroadcastNow (bukan ShouldBroadcast): halaman /check menunggu status
 * terbaru dari petugas, jadi penundaan akibat antrean `broadcasts` (atau worker
 * yang mati) langsung terasa oleh pelapor. Payload kecil, aman dikirim inline.
 *
 * Tidak ada afterCommit: pemanggil (App\Actions\ReplyToTicket dan
 * CheckTicketController) dispatch setelah transaksi database selesai commit.
 */
class TicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public ?TicketResponse $response = null,
        public ?int $actorId = null,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel(Ticket::publicChannelName($this->ticket->ticket_number)),
            new PresenceChannel('ticket.'.$this->ticket->id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'status' => $this->ticket->status,
            'version' => $this->ticket->version,
            'actor_id' => $this->actorId,
        ];

        if ($this->response !== null) {
            $payload['response'] = TicketResponsePayload::from($this->response, $this->ticket);
        }

        return $payload;
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }
}
