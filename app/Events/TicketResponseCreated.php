<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Support\TicketResponsePayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Balasan baru tersimpan pada tiket.
 *
 * Broadcast ke dua kanal:
 *  - `ticket.{ticket_number}` (publik, dinormalisasi lewat
 *    `Ticket::publicChannelName()` karena nomor tiket memuat `/`) supaya halaman
 *    /check pelapor ikut ter-update.
 *  - `ticket.{id}` (presence, terautentikasi) untuk halaman detail Laporan Masuk
 *    yang dipakai banyak petugas secara bersamaan.
 *
 * ShouldBroadcastNow (bukan ShouldBroadcast): balasan baru harus langsung terlihat
 * petugas lain yang membuka tiket yang sama. Kalau lewat antrean, pengiriman
 * bergantung pada worker `queue:work --queue=broadcasts` dan `--sleep`-nya,
 * sehingga balasan bisa terlambat beberapa detik — atau tidak sama sekali
 * sampai worker di-restart.
 * Payload-nya kecil (satu respons), jadi biaya broadcast inline tidak berarti.
 *
 * Tidak ada afterCommit: seluruh pemanggil (App\Actions\ReplyToTicket) dispatch
 * setelah transaksi database selesai commit.
 */
class TicketResponseCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public TicketResponse $response,
        public ?User $actor = null,
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

    public function broadcastAs(): string
    {
        return 'ticket.response.created';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = TicketResponsePayload::from($this->response, $this->ticket);

        $payload['user_role'] = $this->actor?->role?->value;

        return [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'status' => $this->ticket->status,
            'version' => $this->ticket->version,
            'actor_id' => $this->actor?->id,
            'response' => $payload,
        ];
    }
}
