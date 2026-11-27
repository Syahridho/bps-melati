<?php

namespace App\Services;

use App\Enums\AssignmentMode;
use App\Events\LaporanChanged;
use App\Models\Ticket;
use App\Models\TicketAssignmentLog;
use App\Models\User;
use App\Notifications\LaporanNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Satu pintu untuk pembuatan tiket dan penugasan PIC.
 *
 * Semua kanal pembuatan tiket wajib memakai createTicket() agar mode
 * penanganan pada tiket baru selalu konsisten dan round robin aman dari
 * dua tiket yang mendapat giliran sama.
 */
class TicketAssignmentService
{
    public const SETTING_RR_LAST_USER = 'rr_last_user_id';

    private const ROUND_ROBIN_LOCK = 'ticket-assignment:round-robin';

    public function __construct(private readonly AssignmentModeService $modeService) {}

    public function currentMode(): AssignmentMode
    {
        return $this->modeService->current();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createTicket(array $attributes, ?string $autoAssignNote = null): Ticket
    {
        $mode = $this->currentMode();

        if ($mode !== AssignmentMode::RoundRobin) {
            return DB::transaction(fn (): Ticket => Ticket::create(array_merge($attributes, [
                'assignment_mode' => $mode->value,
            ])));
        }

        // Lock Redis lintas transaksi: dua tiket yang masuk bersamaan tidak
        // boleh membaca pointer giliran yang sama.
        return Cache::lock(self::ROUND_ROBIN_LOCK, 10)->block(5, function () use ($attributes, $autoAssignNote): Ticket {
            $assignedUserId = null;

            $ticket = DB::transaction(function () use ($attributes, $autoAssignNote, &$assignedUserId): Ticket {
                $ticket = Ticket::create(array_merge($attributes, [
                    'assignment_mode' => AssignmentMode::RoundRobin->value,
                ]));

                $assignedUserId = $this->assignRoundRobinLocked($ticket, $autoAssignNote);

                return $ticket;
            });

            if ($assignedUserId === null) {
                $this->notifyNoEligibleOperator($ticket);
            }

            return $ticket;
        });
    }

    /**
     * Buat tiket khusus jalur Input Data: melewati Round Robin dan
     * menugaskan pembuat sebagai PIC untuk semua peran pembuat.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createInputDataTicket(array $attributes, User $creator): Ticket
    {
        $mode = $this->currentMode();

        return DB::transaction(function () use ($attributes, $creator, $mode): Ticket {
            $ticket = Ticket::create(array_merge($attributes, [
                'assignment_mode' => $mode->value,
                'assigned_to' => $creator->id,
                'assigned_at' => now(),
            ]));

            $this->assignToCreator($ticket, $creator);

            return $ticket;
        });
    }

    /**
     * Catat penugasan awal ke pembuat tiket (Input Data) tanpa mengubah
     * counter Round Robin maupun memicu dispatch event ganda.
     */
    public function assignToCreator(Ticket $ticket, User $creator): void
    {
        if ((int) $ticket->assigned_to !== (int) $creator->id) {
            $ticket->forceFill([
                'assigned_to' => $creator->id,
                'assigned_at' => now(),
            ])->saveQuietly();
        }

        $this->log(
            $ticket,
            null,
            $creator->id,
            TicketAssignmentLog::ACTION_CREATOR_ASSIGNED,
            $creator->id,
        );
    }

    /**
     * Ambil tiket dengan UPDATE atomik. true bila berhasil menjadi PIC.
     */
    public function claim(Ticket $ticket, User $actor): bool
    {
        $claimed = DB::transaction(function () use ($ticket, $actor): bool {
            $affected = Ticket::query()
                ->whereKey($ticket->id)
                ->whereNull('assigned_to')
                ->where('assignment_mode', AssignmentMode::Claim->value)
                ->update([
                    'assigned_to' => $actor->id,
                    'assigned_at' => now(),
                ]);

            if ($affected === 0) {
                return false;
            }

            $ticket->refresh();

            $this->log($ticket, null, $actor->id, TicketAssignmentLog::ACTION_CLAIMED, $actor->id);

            return true;
        });

        if ($claimed) {
            app(TicketCacheInvalidator::class)->invalidateTicket($ticket);

            $ticket->refresh();
            $this->dispatchAssignedLaporanChanged($ticket, $actor->id);
        }

        return $claimed;
    }

    /**
     * Admin menetapkan/mengganti PIC, atau melepasnya bila $target null.
     */
    public function reassign(Ticket $ticket, ?User $target, User $actor, ?string $note = null): void
    {
        DB::transaction(function () use ($ticket, $target, $actor, $note): void {
            $locked = Ticket::whereKey($ticket->id)->lockForUpdate()->firstOrFail();
            $fromUserId = $locked->assigned_to;

            if ($fromUserId === $target?->id) {
                return;
            }

            $locked->forceFill([
                'assigned_to' => $target?->id,
                'assigned_at' => $target !== null ? now() : null,
            ])->save();

            $this->log(
                $locked,
                $fromUserId,
                $target?->id,
                $target !== null
                    ? TicketAssignmentLog::ACTION_REASSIGNED
                    : TicketAssignmentLog::ACTION_RELEASED,
                $actor->id,
                $note,
            );
        });

    }

    /**
     * Siarkan perubahan penugasan ke kanal operator yang bersangkutan agar
     * badge "Laporan Saya" di sidebar ikut terbarui secara realtime.
     */
    protected function dispatchAssignedLaporanChanged(Ticket $ticket, ?int $actorId = null): void
    {
        if (config('app.disable_dashboard_broadcast', false)) {
            return;
        }

        $assignedTo = $ticket->assigned_to;
        if ($assignedTo === null) {
            return;
        }

        $user = User::find($assignedTo);
        if (! $user || (! $user->isOperator() && ! $user->isOperatorTim())) {
            return;
        }

        // Hindari duplikasi bila operator yang ditugaskan sama dengan pembuat tiket
        // (observer "created" sudah menyiarkan ke pembuat).
        if ($ticket->created_by !== null && (int) $ticket->created_by === (int) $assignedTo) {
            return;
        }

        event(new LaporanChanged(
            action: 'updated',
            ticketId: (int) $ticket->id,
            ticketNumber: $ticket->ticket_number,
            type: $ticket->classification,
            actorId: $actorId ?? auth()->user()?->id,
            operatorUserIds: [(int) $assignedTo],
            status: $ticket->status,
            occurredAt: now()->toIso8601String(),
            isInputData: $ticket->source_app === 'admin',
            channelName: $ticket->channel?->name,
        ));
    }

    /**
     * Beri tahu admin bahwa ada tiket aktif milik operator yang baru
     * dinonaktifkan/dihapus/ditandai tidak tersedia.
     */
    public function notifyOrphanedTickets(User $operator): void
    {
        $count = Ticket::query()
            ->where('assigned_to', $operator->id)
            ->where('status', '!=', 'selesai')
            ->count();

        if ($count === 0) {
            return;
        }

        $this->notifyAdmins(
            type: 'tiket_yatim',
            title: 'Tiket tanpa PIC aktif',
            message: "{$count} tiket aktif masih ditugaskan kepada {$operator->name} yang kini tidak aktif/tidak tersedia. Segera ubah PIC-nya.",
            url: '/dashboard/admin/incoming-reports?tab=tanpa_pic',
        );
    }

    /**
     * Pilih operator berikutnya dan simpan pointer giliran.
     *
     * @return int|null ID operator yang ditugaskan, null bila tidak ada kandidat.
     */
    private function assignRoundRobinLocked(Ticket $ticket, ?string $note = null): ?int
    {
        $operatorIds = User::query()
            ->assignable()
            ->pluck('id')
            ->map(fn (int|string $id): int => (int) $id)
            ->all();

        if ($operatorIds === []) {
            Log::warning('Tidak ada operator valid untuk giliran Round Robin.', [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
            ]);

            return null;
        }

        // Baca pointer langsung dari DB (bukan cache) di dalam row lock.
        DB::table('settings')->insertOrIgnore([
            'key' => self::SETTING_RR_LAST_USER,
            'value' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $lastUserId = DB::table('settings')
            ->where('key', self::SETTING_RR_LAST_USER)
            ->lockForUpdate()
            ->value('value');

        $lastUserId = (int) $lastUserId;
        $nextUserId = null;

        foreach ($operatorIds as $operatorId) {
            if ($operatorId > $lastUserId) {
                $nextUserId = $operatorId;
                break;
            }
        }

        $nextUserId ??= $operatorIds[0];

        DB::table('settings')
            ->where('key', self::SETTING_RR_LAST_USER)
            ->update(['value' => (string) $nextUserId, 'updated_at' => now()]);

        Cache::forget('setting:'.self::SETTING_RR_LAST_USER);

        $ticket->forceFill([
            'assigned_to' => $nextUserId,
            'assigned_at' => now(),
        ])->saveQuietly();

        $this->log($ticket, null, $nextUserId, TicketAssignmentLog::ACTION_AUTO_ASSIGNED, null, $note);

        return $nextUserId;
    }

    private function log(
        Ticket $ticket,
        ?int $fromUserId,
        ?int $toUserId,
        string $action,
        ?int $performedBy,
        ?string $note = null,
    ): void {
        TicketAssignmentLog::create([
            'ticket_id' => $ticket->id,
            'from_user_id' => $fromUserId,
            'to_user_id' => $toUserId,
            'action' => $action,
            'performed_by' => $performedBy,
            'note' => $note,
        ]);

        $eventType = match ($action) {
            TicketAssignmentLog::ACTION_CLAIMED => 'ticket.assignment_claimed',
            TicketAssignmentLog::ACTION_AUTO_ASSIGNED => 'ticket.assignment_auto_assigned',
            TicketAssignmentLog::ACTION_REASSIGNED => 'ticket.assignment_reassigned',
            TicketAssignmentLog::ACTION_RELEASED => 'ticket.assignment_released',
            TicketAssignmentLog::ACTION_CREATOR_ASSIGNED => 'ticket.assignment_creator_assigned',
            default => 'ticket.assignment_changed',
        };

        AuditLogger::log(
            eventType: $eventType,
            category: 'ticket',
            actor: $performedBy !== null ? User::find($performedBy) : null,
            ticket: $ticket,
            meta: [
                'action' => $action,
                'from_user_id' => $fromUserId,
                'to_user_id' => $toUserId,
                'note' => $note,
            ],
            severity: $action === TicketAssignmentLog::ACTION_REASSIGNED ? 'notice' : 'info',
        );
    }

    private function notifyNoEligibleOperator(Ticket $ticket): void
    {
        $this->notifyAdmins(
            type: 'tiket_tanpa_pic',
            title: 'Laporan baru tanpa PIC',
            message: 'Tidak ada operator aktif yang tersedia untuk giliran round robin. Laporan menunggu penanganan admin.',
            url: '/dashboard/admin/incoming-reports/'.$ticket->ticket_number,
        );
    }

    private function notifyAdmins(string $type, string $title, string $message, string $url): void
    {
        $adminIds = User::query()
            ->where('role', 'admin')
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn (int|string $id): int => (int) $id)
            ->all();

        foreach ($adminIds as $adminId) {
            $admin = User::find($adminId);

            if ($admin === null) {
                continue;
            }

            $admin->notify(new LaporanNotification($type, [
                'id' => 0,
                'ticket_number' => null,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'url' => $url,
                'actor_name' => null,
            ], [$adminId]));
        }

        Log::info('Notifikasi penugasan tiket dikirim ke admin.', [
            'type' => $type,
            'admin_count' => count($adminIds),
        ]);
    }
}
