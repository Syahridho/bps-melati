<?php

namespace App\Http\Controllers;

use App\Actions\AutoCloseTickets;
use App\Models\Setting;
use App\Models\Ticket;
use App\Support\TicketResponsePayload;
use Illuminate\Support\Facades\Storage;

abstract class Controller
{
    protected function ticketPayload(Ticket $ticket): array
    {
        $classificationDays = match ($ticket->classification) {
            'pengaduan' => (int) Setting::get('auto_close_pengaduan_days', '3'),
            'aspirasi' => (int) Setting::get('auto_close_aspirasi_days', '1'),
            'permintaan_informasi' => (int) Setting::get('auto_close_permintaan_informasi_days', '5'),
            default => 3,
        };

        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'period' => $ticket->period,
            'sequence' => $ticket->sequence,
            'classification' => $ticket->classification,
            'title' => $ticket->title,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'reporter_email' => $ticket->reporter_email,
            'reporter_wa' => $ticket->reporter_wa,
            'content' => $ticket->content,
            'status' => $ticket->status,
            'version' => $ticket->version,
            'is_read' => $ticket->is_read,
            'source_app' => $ticket->source_app,
            'channel' => $ticket->channel?->name ?? '-',
            'created_by_name' => $ticket->creator?->name,
            'completed_at' => $ticket->completed_at?->toIso8601String(),
            'closed_reason' => $ticket->closed_reason,
            'is_pengawasan' => (bool) $ticket->is_pengawasan,
            'pengawasan_at' => $ticket->pengawasan_at?->toIso8601String(),
            'pengawasan_by_name' => $ticket->pengawasanBy?->name,
            'is_flagged' => (bool) $ticket->is_flagged,
            'flagged_at' => $ticket->flagged_at?->toIso8601String(),
            'flagged_by_name' => $ticket->flaggedBy?->name,
            'flag_note' => $ticket->flag_note,
            'kadar_pengawasan_days' => (int) Setting::get('kadar_pengawasan_hari', '30'),
            'classification_default_days' => $classificationDays,
            'auto_close_at' => AutoCloseTickets::deadlineFor($ticket)?->toIso8601String(),
            'created_at' => $ticket->created_at->toIso8601String(),
            'updated_at' => $ticket->updated_at->toIso8601String(),
            'attachments' => $ticket->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'url' => Storage::url($attachment->path),
            ]),
            'responses' => $ticket->responses->map(
                fn ($response) => TicketResponsePayload::from($response, $ticket)
            )->values()->all(),
        ];
    }
}
