<?php

namespace App\Http\Controllers\Admin;

use App\Events\TicketCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class InputDataController extends Controller
{
    /**
     * Tampilkan halaman daftar & form input data dengan paginasi.
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
                if ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan') {
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
            'pengaduan' => Ticket::where('classification', 'pengaduan')->count(),
            'aspirasi' => Ticket::where('classification', 'aspirasi')->count(),
            'permintaan' => Ticket::where('classification', 'permintaan_informasi')->count(),
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
                'search' => $search ?? '',
                'filter' => $filter,
                'per_page' => $perPage,
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Simpan data tiket baru yang diinput oleh admin.
     */
    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $period = now()->format('Y-m');

        $generated = Ticket::generateTicketNumber(
            $validated['classification'],
            $period
        );

        $ticket = Ticket::create([
            'ticket_number' => $generated['ticket_number'],
            'period' => $period,
            'sequence' => $generated['sequence'],
            'classification' => $validated['classification'],
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
            'created_at' => $ticket->created_at->toDateTimeString(),
        ], now()->addHours(24));

        TicketCreated::dispatch($ticket);

        return redirect()->back()->with('flash', [
            'ticket_number' => $ticket->ticket_number,
            'success' => 'Data tiket berhasil ditambahkan!',
        ]);
    }
}
