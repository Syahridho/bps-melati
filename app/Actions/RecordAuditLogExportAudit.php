<?php

namespace App\Actions;

use App\Services\AuditLogger;
use Illuminate\Http\Request;

class RecordAuditLogExportAudit
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function handle($actor, Request $request, int $exportCount, array $filters): void
    {
        AuditLogger::log(
            eventType: 'export.audit_logs',
            category: 'export',
            actor: $actor,
            request: $request,
            meta: [
                'count' => $exportCount,
                'filters' => array_filter($filters, static fn ($value): bool => $value !== null && $value !== ''),
            ],
            severity: 'notice',
        );
    }
}
