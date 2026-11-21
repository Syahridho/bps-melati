<?php

namespace App\Console\Commands;

use App\Models\SettingChangeLog;
use App\Services\AssignmentModeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ApplyScheduledAssignmentModeCommand extends Command
{
    protected $signature = 'settings:apply-assignment-mode';

    protected $description = 'Terapkan perubahan mode penanganan laporan yang sudah jatuh tempo';

    public function handle(AssignmentModeService $modeService): int
    {
        $applied = 0;

        $dueChanges = SettingChangeLog::query()
            ->due()
            ->orderBy('scheduled_at')
            ->get();

        foreach ($dueChanges as $change) {
            if ($modeService->applyDueChange($change)) {
                $applied++;
            }
        }

        if ($applied > 0) {
            Log::info('Perubahan mode penanganan laporan terjadwal diterapkan.', [
                'count' => $applied,
            ]);
        }

        $this->info("Perubahan mode diterapkan: {$applied}");

        return self::SUCCESS;
    }
}
