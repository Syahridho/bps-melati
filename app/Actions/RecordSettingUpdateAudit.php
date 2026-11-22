<?php

namespace App\Actions;

use App\Services\AuditLogger;
use Illuminate\Http\Request;

class RecordSettingUpdateAudit
{
    /**
     * @param  array<int, string>  $changedKeys
     */
    public function handle($actor, Request $request, array $changedKeys): void
    {
        if ($changedKeys === []) {
            return;
        }

        AuditLogger::log(
            eventType: 'setting.updated',
            category: 'setting',
            actor: $actor,
            request: $request,
            meta: ['keys' => $changedKeys],
            severity: 'notice',
        );
    }
}
