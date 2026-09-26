<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LaporanSelesaiController extends Controller
{
    /**
     * Status yang dianggap "selesai" (sudah direspon).
     *
     * @var array<int, string>
     */
    private const COMPLETED_STATUSES = ['respon_awal', 'respon_substantif', 'selesai'];

    /**
     * Daftar laporan selesai dengan paginasi dan pencarian.
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
            ->whereIn('status', self::COMPLETED_STATUSES)
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
                if ($filter === 'respon_awal') {
                    $query->where('status', 'respon_awal');
                } elseif ($filter === 'respon_substantif') {
                    $query->where('status', 'respon_substantif');
                } elseif ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan') {
                    $query->where('classification', 'permintaan_informasi');
                }
            });

        $tickets = $ticketsQuery
            ->orderByDesc('updated_at')
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
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'completed_at' => $ticket->completed_at?->toDateTimeString(),
                'created_at' => $ticket->created_at->toDateTimeString(),
            ]);

        $counts = [
            'semua' => Ticket::whereIn('status', self::COMPLETED_STATUSES)->count(),
            'respon_awal' => Ticket::where('status', 'respon_awal')->count(),
            'respon_substantif' => Ticket::where('status', 'respon_substantif')->count(),
            'pengaduan' => Ticket::whereIn('status', self::COMPLETED_STATUSES)->where('classification', 'pengaduan')->count(),
            'aspirasi' => Ticket::whereIn('status', self::COMPLETED_STATUSES)->where('classification', 'aspirasi')->count(),
            'permintaan' => Ticket::whereIn('status', self::COMPLETED_STATUSES)->where('classification', 'permintaan_informasi')->count(),
        ];

        return Inertia::render('admin/laporan-selesai', [
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
     * Detail satu laporan selesai berdasarkan ticket_number.
     */
    public function show(string $ticketNumber): Response
    {
        $ticket = Ticket::with(['channel', 'creator', 'attachments', 'responses.user', 'responses.attachments'])
            ->where('ticket_number', $ticketNumber)
            ->whereIn('status', self::COMPLETED_STATUSES)
            ->firstOrFail();

        return Inertia::render('admin/laporan-selesai/show', [
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
