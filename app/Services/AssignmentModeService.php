<?php

namespace App\Services;

use App\Enums\AssignmentMode;
use App\Models\Setting;
use App\Models\SettingChangeLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Sumber kebenaran untuk mode penanganan laporan: membaca mode aktif,
 * menerapkan perubahan langsung, dan menyimpan perubahan terjadwal.
 */
class AssignmentModeService
{
    public const SETTING_KEY = 'assignment_mode';

    public function current(): AssignmentMode
    {
        $value = (string) Setting::get(self::SETTING_KEY, AssignmentMode::Free->value);

        return AssignmentMode::tryFrom($value) ?? AssignmentMode::Free;
    }

    /**
     * Jadwalkan perubahan mode. Perubahan terjadwal yang belum jatuh tempo
     * sebelumnya dibatalkan agar hanya ada satu jadwal aktif.
     */
    public function schedule(AssignmentMode $mode, User $changedBy, Carbon $scheduledAt): SettingChangeLog
    {
        return DB::transaction(function () use ($mode, $changedBy, $scheduledAt): SettingChangeLog {
            $this->cancelPendingChanges();

            return SettingChangeLog::create([
                'key' => self::SETTING_KEY,
                'old_value' => $this->current()->value,
                'new_value' => $mode->value,
                'changed_by' => $changedBy->id,
                'scheduled_at' => $scheduledAt,
                'applied_at' => null,
            ]);
        });
    }

    /**
     * Terapkan perubahan mode sekarang dan catat riwayatnya.
     */
    public function applyNow(AssignmentMode $mode, User $changedBy): SettingChangeLog
    {
        return DB::transaction(function () use ($mode, $changedBy): SettingChangeLog {
            $oldMode = $this->current();

            $this->cancelPendingChanges();
            $this->writeMode($mode);

            return SettingChangeLog::create([
                'key' => self::SETTING_KEY,
                'old_value' => $oldMode->value,
                'new_value' => $mode->value,
                'changed_by' => $changedBy->id,
                'scheduled_at' => null,
                'applied_at' => now(),
            ]);
        });
    }

    /**
     * Terapkan satu baris perubahan yang sudah jatuh tempo.
     */
    public function applyDueChange(SettingChangeLog $log): bool
    {
        return DB::transaction(function () use ($log): bool {
            $locked = SettingChangeLog::whereKey($log->id)->lockForUpdate()->first();

            if ($locked === null || $locked->applied_at !== null || $locked->cancelled_at !== null) {
                return false;
            }

            $mode = AssignmentMode::tryFrom((string) $locked->new_value);

            if ($mode === null) {
                return false;
            }

            $this->writeMode($mode);

            $locked->forceFill(['applied_at' => now()])->save();

            return true;
        });
    }

    public function pending(): ?SettingChangeLog
    {
        return SettingChangeLog::query()
            ->where('key', self::SETTING_KEY)
            ->whereNull('applied_at')
            ->whereNull('cancelled_at')
            ->whereNotNull('scheduled_at')
            ->latest('scheduled_at')
            ->first();
    }

    /**
     * @return list<SettingChangeLog>
     */
    public function history(int $limit = 10): array
    {
        return SettingChangeLog::query()
            ->with('changedBy')
            ->where('key', self::SETTING_KEY)
            ->latest('id')
            ->limit($limit)
            ->get()
            ->all();
    }

    private function writeMode(AssignmentMode $mode): void
    {
        Setting::set(self::SETTING_KEY, $mode->value);
    }

    private function cancelPendingChanges(): void
    {
        SettingChangeLog::query()
            ->where('key', self::SETTING_KEY)
            ->whereNull('applied_at')
            ->whereNull('cancelled_at')
            ->whereNotNull('scheduled_at')
            ->update(['cancelled_at' => now()]);
    }
}
