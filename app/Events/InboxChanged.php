<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal agregat untuk halaman daftar Laporan Masuk.
 *
 * Dipakai dua skenario:
 *  - satu tiket berubah (balasan baru, tiket selesai manual), dan
 *  - satu batch auto close, jadi cukup SATU event untuk seluruh tiket.
 *
 * Payload sengaja tidak memuat angka hitungan maupun data pelapor: angka
 * berbeda per role (operator hanya boleh melihat tiketnya) dan kanal ini bisa
 * dibaca staf. Klien cukup memicu partial reload yang sudah terotorisasi.
 */
class InboxChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $queue = 'broadcasts';

    /**
     * @param  array<int, int>  $ticketIds
     */
    public function __construct(
        public string $reason,
        public array $ticketIds = [],
        public int $closedCount = 0,
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
        return 'inbox.changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'reason' => $this->reason,
            'ticket_ids' => array_values($this->ticketIds),
            'closed_count' => $this->closedCount,
        ];
    }
}
