<?php

namespace App\Notifications;

use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Notifikasi ringan untuk halaman daftar laporan (Input Data, Laporan Masuk, Laporan Selesai).
 *
 * Payload sengaja minimal: tidak mengirim isi laporan atau data pribadi pelapor.
 * Klien cukup mengambil data lengkap lewat Inertia sehingga otorisasi server tetap berlaku.
 *
 * Jenis notifikasi:
 *  - laporan_masuk: laporan baru masuk dari pelapor (penerima: admin + operator terkait)
 *  - laporan_selesai: laporan berstatus selesai (penerima: admin + pemilik/penerima tugas)
 *  - laporan_dibalas: pelapor membalas tanggapan (penerima: admin + pemilik/penerima tugas)
 *  - input_data: admin/operator menginput data baru (penerima: admin + operator terkait)
 *
 * ShouldQueue: notifikasi dikirim melalui antrean agar tidak memblokir request.
 * via() = ['database', 'broadcast']: disimpan ke tabel notifications dan disiarkan lewat Reverb.
 */
class LaporanNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  string  $type  Salah satu dari: laporan_masuk | laporan_selesai | laporan_dibalas | input_data
     * @param  array{id: int, ticket_number: string, type: string, title: string, message?: string, url?: string, actor_name?: string|null}  $data
     * @param  array<int, int>  $recipientUserIds  ID pengguna yang berhak menerima notifikasi
     */
    public function __construct(
        public string $type,
        public array $data,
        public array $recipientUserIds = [],
    ) {
        // ID unik per instance notifikasi (bukan id tiket) agar tidak bentrok
        // saat menyimpan banyak notifikasi untuk tiket yang sama ke DB dan broadcast.
        $this->notificationId = (string) Str::uuid();
    }

    /** ID unik notifikasi ini (UUID), digunakan untuk DB dan broadcast payload. */
    public string $notificationId;

    /**
     * Saluran notifikasi: database + broadcast.
     * Dilewati bila fitur notifikasi dinonaktifkan (config/notifications.php enabled=false),
     * mis. saat seeder/import massal.
     */
    public function via(object $notifiable): array
    {
        if (! config('notifications.enabled', true)) {
            return [];
        }

        // Hindari notifikasi dobel: jika dedup aktif dan notifikasi yang sama
        // (tipe + ticket_number + penerima) sudah dikirim dalam TTL, lewati.
        if ($this->shouldDeduplicate($notifiable)) {
            return [];
        }

        $channels = ['database', 'broadcast'];

        // Hampirkan push bila kunci VAPID tersimpan di server.
        if (filled(config('webpush.vapid.private_key'))) {
            $channels[] = WebPushChannel::class;
        }

        return $channels;
    }

    /**
     * Menandai bahwa notifikasi sudah diproses lewat dedup cache.
     * Digunakan sebagai penanda internal saat deduplikasi aktif.
     */
    public function shouldDeduplicate(object $notifiable): bool
    {
        if (! config('notifications.dedup_enabled', true)) {
            return false;
        }

        $key = 'notification:dedup:'.$this->type.':'.$this->data['ticket_number'].':'.(int) $notifiable->getKey();
        $ttl = config('notifications.dedup_ttl_seconds', 300);

        if (Cache::has($key)) {
            return true;
        }

        Cache::put($key, true, Carbon::now()->addSeconds($ttl));

        return false;
    }

    /**
     * Data yang disimpan ke tabel notifications (toDatabase).
     */
    public function toArray(object $notifiable): array
    {
        return [
            'id' => $this->notificationId,
            'type' => $this->type,
            'title' => $this->data['title'] ?? null,
            'message' => $this->data['message'] ?? null,
            'ticket_number' => $this->data['ticket_number'] ?? null,
            'url' => $this->data['url'] ?? null,
            'actor_name' => $this->data['actor_name'] ?? null,
            'read_at' => null,
            'created_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Payload yang disiarkan lewat Reverb (toBroadcast).
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->notificationId,
            'type' => $this->type,
            'title' => $this->data['title'],
            'message' => $this->data['message'] ?? '',
            'ticket_number' => $this->data['ticket_number'] ?? null,
            'url' => $this->data['url'] ?? null,
            'actor_name' => $this->data['actor_name'] ?? null,
            'read_at' => null,
            'created_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Payload yang dikirim lewat Web Push (toWebPush).
     *
     * Isi sengaja ringkas: judul, isi singkat, nomor tiket, dan URL detail.
     * Tidak memuat isi laporan lengkap atau data pribadi pelapor.
     */
    public function toWebPush(object $notifiable): WebPushMessage
    {
        Log::info('[PUSH-TIMING] T2 toWebPush processed', [
            'ticket_number' => $this->data['ticket_number'] ?? null,
            'notification_id' => $this->notificationId,
            't2' => now()->format('Y-m-d H:i:s.u'),
        ]);

        return (new WebPushMessage())
            ->title($this->data['title'] ?? 'Notifikasi baru')
            ->body($this->data['message'] ?? '')
            ->icon('/logo-melati.png')
            ->badge('/logo-melati.png')
            ->tag($this->data['ticket_number'] ?? $this->notificationId)
            ->renotify()
            ->options([
                'urgency' => 'high',
                'TTL' => 86400,
            ])
            ->data([
                'url' => $this->data['url'] ?? null,
                'ticket_number' => $this->data['ticket_number'] ?? null,
                'type' => $this->type,
                'notification_id' => $this->notificationId,
            ]);
    }

    /**
     * Nama event broadcast untuk Reverb.
     */
    public function broadcastAs(): string
    {
        return 'notifications';
    }

    /**
     * Channel broadcast: channel privat per pengguna `App.Models.User.{id}`.
     * Hanya pemilik id yang boleh berlangganan (sudah diatur di routes/channels.php).
     */
    public function broadcastOn(): array
    {
        $channels = [];

        foreach ($this->recipientUserIds as $userId) {
            $channels[] = new \Illuminate\Broadcasting\PrivateChannel('App.Models.User.' . (int) $userId);
        }

        return $channels;
    }

    /**
     * Buat payload notifikasi untuk laporan baru masuk dari pelapor.
     *
     * @param  Ticket  $ticket  Tiket yang baru dibuat
     * @param  array<int, int>  $recipientUserIds  ID pengguna yang berhak menerima
     * @return self
     */
    public static function forNewReport(Ticket $ticket, array $recipientUserIds = []): self
    {
        $type = $ticket->classification;
        $typeLabel = match ($type) {
            'pengaduan' => 'Pengaduan',
            'aspirasi' => 'Aspirasi',
            'permintaan_informasi' => 'Permintaan Informasi',
            default => 'Laporan',
        };

        return new self(
            type: 'laporan_masuk',
            data: [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'type' => $ticket->classification,
                'title' => "{$typeLabel} baru masuk",
                'message' => Str::limit((string) $ticket->title ?? (string) $ticket->content, 100),
                'url' => '/dashboard/admin/laporan-masuk/' . $ticket->ticket_number,
                'actor_name' => $ticket->reporter_name ?? null,
            ],
            recipientUserIds: $recipientUserIds,
        );
    }

    /**
     * Buat payload notifikasi untuk laporan yang selesai.
     *
     * @param  Ticket  $ticket  Tiket yang selesai
     * @param  array<int, int>  $recipientUserIds  ID pengguna yang berhak menerima
     * @return self
     */
    public static function forCompleted(Ticket $ticket, array $recipientUserIds = []): self
    {
        return new self(
            type: 'laporan_selesai',
            data: [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'type' => $ticket->classification,
                'title' => 'Laporan selesai',
                'message' => Str::limit((string) $ticket->title ?? (string) $ticket->content, 100),
                'url' => '/dashboard/admin/laporan-selesai/' . $ticket->ticket_number,
                'actor_name' => null,
            ],
            recipientUserIds: $recipientUserIds,
        );
    }

    /**
     * Buat payload notifikasi untuk laporan yang dibalas pelapor.
     *
     * @param  Ticket  $ticket  Tiket yang dibalas
     * @param  array<int, int>  $recipientUserIds  ID pengguna yang berhak menerima
     * @return self
     */
    public static function forRepliedByReporter(Ticket $ticket, array $recipientUserIds = []): self
    {
        return new self(
            type: 'laporan_dibalas',
            data: [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'type' => $ticket->classification,
                'title' => 'Balasan baru dari pelapor',
                'message' => 'Pelapor telah membalas tanggapan Anda.',
                'url' => '/dashboard/admin/laporan-masuk/' . $ticket->ticket_number,
                'actor_name' => $ticket->reporter_name ?? null,
            ],
            recipientUserIds: $recipientUserIds,
        );
    }

    /**
     * Buat payload notifikasi untuk input data baru oleh admin/operator.
     *
     * @param  Ticket  $ticket  Tiket input data baru
     * @param  array<int, int>  $recipientUserIds  ID pengguna yang berhak menerima
     * @return self
     */
    public static function forInputData(Ticket $ticket, array $recipientUserIds = []): self
    {
        return new self(
            type: 'input_data',
            data: [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'type' => $ticket->classification,
                'title' => 'Data tiket baru ditambahkan',
                'message' => Str::limit((string) $ticket->title ?? (string) $ticket->content, 100),
                'url' => '/dashboard/admin/input-data/' . $ticket->ticket_number,
                'actor_name' => null,
            ],
            recipientUserIds: $recipientUserIds,
        );
    }
}
