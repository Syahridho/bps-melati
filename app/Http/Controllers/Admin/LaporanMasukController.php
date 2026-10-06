<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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
        $search = trim((string) $request->query('search', ''));
        $filter = (string) $request->query('filter', 'semua');
        $perPage = (int) $request->query('per_page', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'belum_dibaca', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi', 'respon_awal', 'respon_substantif'];
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

        // Query utama daftar tiket laporan masuk (kecuali tiket yang diinput manual dari admin)
        $ticketsQuery = Ticket::with('channel')
            ->where('source_app', '!=', 'admin')
            ->tap($searchQueryClosure)
            ->when($filter !== 'semua', function ($query) use ($filter) {
                if ($filter === 'belum_dibaca') {
                    $query->where('is_read', false);
                } elseif ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan' || $filter === 'permintaan_informasi') {
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
                'title' => $ticket->title,
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
                'created_at' => $ticket->created_at->toIso8601String(),
            ]);

        // Base query untuk counts (mengikuti pencarian, tanpa filter tab)
        $countBaseQuery = Ticket::query()->where('source_app', '!=', 'admin')->tap($searchQueryClosure);

        $counts = [
            'semua' => (clone $countBaseQuery)->count(),
            'belum_dibaca' => (clone $countBaseQuery)->where('is_read', false)->count(),
            'pengaduan' => (clone $countBaseQuery)->where('classification', 'pengaduan')->count(),
            'aspirasi' => (clone $countBaseQuery)->where('classification', 'aspirasi')->count(),
            'permintaan' => (clone $countBaseQuery)->where('classification', 'permintaan_informasi')->count(),
            'respon_awal' => (clone $countBaseQuery)->where('status', 'respon_awal')->count(),
            'respon_substantif' => (clone $countBaseQuery)->where('status', 'respon_substantif')->count(),
        ];

        return Inertia::render('admin/laporan-masuk', [
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
     * Detail satu laporan berdasarkan ticket_number.
     *
     * ticket_number mengandung slash (contoh: L-1400/092026/0001)
     * sehingga dikirim sebagai catch-all parameter dari route.
     */
    public function show(Request $request, string $ticketNumber): Response
    {
        $ticket = Ticket::with(['channel', 'creator', 'attachments', 'responses.user', 'responses.attachments'])
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        // Tandai sudah dibaca
        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        $user = $request->user();

        return Inertia::render('admin/laporan-masuk/show', [
            'can' => [
                'edit' => $user?->isAdmin() ?? false,
                'delete' => $user?->isAdmin() ?? false,
            ],
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
                'is_read' => $ticket->is_read,
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

    /**
     * Perbarui data tiket (hanya admin).
     */
    public function update(UpdateTicketRequest $request, string $ticketNumber): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        $ticket->update([
            'reporter_name' => $request->validated('reporter_name'),
            'reporter_email' => $request->validated('reporter_email'),
            'reporter_wa' => $request->validated('reporter_wa'),
            'title' => $request->validated('title'),
            'content' => $request->validated('content'),
        ]);

        Cache::forget('dashboard:admin:version');

        return back()->with('success', 'Laporan berhasil diperbarui.');
    }

    /**
     * Hapus tiket beserta lampiran dan data terkait (hanya admin).
     */
    public function destroy(Request $request, string $ticketNumber): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403);
        }

        $ticket = Ticket::with(['attachments', 'responses.attachments'])
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        DB::transaction(function () use ($ticket) {
            foreach ($ticket->attachments as $attachment) {
                if ($attachment->path && Storage::disk('public')->exists($attachment->path)) {
                    Storage::disk('public')->delete($attachment->path);
                }
            }

            foreach ($ticket->responses as $response) {
                foreach ($response->attachments as $respAttachment) {
                    if ($respAttachment->path && Storage::disk('public')->exists($respAttachment->path)) {
                        Storage::disk('public')->delete($respAttachment->path);
                    }
                }
            }

            $ticket->delete();
        });

        Cache::forget('dashboard:admin:version');

        $routePrefix = $request->user()->role->value === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

        return redirect()->route("{$routePrefix}.laporan-masuk.index")
            ->with('success', 'Laporan berhasil dihapus.');
    }
}
