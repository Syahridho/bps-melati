<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LaporanMasukController extends Controller
{
    /**
     * Daftar laporan masuk dengan paginasi dan pencarian.
     */
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $filter = $request->query('filter', 'semua');
        $perPage = (int) $request->query('per_page', 10);

        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 10;
        }

        $ticketsQuery = Ticket::with('channel')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('ticket_number', 'like', "%{$search}%")
                        ->orWhere('reporter_name', 'like', "%{$search}%")
                        ->orWhere('reporter_email', 'like', "%{$search}%")
                        ->orWhere('reporter_wa', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            })
            ->when($filter && $filter !== 'semua', function ($query, $filter) {
                if ($filter === 'belum_dibaca') {
                    $query->where('is_read', false);
                } elseif ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan') {
                    $query->where('classification', 'permintaan_informasi');
                } elseif ($filter === 'respon_awal') {
                    $query->where('status', 'respon_awal');
                } elseif ($filter === 'respon_substantif') {
                    $query->where('status', 'respon_substantif');
                }
            });

        $tickets = $ticketsQuery
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'classification' => $ticket->classification,
                'service_type' => $ticket->service_type,
                'satuan_tugas' => $ticket->satuan_tugas,
                'reporter_name' => $ticket->reporter_name,
                'reporter_email' => $ticket->reporter_email,
                'reporter_wa' => $ticket->reporter_wa,
                'content' => $ticket->content,
                'status' => $ticket->status,
                'is_read' => $ticket->is_read,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_at' => $ticket->created_at->toDateTimeString(),
            ]);

        $counts = [
            'semua' => Ticket::count(),
            'belum_dibaca' => Ticket::where('is_read', false)->count(),
            'pengaduan' => Ticket::where('classification', 'pengaduan')->count(),
            'aspirasi' => Ticket::where('classification', 'aspirasi')->count(),
            'permintaan' => Ticket::where('classification', 'permintaan_informasi')->count(),
            'respon_awal' => Ticket::where('status', 'respon_awal')->count(),
            'respon_substantif' => Ticket::where('status', 'respon_substantif')->count(),
        ];

        return Inertia::render('admin/laporan-masuk', [
            'tickets' => $tickets,
            'filters' => [
                'search' => $search ?? '',
                'filter' => $filter,
                'per_page' => $perPage,
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Detail satu laporan berdasarkan ticket_number.
     *
     * ticket_number mengandung slash (contoh: L-1400/092026/0001)
     * sehingga dikirim sebagai catch-all parameter dari route.
     */
    public function show(string $ticketNumber): Response
    {
        $ticket = Ticket::with(['channel', 'creator', 'attachments', 'responses.user', 'responses.attachments'])
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        // Tandai sudah dibaca
        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        return Inertia::render('admin/laporan-masuk/show', [
            'ticket' => [
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
                'content' => $ticket->content,
                'status' => $ticket->status,
                'is_read' => $ticket->is_read,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_by_name' => $ticket->creator?->name,
                'completed_at' => $ticket->completed_at?->toDateTimeString(),
                'created_at' => $ticket->created_at->toDateTimeString(),
                'updated_at' => $ticket->updated_at->toDateTimeString(),
                'attachments' => $ticket->attachments->map(fn ($attachment) => [
                    'id' => $attachment->id,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size' => $attachment->size,
                    'url' => Storage::url($attachment->path),
                ]),
                'responses' => $ticket->responses->sortByDesc('created_at')->values()->map(fn ($response) => [
                    'id' => $response->id,
                    'type' => $response->type,
                    'message' => $response->message,
                    'user_name' => $response->user?->name ?? '-',
                    'sent_at' => $response->sent_at?->toDateTimeString(),
                    'created_at' => $response->created_at->toDateTimeString(),
                    'attachments' => $response->attachments->map(fn ($att) => [
                        'id' => $att->id,
                        'original_name' => $att->original_name,
                        'mime_type' => $att->mime_type,
                        'size' => $att->size,
                        'url' => Storage::url($att->path),
                    ]),
                ]),
            ],
        ]);
    }
}
