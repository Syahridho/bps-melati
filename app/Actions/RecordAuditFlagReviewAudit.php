<?php

namespace App\Actions;

use App\Models\Ticket;
use App\Services\AuditLogger;

class RecordAuditFlagReviewAudit
{
    public function handle($actor, ?Ticket $ticket, string $flagId, string $newStatus): void
    {
        AuditLogger::log(
            eventType: 'audit.flag_reviewed',
            category: 'audit',
            actor: $actor,
            ticket: $ticket,
            meta: [
                'flag_id' => $flagId,
                'new_status' => $newStatus,
            ],
            severity: 'info',
        );
    }
}
