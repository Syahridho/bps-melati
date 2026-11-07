<?php

namespace App\Observers;

use App\Events\DashboardUpdated;
use App\Models\Ticket;
use Illuminate\Support\Facades\Cache;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        $this->dispatchThrottled('created', $ticket);
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // Hanya broadcast bila status, klasifikasi, channel, atau tanda pengawasan berubah
        if ($ticket->wasChanged(['status', 'classification', 'channel_id', 'is_pengawasan', 'completed_at'])) {
            $this->dispatchThrottled(
                'status_changed',
                $ticket,
                $ticket->getOriginal('status'),
                $ticket->status
            );
        }
    }

    /**
     * Handle the Ticket "deleted" event.
     */
    public function deleted(Ticket $ticket): void
    {
        $this->dispatchThrottled('deleted', $ticket);
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
        if (! (bool) \App\Models\Setting::get('dashboard_live_enabled', true)) {
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
    }
}
