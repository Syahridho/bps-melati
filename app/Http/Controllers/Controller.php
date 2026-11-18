<?php

namespace App\Http\Controllers;

use App\Actions\AutoCloseTickets;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Support\ProfanityFilter;
use App\Support\TicketResponsePayload;
use Illuminate\Support\Facades\Storage;

abstract class Controller
{
    /**
     * Properti keluaran teks tiket (judul/isi/catatan tandai) yang sudah disamarkan.
     *
     * Default selalu tampil tersensor. Teks asli hanya tersedia sebagai
     * prop terpisah (`*_original`) untuk pengguna petugas
     * (admin / operator / operator_tim). Database tidak pernah diubah.
     *
     * @return array{
     *     title: string|null,
     *     content: string|null,
     *     flag_note: string|null,
     *     title_original: string|null,
     *     content_original: string|null,
     *     flag_note_original: string|null,
     *     has_profanity: bool
     * }
     */
    protected function profanityTicketProps(Ticket $ticket): array
    {
        $filter = app(ProfanityFilter::class);
        $user = auth()->user();
        $isStaff = $user instanceof User
            && ($user->isAdmin() || $user->isOperator() || $user->isOperatorTim());

        $title = $ticket->title ?? '';
        $content = $ticket->content ?? '';
        $flagNote = $ticket->flag_note ?? '';

        return [
            'title' => $filter->censor($title),
            'content' => $filter->censor($content),
            'flag_note' => $filter->censor($flagNote),
            'title_original' => $isStaff ? $title : null,
            'content_original' => $isStaff ? $content : null,
            'flag_note_original' => $isStaff ? $flagNote : null,
            'has_profanity' => $filter->contains($title)
                || $filter->contains($content)
                || $filter->contains($flagNote),
        ];
    }

    protected function ticketPayload(Ticket $ticket): array
    {
        $classificationDays = match ($ticket->classification) {
            'pengaduan' => (int) Setting::get('auto_close_pengaduan_days', '3'),
            'aspirasi' => (int) Setting::get('auto_close_aspirasi_days', '1'),
            'permintaan_informasi' => (int) Setting::get('auto_close_permintaan_informasi_days', '5'),
            default => 3,
        };

        $profanity = $this->profanityTicketProps($ticket);
        $filter = app(ProfanityFilter::class);
        $user = auth()->user();
        $isStaff = $user instanceof User
            && ($user->isAdmin() || $user->isOperator() || $user->isOperatorTim());

        return array_merge([
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'period' => $ticket->period,
            'sequence' => $ticket->sequence,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'reporter_email' => $ticket->reporter_email,
            'reporter_wa' => $ticket->reporter_wa,
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
                fn ($response) => TicketResponsePayload::from($response, $ticket, $filter, $isStaff)
            )->values()->all(),
        ], $profanity);
    }
}
