<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Ticket;

trait BuildsLaporanListPayload
{
    /**
     * Baris tiket untuk daftar Laporan Masuk / Laporan Saya.
     *
     * @return array<string, mixed>
     */
    protected function laporanListTicket(Ticket $ticket): array
    {
        return array_merge([
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'reporter_email' => $ticket->reporter_email,
            'reporter_wa' => $ticket->reporter_wa,
            'status' => $ticket->status,
            'is_pengawasan' => (bool) $ticket->is_pengawasan,
            'is_flagged' => (bool) $ticket->is_flagged,
            'flagged_at' => $ticket->flagged_at?->toIso8601String(),
            'flagged_by_name' => $ticket->flaggedBy?->name,
            'flag_note' => $ticket->flag_note,
            'version' => $ticket->version,
            'is_read' => $ticket->is_read,
            'source_app' => $ticket->source_app,
            'channel' => $ticket->channel?->name ?? '-',
            'created_at' => $ticket->created_at->toIso8601String(),
            'last_responded_by' => $ticket->relationLoaded('lastResponse')
                ? $ticket->lastResponse?->user?->name
                : null,
            'assigned_to' => $ticket->assigned_to,
            'assigned_to_name' => $ticket->assignedTo?->name,
            'assignment_mode' => $ticket->assignment_mode,
        ], $this->profanityTicketProps($ticket));
    }

    /**
     * Baris tiket untuk daftar Laporan Selesai.
     *
     * @return array<string, mixed>
     */
    protected function completedListTicket(Ticket $ticket): array
    {
        return array_merge([
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'reporter_email' => $ticket->reporter_email,
            'reporter_wa' => $ticket->reporter_wa,
            'status' => $ticket->status,
            'is_pengawasan' => (bool) $ticket->is_pengawasan,
            'is_flagged' => (bool) $ticket->is_flagged,
            'flagged_at' => $ticket->flagged_at?->toIso8601String(),
            'flagged_by_name' => $ticket->flaggedBy?->name,
            'flag_note' => $ticket->flag_note,
            'source_app' => $ticket->source_app,
            'channel' => $ticket->channel?->name ?? '-',
            'closed_reason' => $ticket->closed_reason,
            'completed_at' => $ticket->completed_at?->toIso8601String(),
            'created_at' => $ticket->created_at->toIso8601String(),
            'updated_at' => $ticket->updated_at->toIso8601String(),
        ], $this->profanityTicketProps($ticket));
    }
}
