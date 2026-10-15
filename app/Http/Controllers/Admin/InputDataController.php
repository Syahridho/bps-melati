<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Mail\TicketResponseSubmitted;
use App\Models\Channel;
use App\Models\Ticket;
use App\Support\LaporanFilter;
use App\Support\LaporanFilterQuery;
use App\Support\TicketResponsePayload;
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
        $filter = new LaporanFilter($request, 'semua', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi'];
        if (! in_array($filter->tab, $allowedFilters, true)) {
            $filter->tab = 'semua';
        }

        $frontendFilterKey = ($filter->tab === 'permintaan_informasi') ? 'permintaan' : $filter->tab;

        $searchClosure = LaporanFilterQuery::searchClosure($filter->search);

        // Query utama daftar tiket (hanya tiket yang diinput manual oleh admin/operator)
        $ticketsQuery = Ticket::with('channel')
            ->where('source_app', 'admin')
            ->when(! $filter->isSemuaWaktu && $filter->from && $filter->to, function ($q) use ($filter) {
                $q->whereDate('created_at', '>=', $filter->from)
                    ->whereDate('created_at', '<=', $filter->to);
            })
            ->tap($searchClosure)
            ->when($filter->tab !== 'semua', function ($query) use ($filter) {
                if ($filter->tab === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter->tab === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter->tab === 'permintaan' || $filter->tab === 'permintaan_informasi') {
                    $query->where('classification', 'permintaan_informasi');
                }
            });

        $tickets = $ticketsQuery
            ->orderByDesc('created_at')
            ->paginate($filter->perPage)
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

        // Counts mengikuti pencarian dan rentang tanggal, tapi TIDAK mengikuti tab
        $countBaseQuery = Ticket::query()
            ->where('source_app', 'admin')
            ->when(! $filter->isSemuaWaktu && $filter->from && $filter->to, function ($q) use ($filter) {
                $q->whereDate('created_at', '>=', $filter->from)
                    ->whereDate('created_at', '<=', $filter->to);
            })
            ->tap($searchClosure);

        $countsData = (clone $countBaseQuery)
            ->selectRaw("
                COUNT(*) as semua,
                SUM(CASE WHEN classification = 'pengaduan' THEN 1 ELSE 0 END) as pengaduan,
                SUM(CASE WHEN classification = 'aspirasi' THEN 1 ELSE 0 END) as aspirasi,
                SUM(CASE WHEN classification = 'permintaan_informasi' THEN 1 ELSE 0 END) as permintaan
            ")
            ->first();

        $counts = [
            'semua' => (int) ($countsData->semua ?? 0),
            'pengaduan' => (int) ($countsData->pengaduan ?? 0),
            'aspirasi' => (int) ($countsData->aspirasi ?? 0),
            'permintaan' => (int) ($countsData->permintaan ?? 0),
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
            'filters' => $filter->toFilterProps($frontendFilterKey),
            'counts' => $counts,
        ]);
    }

    /**
     * Detail tiket input-data — edit & delete selalu diperbolehkan.
     */
    public function show(Request $request, string $ticketNumber): Response
    {
        $ticket = Ticket::with([
            'channel',
            'creator',
            'attachments',
            'responses' => fn ($query) => $query->orderBy('created_at')->orderBy('id')->with(['user', 'attachments']),
        ])
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
                'version' => $ticket->version,
                'is_read' => $ticket->is_read,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_by_name' => $ticket->creator?->name,
                'completed_at' => $ticket->completed_at?->toIso8601String(),
                'closed_reason' => $ticket->closed_reason,
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
                'closed_reason' => 'staff',
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

        return redirect()->back()->with('flash', [
            'ticket_number' => $ticket->ticket_number,
            'success' => 'Data tiket berhasil ditambahkan!',
        ]);
    }
}
