<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal ringan untuk halaman daftar laporan: ada tiket yang dibuat,
 * diubah, ditandai/lepas tandai, atau kadar pengawasan diubah.
 *
 * Payload sengaja minimal (tanpa isi laporan atau data pribadi pelapor).
 * Klien cukup memicu partial reload yang sudah terotorisasi via Inertia,
 * sehingga otorisasi server tetap berlaku setelah update masuk.
 *
 * ShouldBroadcast + ShouldDispatchAfterCommit: event hanya terkirim setelah
 * transaksi DB benar-benar commit, sehingga data yang dibaca klien sudah
 * konsisten.
 */
class LaporanChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, int>  $operatorUserIds  ID operator yang berhak menerima event (selain admin)
     */
    public function __construct(
        public string $action, // 'created' | 'updated' | 'flagged' | 'unflagged' | 'pengawasan_activated' | 'pengawasan_deactivated'
        public int $ticketId,
        public string $ticketNumber,
        public string $type, // classification: pengaduan | aspirasi | permintaan_informasi
        public ?int $actorId = null,
        public array $operatorUserIds = [],
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('laporan.admin'),
        ];

        foreach ($this->operatorUserIds as $userId) {
            $channels[] = new PrivateChannel('laporan.operator.' . $userId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'laporan.changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'id' => $this->ticketId,
            'ticket_number' => $this->ticketNumber,
            'type' => $this->type,
            'actor_id' => $this->actorId,
        ];
    }
}
