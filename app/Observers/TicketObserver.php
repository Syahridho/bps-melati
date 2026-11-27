<?php

namespace App\Observers;

use App\Enums\UserRole;
use App\Events\ChannelStatsUpdated;
use App\Events\DashboardUpdated;
use App\Events\LaporanChanged;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Cache;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        $this->dispatchThrottled('created', $ticket);
        $this->dispatchLaporanChanged('created', $ticket);
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // title & reporter_name ikut dipantau karena keduanya tampil di baris daftar.
        $changedFields = $ticket->wasChanged(['status', 'classification', 'channel_id', 'is_pengawasan', 'completed_at', 'is_flagged', 'assigned_to', 'is_read', 'title', 'reporter_name']);

        if (empty($changedFields)) {
            return;
        }

        if ($ticket->wasChanged('status')) {
            AuditLogger::log(
                eventType: 'ticket.status_changed',
                category: 'ticket',
                actor: auth()->user(),
                ticket: $ticket,
                meta: [
                    'old_status' => $ticket->getOriginal('status'),
                    'new_status' => $ticket->status,
                ],
                severity: $ticket->status === 'selesai' ? 'notice' : 'info',
            );
        }

        // DashboardUpdated untuk perubahan status/klasifikasi/channel/completed_at.
        if ($ticket->wasChanged(['status', 'classification', 'channel_id', 'completed_at'])) {
            $this->dispatchThrottled(
                'status_changed',
                $ticket,
                $ticket->getOriginal('status'),
                $ticket->status
            );
        }

        // LaporanChanged untuk perubahan status, flag, atau pengawasan.
        $laporanAction = null;
        if ($ticket->wasChanged('status')) {
            $laporanAction = $ticket->status === 'selesai' ? 'completed' : 'status_changed';
        } elseif ($ticket->wasChanged('is_flagged')) {
            $laporanAction = $ticket->is_flagged ? 'flagged' : 'unflagged';
        } elseif ($ticket->wasChanged('is_pengawasan')) {
            $laporanAction = $ticket->is_pengawasan ? 'pengawasan_activated' : 'pengawasan_deactivated';
        } elseif ($ticket->wasChanged('assigned_to') || $ticket->wasChanged('is_read')) {
            $laporanAction = 'updated';
        } elseif ($ticket->wasChanged(['title', 'reporter_name'])) {
            $laporanAction = 'updated';
        }

        if ($laporanAction !== null) {
            $this->dispatchLaporanChanged($laporanAction, $ticket);
        }
    }

    /**
     * Handle the Ticket "deleted" event.
     */
    public function deleted(Ticket $ticket): void
    {
        $this->dispatchThrottled('deleted', $ticket);
        $this->dispatchLaporanChanged('deleted', $ticket);
    }

    /**
     * Broadcast update ke dashboard dengan throttle cache lock (maks 1 per 1 detik).
     */
    protected function dispatchThrottled(
        string $type,
        Ticket $ticket,
        ?string $oldStatus = null,
        ?string $newStatus = null
    ): void {
        // Cek flag untuk mematikan broadcast (misal saat seeder/import)
        if (config('app.disable_dashboard_broadcast', false)) {
            return;
        }

        // Cek pengaturan apakah fitur live dashboard dinonaktifkan
        if (! (bool) Setting::get('dashboard_live_enabled', true)) {
            return;
        }

        // Jangan throttle saat environment testing agar unit test event assert selalu valid
        if (app()->environment('testing')) {
            $this->dispatchDashboardUpdated($type, $ticket, $oldStatus, $newStatus);

            return;
        }

        // Throttle 1 detik menggunakan cache lock
        $lockKey = 'dashboard:update:throttle';
        $lock = Cache::lock($lockKey, 1);

        if ($lock->get()) {
            $this->dispatchDashboardUpdated($type, $ticket, $oldStatus, $newStatus);
        }
    }

    protected function dispatchDashboardUpdated(
        string $type,
        Ticket $ticket,
        ?string $oldStatus = null,
        ?string $newStatus = null
    ): void {
        $summary = [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'title' => $ticket->title,
            'reporter_name' => $ticket->reporter_name,
            'content' => $ticket->content,
            'status' => $ticket->status,
            'channel' => $ticket->channel?->name ?? '-',
            'created_at' => $ticket->created_at?->toIso8601String(),
        ];

        event(new DashboardUpdated(
            type: $type,
            ticketId: (int) $ticket->id,
            classification: $ticket->classification,
            channel: $ticket->channel?->slug,
            oldStatus: $oldStatus,
            newStatus: $newStatus,
            ticketSummary: $summary,
        ));

        // Statistik kanal berubah bila ada tiket baru masuk atau channel_id berubah.
        $channelChanged = $type === 'created' || $ticket->wasChanged('channel_id');
        if ($channelChanged && $ticket->channel_id) {
            event(new ChannelStatsUpdated(
                channelId: (int) $ticket->channel_id,
                action: $type,
                name: $ticket->channel?->name ?? '-',
                color: $ticket->channel?->color ?? $ticket->channel?->parent?->color,
            ));
        }
    }

    /**
     * Dispatch LaporanChanged ke channel laporan.admin dan laporan.operator.{userId}.
     * Event menggunakan ShouldDispatchAfterCommit, jadi terkirim setelah transaksi DB commit.
     */
    protected function dispatchLaporanChanged(string $action, Ticket $ticket): void
    {
        // Cek flag untuk mematikan broadcast (misal saat seeder/import)
        if (config('app.disable_dashboard_broadcast', false)) {
            return;
        }

        event(new LaporanChanged(
            action: $action,
            ticketId: (int) $ticket->id,
            ticketNumber: $ticket->ticket_number,
            type: $ticket->classification,
            actorId: auth()->user()?->id,
            operatorUserIds: $this->laporanOperatorRecipients($ticket),
            status: $ticket->status,
            occurredAt: now()->toIso8601String(),
            isInputData: $ticket->source_app === 'admin',
            channelName: $ticket->channel?->name,
        ));
    }

    /**
     * Operator yang berhak menerima sinyal daftar untuk tiket ini.
     *
     * `Ticket::scopeVisibleTo()` memberi role operator akses ke semua tiket
     * (Input Data menyaring source_app, Laporan Masuk menyaring sebaliknya),
     * jadi seluruh operator aktif menerima sinyal. Operator tim hanya melihat
     * tiket miliknya, sehingga cukup pembuat/penanggung jawab.
     *
     * @return array<int, int>
     */
    protected function laporanOperatorRecipients(Ticket $ticket): array
    {
        $recipientIds = User::query()
            ->where('role', UserRole::Operator)
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn (int|string $id): int => (int) $id)
            ->all();

        foreach ([$ticket->created_by, $ticket->assigned_to, $ticket->getOriginal('assigned_to')] as $candidateUserId) {
            if (! $candidateUserId) {
                continue;
            }

            $candidate = User::find($candidateUserId);
            if ($candidate && $candidate->isOperatorTim()) {
                $recipientIds[] = (int) $candidateUserId;
            }
        }

        return array_values(array_unique($recipientIds));
    }
}
