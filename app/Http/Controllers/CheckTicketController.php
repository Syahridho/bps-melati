<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CheckTicketController extends Controller
{
    /**
     * Tampilkan halaman publik untuk cek tiket.
     */
    public function __invoke(Request $request): Response
    {
        $ticketNumber = trim((string) $request->query('ticket_number', ''));
        $ticket = null;
        $searched = false;

        if ($ticketNumber !== '') {
            $searched = true;

            $cacheKey = 'ticket_check:'.md5($ticketNumber);

            $ticket = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($ticketNumber) {
                $t = Ticket::with(['channel', 'attachments', 'responses.user', 'responses.attachments'])
                    ->where('ticket_number', $ticketNumber)
                    ->first();

                if (! $t) {
                    return null;
                }

                return [
                    'id' => $t->id,
                    'ticket_number' => $t->ticket_number,
                    'classification' => $t->classification,
                    'service_type' => $t->service_type,
                    'satuan_tugas' => $t->satuan_tugas,
                    'reporter_name' => $t->reporter_name,
                    'content' => $t->content,
                    'status' => $t->status,
                    'channel' => $t->channel?->name ?? '-',
                    'created_at' => $t->created_at->toDateTimeString(),
                    'completed_at' => $t->completed_at?->toDateTimeString(),
                    'attachments' => $t->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                        'url' => Storage::url($attachment->path),
                    ])->values()->all(),
                    'responses' => $t->responses->sortByDesc('created_at')->values()->map(fn ($response) => [
                        'id' => $response->id,
                        'type' => $response->type,
                        'message' => $response->message,
                        'user_name' => $response->user?->name ?? 'Petugas BPS',
                        'sent_at' => $response->sent_at?->toDateTimeString(),
                        'created_at' => $response->created_at->toDateTimeString(),
                        'attachments' => $response->attachments->map(fn ($att) => [
                            'id' => $att->id,
                            'original_name' => $att->original_name,
                            'mime_type' => $att->mime_type,
                            'size' => $att->size,
                            'url' => Storage::url($att->path),
                        ])->values()->all(),
                    ])->values()->all(),
                ];
            });
        }

        return Inertia::render('check', [
            'ticketNumber' => $ticketNumber,
            'ticket' => $ticket,
            'searched' => $searched,
        ]);
    }
}
