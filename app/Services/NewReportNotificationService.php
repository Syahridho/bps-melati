<?php

namespace App\Services;

use App\Enums\AssignmentMode;
use App\Enums\UserRole;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\LaporanNotification;
use App\Support\ProfanityFilter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NewReportNotificationService
{
    private static bool $suppressed = false;

    public function __construct(
        private readonly ProfanityFilter $profanityFilter,
    ) {}

    /**
     * Jalankan callback tanpa memicu notifikasi individual per tiket.
     * Dipakai oleh jalur batch (mis. import sosial) agar dapat mengirim
     * notifikasi per-tiket atau ringkasan setelah semua tiket tersimpan.
     */
    public static function withoutNotifications(callable $callback): mixed
    {
        $previous = self::$suppressed;
        self::$suppressed = true;

        try {
            return $callback();
        } finally {
            self::$suppressed = $previous;
        }
    }

    public static function isSuppressed(): bool
    {
        return self::$suppressed;
    }

    /**
     * Kirim notifikasi "Laporan baru masuk" untuk satu tiket non-admin.
     *
     * @return int Jumlah penerima yang dikirimi notifikasi
     */
    public function notifyForTicket(Ticket $ticket): int
    {
        if (self::$suppressed || $ticket->source_app === 'admin') {
            return 0;
        }

        $recipients = $this->resolveRecipients($ticket);
        if ($recipients->isEmpty()) {
            return 0;
        }

        $data = [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'type' => $ticket->classification,
            'title' => 'Laporan baru masuk',
            'message' => $this->profanityFilter->censor(Str::limit((string) ($ticket->title ?? $ticket->content), 100)),
            'url' => '/dashboard/admin/incoming-reports/'.$ticket->ticket_number,
            'actor_name' => $ticket->reporter_name ?? null,
        ];

        foreach ($recipients as $recipient) {
            Log::info('[PUSH-TIMING] T0 dispatch notify', [
                'ticket_number' => $ticket->ticket_number,
                'user_id' => $recipient->id,
                'user_role' => $recipient->role,
                't0' => now()->format('Y-m-d H:i:s.u'),
            ]);

            $recipient->notify(new LaporanNotification('laporan_masuk', $data, [$recipient->id]));
        }

        return $recipients->count();
    }

    /**
     * Kirim notifikasi batch untuk hasil import sosial:
     * - <= 5 tiket: kirim notifikasi individual per tiket
     * - > 5 tiket: kirim satu ringkasan notifikasi agar tidak membanjiri perangkat
     *
     * @param  list<Ticket>  $tickets
     * @return int Total dispatch notifikasi (user-notification)
     */
    public function notifyBatch(string $platformLabel, array $tickets): int
    {
        $count = count($tickets);
        if ($count === 0) {
            return 0;
        }

        if ($count <= 5) {
            $sent = 0;
            $previous = self::$suppressed;
            self::$suppressed = false;

            try {
                foreach ($tickets as $ticket) {
                    $sent += $this->notifyForTicket($ticket);
                }
            } finally {
                self::$suppressed = $previous;
            }

            return $sent;
        }

        $recipients = $this->resolveBatchRecipients($tickets);
        if ($recipients->isEmpty()) {
            return 0;
        }

        foreach ($recipients as $recipient) {
            $recipient->notify(LaporanNotification::forNewSocialBatch(
                platformLabel: $platformLabel,
                count: $count,
                recipientUserIds: [$recipient->id],
            ));
        }

        return $recipients->count();
    }

    /**
     * Tentukan penerima sesuai visibilitas per role dan mode penugasan:
     * - Semua Admin aktif selalu menerima.
     * - Operator aktif menerima bila mode Claim/Free, atau bila menjadi PIC pada Round Robin.
     * - OperatorTim tidak menerima laporan masuk non-admin (hanya melihat tiket buatannya sendiri).
     *
     * @return Collection<int, User>
     */
    public function resolveRecipients(Ticket $ticket): Collection
    {
        $admins = User::query()
            ->where('is_active', true)
            ->where('role', UserRole::Admin)
            ->get();

        $mode = $ticket->assignment_mode;
        if ($mode === AssignmentMode::RoundRobin->value && $ticket->assigned_to !== null) {
            $operators = User::query()
                ->where('is_active', true)
                ->where('role', UserRole::Operator)
                ->whereKey($ticket->assigned_to)
                ->get();
        } else {
            $operators = User::query()
                ->where('is_active', true)
                ->where('role', UserRole::Operator)
                ->get();
        }

        return $admins->merge($operators)->unique('id')->values();
    }

    /**
     * Penerima ringkasan batch: semua Admin aktif + Operator aktif yang menjadi PIC
     * di salah satu tiket batch (pada Round Robin) atau semua Operator aktif (Claim/Free).
     *
     * @param  list<Ticket>  $tickets
     * @return Collection<int, User>
     */
    private function resolveBatchRecipients(array $tickets): Collection
    {
        $admins = User::query()
            ->where('is_active', true)
            ->where('role', UserRole::Admin)
            ->get();

        $hasNonRoundRobinOrUnassigned = collect($tickets)->contains(
            fn (Ticket $t): bool => $t->assignment_mode !== AssignmentMode::RoundRobin->value || $t->assigned_to === null
        );

        if ($hasNonRoundRobinOrUnassigned) {
            $operators = User::query()
                ->where('is_active', true)
                ->where('role', UserRole::Operator)
                ->get();
        } else {
            $picIds = collect($tickets)->pluck('assigned_to')->filter()->unique()->values()->all();
            $operators = User::query()
                ->where('is_active', true)
                ->where('role', UserRole::Operator)
                ->whereIn('id', $picIds)
                ->get();
        }

        return $admins->merge($operators)->unique('id')->values();
    }
}
