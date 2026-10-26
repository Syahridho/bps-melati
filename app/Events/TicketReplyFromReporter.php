<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\UserRole;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Notifikasi ringan "pelapor membalas" untuk seluruh petugas yang berhak.
 *
 * Berbeda dengan TicketUpdated/TicketResponseCreated yang memakai presence
 * channel per tiket (hanya terkirim ke petugas yang sedang membuka tiket itu),
 * event ini dikirim ke kanal privat per pengguna `App.Models.User.{id}` supaya
 * toast tetap muncul di halaman dashboard mana pun — termasuk /dashboard dan
 * /input-data bagi operator tim.
 *
 * Scoping hak akses dihitung di server (bukan di klien) mengikuti aturan akses
 * dashboard yang sudah ada:
 *  - admin          : semua tiket (Laporan Masuk & Input Data),
 *  - operator       : semua tiket (punya akses kedua daftar),
 *  - operator_tim   : hanya tiket Input Data (source_app = admin).
 * Penerima difilter `is_active` agar akun nonaktif tidak menerima siaran.
 *
 * ShouldBroadcastNow: payload kecil dan toast harus segera terlihat; tidak
 * bergantung pada worker antrean `broadcasts`. Pemanggil membungkus dispatch
 * dengan SafeBroadcast agar Reverb yang mati tidak menggagalkan request.
 */
class TicketReplyFromReporter implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public TicketResponse $response,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $roles = $this->ticket->source_app === 'admin'
            ? [UserRole::Admin, UserRole::Operator, UserRole::OperatorTim]
            : [UserRole::Admin, UserRole::Operator];

        return User::query()
            ->where('is_active', true)
            ->whereIn('role', $roles)
            ->pluck('id')
            ->map(fn ($id): PrivateChannel => new PrivateChannel('App.Models.User.'.(int) $id))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'ticket.reply.from.reporter';
    }

    /**
     * Payload sengaja minimal: tidak mengirim isi tiket, email, atau nomor WA
     * pelapor. Excerpt dipotong agar toast tetap ringkas.
     *
     * `url` memakai rute admin sebagai nilai netral; frontend membangun ulang
     * URL sesuai role penerima (operator/operator_tim memakai prefix
     * `dashboard.operator`). `is_input_data` menandai rute detail yang tepat.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'reply_id' => $this->response->id,
            'reporter_name' => $this->ticket->reporter_name ?: 'Pelapor',
            'excerpt' => Str::limit((string) $this->response->message, 100),
            'has_attachment' => $this->response->attachments()->exists(),
            'created_at' => ($this->response->created_at ?? now())->toIso8601String(),
            'is_input_data' => $this->ticket->source_app === 'admin',
            'url' => $this->ticket->source_app === 'admin'
                ? '/dashboard/admin/input-data/'.$this->ticket->ticket_number
                : '/dashboard/admin/laporan-masuk/'.$this->ticket->ticket_number,
        ];
    }
}
