<?php

namespace App\Http\Controllers\Admin;

use App\Events\TicketCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Mail\TicketResponseSubmitted;
use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class InputDataController extends Controller
{
    /**
     * Tampilkan halaman daftar & form input data dengan paginasi.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $filter = (string) $request->query('filter', 'semua');
        $perPage = (int) $request->query('per_page', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi'];
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

        // Query utama daftar tiket (hanya tiket yang diinput manual oleh admin/operator)
        $ticketsQuery = Ticket::with('channel')
            ->where('source_app', 'admin')
            ->tap($searchQueryClosure)
            ->when($filter !== 'semua', function ($query) use ($filter) {
                if ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan' || $filter === 'permintaan_informasi') {
                    $query->where('classification', 'permintaan_informasi');
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
        $countBaseQuery = Ticket::query()->where('source_app', 'admin')->tap($searchQueryClosure);

        $counts = [
            'semua' => (clone $countBaseQuery)->count(),
            'pengaduan' => (clone $countBaseQuery)->where('classification', 'pengaduan')->count(),
            'aspirasi' => (clone $countBaseQuery)->where('classification', 'aspirasi')->count(),
            'permintaan' => (clone $countBaseQuery)->where('classification', 'permintaan_informasi')->count(),
        ];

        $channels = Cache::remember('channels:tree', now()->addHours(24), function () {
            return Channel::with('children')
                ->whereNull('parent_id')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($ch) => [
                    'id' => $ch->id,
                    'name' => $ch->name,
                    'children' => $ch->children->where('is_active', true)->map(fn ($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                    ])->values()->all(),
                ])
                ->all();
        });

        return Inertia::render('admin/input-data', [
            'tickets' => $tickets,
            'channels' => $channels,
            'filters' => [
                'search' => $search,
                'filter' => $frontendFilterKey,
                'per_page' => $perPage,
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Detail tiket input-data — edit & delete selalu diperbolehkan.
     */
    public function show(Request $request, string $ticketNumber): Response
    {
        $ticket = Ticket::with(['channel', 'creator', 'attachments', 'responses.user', 'responses.attachments'])
            ->where('ticket_number', $ticketNumber)
            ->where('source_app', 'admin')
            ->firstOrFail();

        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        return Inertia::render('admin/laporan-masuk/show', [
            'from' => 'input-data',
            'can' => [
                'edit' => true,
                'delete' => true,
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
     * Simpan data tiket baru yang diinput oleh admin.
     */
    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $period = now()->format('Y-m');

        $creator = auth()->user();
        $creatorName = $creator?->name ?? 'Admin';

        // Untuk input-data admin/operator, nomor tiket dibuat menggunakan nama pembuat + tanggal + urutan periodik unik
        $generated = Ticket::generateAdminTicketNumber($creatorName, $period);

        $ticket = Ticket::create([
            'ticket_number' => $generated['ticket_number'],
            'period' => $period,
            'sequence' => $generated['sequence'],
            'classification' => $validated['classification'],
            'title' => $validated['title'],
            'service_type' => $validated['service_type'] ?? null,
            'satuan_tugas' => $validated['satuan_tugas'] ?? null,
            'channel_id' => $validated['channel_id'],
            'reporter_name' => $validated['reporter_name'] ?? null,
            'reporter_email' => $validated['reporter_email'] ?? null,
            'reporter_wa' => $validated['reporter_wa'] ?? null,
            'content' => $validated['content'],
            'status' => 'baru',
            'is_read' => false,
            'source_app' => 'admin',
            'created_by' => auth()->id(),
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("attachments/{$ticket->id}", 'public');

                $ticket->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        // Jika admin/operator mengisi balasan langsung dari modal
        if (! empty($validated['response_message'])) {
            $responseType = $validated['response_type'] ?? 'respon_awal';

            $response = $ticket->responses()->create([
                'user_id' => auth()->id(),
                'type' => $responseType,
                'message' => $validated['response_message'],
                'sent_at' => now(),
            ]);

            if ($request->hasFile('response_attachments')) {
                foreach ($request->file('response_attachments') as $file) {
                    $path = $file->store("response_attachments/{$response->id}", 'public');

                    $response->attachments()->create([
                        'path' => $path,
                        'original_name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getClientMimeType(),
                        'size' => $file->getSize(),
                    ]);
                }
            }

            $ticket->update([
                'status' => 'selesai',
                'completed_at' => now(),
            ]);

            $cacheKey = "response:{$response->id}";
            Cache::put($cacheKey, [
                'id' => $response->id,
                'ticket_id' => $ticket->id,
                'type' => $response->type,
                'message' => $response->message,
                'user' => $creatorName,
                'sent_at' => $response->sent_at->toIso8601String(),
            ], now()->addHours(24));

            if (! empty($ticket->reporter_email)) {
                try {
                    Mail::to($ticket->reporter_email)
                        ->send(new TicketResponseSubmitted($ticket, $response->load('attachments')));
                    $response->update(['email_sent_at' => now()]);
                } catch (\Throwable $e) {
                    Log::error("Gagal mengirim email tanggapan: {$e->getMessage()}");
                }
            }
        }

        // Simpan sementara di Redis (cache) selama 24 jam
        $cacheKey = "ticket:{$ticket->ticket_number}";
        Cache::put($cacheKey, [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'status' => $ticket->status,
            'created_at' => $ticket->created_at->toIso8601String(),
        ], now()->addHours(24));

        TicketCreated::dispatch($ticket);

        return redirect()->back()->with('flash', [
            'ticket_number' => $ticket->ticket_number,
            'success' => 'Data tiket berhasil ditambahkan!',
        ]);
    }
}
