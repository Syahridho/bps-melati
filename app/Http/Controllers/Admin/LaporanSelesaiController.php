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
        $search = trim((string) $request->query('search', ''));
        $filter = (string) $request->query('filter', 'semua');
        $perPage = (int) $request->query('per_page', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'respon_awal', 'respon_substantif', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi'];
        if (! in_array($filter, $allowedFilters, true)) {
            $filter = 'semua';
        }

        // Whitelist per_page
        if (! in_array($perPage, [10, 20, 50, 100], true)) {
            $perPage = 10;
        }

        $frontendFilterKey = ($filter === 'permintaan_informasi') ? 'permintaan' : $filter;

        // Callback pencarian kata kunci
        $searchQueryClosure = function ($query) use ($search) {
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('ticket_number', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%")
                        ->orWhere('reporter_name', 'like', "%{$search}%")
                        ->orWhere('reporter_email', 'like', "%{$search}%")
                        ->orWhere('reporter_wa', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            }
        };

        // Query utama daftar tiket laporan selesai
        $ticketsQuery = Ticket::with('channel')
            ->whereIn('status', self::COMPLETED_STATUSES)
            ->tap($searchQueryClosure)
            ->when($filter !== 'semua', function ($query) use ($filter) {
                if ($filter === 'respon_awal') {
                    $query->where('status', 'respon_awal');
                } elseif ($filter === 'respon_substantif') {
                    $query->where('status', 'respon_substantif');
                } elseif ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan' || $filter === 'permintaan_informasi') {
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
                'title' => $ticket->title,
                'service_type' => $ticket->service_type,
                'satuan_tugas' => $ticket->satuan_tugas,
                'reporter_name' => $ticket->reporter_name,
                'reporter_email' => $ticket->reporter_email,
                'reporter_wa' => $ticket->reporter_wa,
                'content' => $ticket->content,
                'status' => $ticket->status,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'completed_at' => $ticket->completed_at?->toIso8601String(),
                'created_at' => $ticket->created_at->toIso8601String(),
            ]);

        // Base query untuk counts (mengikuti pencarian, tanpa filter tab)
        $countBaseQuery = Ticket::whereIn('status', self::COMPLETED_STATUSES)->tap($searchQueryClosure);

        $counts = [
            'semua' => (clone $countBaseQuery)->count(),
            'respon_awal' => (clone $countBaseQuery)->where('status', 'respon_awal')->count(),
            'respon_substantif' => (clone $countBaseQuery)->where('status', 'respon_substantif')->count(),
            'pengaduan' => (clone $countBaseQuery)->where('classification', 'pengaduan')->count(),
            'aspirasi' => (clone $countBaseQuery)->where('classification', 'aspirasi')->count(),
            'permintaan' => (clone $countBaseQuery)->where('classification', 'permintaan_informasi')->count(),
        ];

        return Inertia::render('admin/laporan-selesai', [
            'tickets' => $tickets,
            'filters' => [
                'search' => $search,
                'filter' => $frontendFilterKey,
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
                'title' => $ticket->title,
                'service_type' => $ticket->service_type,
                'satuan_tugas' => $ticket->satuan_tugas,
                'reporter_name' => $ticket->reporter_name,
                'reporter_email' => $ticket->reporter_email,
                'reporter_wa' => $ticket->reporter_wa,
                'content' => $ticket->content,
                'status' => $ticket->status,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_by_name' => $ticket->creator?->name,
                'completed_at' => $ticket->completed_at?->toIso8601String(),
                'created_at' => $ticket->created_at->toIso8601String(),
                'updated_at' => $ticket->updated_at->toIso8601String(),
                'attachments' => $ticket->attachments->map(fn ($attachment) => [
                    'id' => $attachment->id,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size' => $attachment->size,
                    'url' => Storage::url($attachment->path),
                ]),
                'responses' => $ticket->responses->sortByDesc('created_at')->values()->map(function ($response) use ($ticket) {
                    $isReporter = $response->user_id === null || $response->type === 'balasan_pelapor';
                    $userName = $isReporter
                        ? ($ticket->reporter_name ? $ticket->reporter_name.' (Pelapor)' : 'Pelapor')
                        : ($response->user?->name ?? '-');

                    return [
                        'id' => $response->id,
                        'user_name' => $userName,
                        'is_reporter' => $isReporter,
                        'type' => $response->type,
                        'message' => $response->message,
                        'sent_at' => $response->sent_at->toIso8601String(),
                        'attachments' => $response->attachments->map(fn ($attachment) => [
                            'id' => $attachment->id,
                            'original_name' => $attachment->original_name,
                            'mime_type' => $attachment->mime_type,
                            'size' => $attachment->size,
                            'url' => Storage::url($attachment->path),
                        ]),
                    ];
                }),
            ],
        ]);
    }
}
