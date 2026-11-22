<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\AuthLog;
use App\Models\SettingChangeLog;
use App\Models\TicketAssignmentLog;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Menyalin log lama (auth_logs, setting_change_logs, ticket_assignment_logs)
 * ke audit_logs agar halaman /audit-log menampilkan riwayat yang sudah ada.
 *
 * Idempotent: setiap baris diberi meta source_table + source_id, dan baris
 * yang sudah pernah disalin dilewati. Tidak menyiarkan event realtime.
 */
class BackfillAuditLogsCommand extends Command
{
    protected $signature = 'audit:backfill
        {--dry-run : Simulasi tanpa menulis ke audit_logs}';

    protected $description = 'Menyalin auth_logs, setting_change_logs, dan ticket_assignment_logs yang sudah ada ke audit_logs.';

    /** @var array<int, User|null> */
    private array $userCache = [];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $this->info($dryRun ? 'DRY RUN — tidak ada data yang ditulis.' : 'Menyalin log lama ke audit_logs...');

        $counts = [
            'auth_logs' => $this->backfillAuthLogs($dryRun),
            'setting_change_logs' => $this->backfillSettingLogs($dryRun),
            'ticket_assignment_logs' => $this->backfillAssignmentLogs($dryRun),
        ];

        $total = array_sum($counts);

        $this->newLine();
        $this->table(
            ['Sumber', 'Baris disalin'],
            collect($counts)->map(fn (int $count, string $source): array => [$source, $count])->values()->all(),
        );

        $this->info($dryRun
            ? "{$total} baris akan disalin. Jalankan tanpa --dry-run untuk menerapkan."
            : "{$total} baris berhasil disalin ke audit_logs.");

        return Command::SUCCESS;
    }

    private function backfillAuthLogs(bool $dryRun): int
    {
        $count = 0;

        AuthLog::query()->chunkById(500, function ($rows) use ($dryRun, &$count): void {
            foreach ($rows as $row) {
                [$actorId, $actorName, $actorRole] = $this->actor($row->user_id);

                $count += $this->insertIfMissing(
                    sourceTable: 'auth_logs',
                    sourceId: (int) $row->id,
                    dryRun: $dryRun,
                    attributes: [
                        'event_type' => 'auth.'.$row->event,
                        'category' => 'auth',
                        'severity' => $this->authSeverity((string) $row->event),
                        'actor_id' => $actorId,
                        'actor_name' => $actorName,
                        'actor_role' => $actorRole,
                        'ticket_id' => null,
                        'ip' => $row->ip_address,
                        'user_agent' => $row->user_agent,
                        'meta' => [
                            'source_table' => 'auth_logs',
                            'source_id' => $row->id,
                            'context' => $row->context,
                            'email_masked' => $row->email_masked,
                            'original_event' => $row->event,
                            'source_meta' => $row->meta,
                        ],
                        'created_at' => $row->created_at,
                    ],
                );
            }
        });

        return $count;
    }

    private function backfillSettingLogs(bool $dryRun): int
    {
        $count = 0;

        SettingChangeLog::query()->chunkById(500, function ($rows) use ($dryRun, &$count): void {
            foreach ($rows as $row) {
                [$actorId, $actorName, $actorRole] = $this->actor($row->changed_by);

                $count += $this->insertIfMissing(
                    sourceTable: 'setting_change_logs',
                    sourceId: (int) $row->id,
                    dryRun: $dryRun,
                    attributes: [
                        'event_type' => 'setting.changed',
                        'category' => 'setting',
                        'severity' => 'info',
                        'actor_id' => $actorId,
                        'actor_name' => $actorName,
                        'actor_role' => $actorRole,
                        'ticket_id' => null,
                        'ip' => null,
                        'user_agent' => null,
                        'meta' => [
                            'source_table' => 'setting_change_logs',
                            'source_id' => $row->id,
                            'key' => $row->key,
                            'old_value' => $row->old_value,
                            'new_value' => $row->new_value,
                            'scheduled_at' => $row->scheduled_at?->toIso8601String(),
                            'applied_at' => $row->applied_at?->toIso8601String(),
                            'cancelled_at' => $row->cancelled_at?->toIso8601String(),
                        ],
                        'created_at' => $row->created_at,
                    ],
                );
            }
        });

        return $count;
    }

    private function backfillAssignmentLogs(bool $dryRun): int
    {
        $count = 0;

        TicketAssignmentLog::query()->chunkById(500, function ($rows) use ($dryRun, &$count): void {
            foreach ($rows as $row) {
                [$actorId, $actorName, $actorRole] = $this->actor($row->performed_by);

                $count += $this->insertIfMissing(
                    sourceTable: 'ticket_assignment_logs',
                    sourceId: (int) $row->id,
                    dryRun: $dryRun,
                    attributes: [
                        'event_type' => 'ticket.assignment_'.$row->action,
                        'category' => 'ticket',
                        'severity' => 'info',
                        'actor_id' => $actorId,
                        'actor_name' => $actorName,
                        'actor_role' => $actorRole,
                        'ticket_id' => $row->ticket_id,
                        'ip' => null,
                        'user_agent' => null,
                        'meta' => [
                            'source_table' => 'ticket_assignment_logs',
                            'source_id' => $row->id,
                            'action' => $row->action,
                            'from_user_id' => $row->from_user_id,
                            'to_user_id' => $row->to_user_id,
                            'note' => $row->note,
                        ],
                        'created_at' => $row->created_at,
                    ],
                );
            }
        });

        return $count;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function insertIfMissing(string $sourceTable, int $sourceId, bool $dryRun, array $attributes): int
    {
        $exists = AuditLog::query()
            ->where('meta->source_table', $sourceTable)
            ->where('meta->source_id', $sourceId)
            ->exists();

        if ($exists) {
            return 0;
        }

        if ($dryRun) {
            return 1;
        }

        $log = new AuditLog;
        $log->forceFill($attributes);
        $log->created_at = $attributes['created_at'] ?? now();
        $log->save();

        return 1;
    }

    /**
     * @return array{0: int|null, 1: string|null, 2: string|null}
     */
    private function actor(?int $userId): array
    {
        if ($userId === null) {
            return [null, null, null];
        }

        if (! array_key_exists($userId, $this->userCache)) {
            $this->userCache[$userId] = User::withTrashed()->find($userId);
        }

        $user = $this->userCache[$userId];

        return [$userId, $user?->name, $user?->role?->value];
    }

    private function authSeverity(string $event): string
    {
        return match ($event) {
            'login_failed', 'blocked_active_session', 'locked_out' => 'warning',
            'session_expired', 'forced_logout', 'force_login' => 'notice',
            default => 'info',
        };
    }
}
