<?php

namespace App\Actions;

use App\Models\Ticket;
use App\Services\AuditFlagDetector;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class RecordReporterCompletionAudit
{
    public function handle(Ticket $ticket, Request $request, bool $hasRating): void
    {
        $auditLog = AuditLogger::log(
            eventType: $hasRating ? 'ticket.rated' : 'ticket.completed_by_reporter',
            category: 'ticket',
            ticket: $ticket,
            request: $request,
            meta: [
                'rating' => $ticket->rating,
                'has_comment' => filled($ticket->rating_comment),
            ],
            severity: 'notice',
        );

        app(AuditFlagDetector::class)->detectForTicketCompletion($ticket, $auditLog, $request);
    }
}
