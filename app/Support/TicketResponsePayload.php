<?php

namespace App\Support;

use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Support\Facades\Storage;

class TicketResponsePayload
{
    /**
     * @return array{
     *     id: int,
     *     user_name: string,
     *     is_reporter: bool,
     *     is_system: bool,
     *     type: string,
     *     message: string,
     *     sent_at: string|null,
     *     created_at: string,
     *     email_status: string|null,
     *     attachments: list<array{id: int, original_name: string, mime_type: string|null, size: int, url: string}>
     * }
     */
    public static function from(TicketResponse $response, Ticket $ticket): array
    {
        $response->loadMissing(['user', 'attachments']);

        $isSystem = (bool) $response->is_system;
        $isReporter = $isSystem || $response->user_id === null || $response->type === 'balasan_pelapor';
        $userName = $isSystem
            ? 'Sistem'
            : ($isReporter
                ? ($ticket->reporter_name ? $ticket->reporter_name.' (Pelapor)' : 'Pelapor')
                : ($response->user?->name ?? '-'));

        return [
            'id' => $response->id,
            'user_name' => $userName,
            'is_reporter' => $isReporter,
            'is_system' => (bool) $response->is_system,
            'type' => $response->type,
            'message' => $response->message,
            'sent_at' => $response->sent_at?->toIso8601String(),
            'created_at' => $response->created_at->toIso8601String(),
            'email_status' => $isReporter ? null : $response->email_status,
            'attachments' => $response->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'url' => Storage::url($attachment->path),
            ])->values()->all(),
        ];
    }
}
