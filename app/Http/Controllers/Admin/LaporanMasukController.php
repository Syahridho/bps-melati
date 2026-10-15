<?php

namespace App\Http\Controllers\Admin;

use App\Actions\AutoCloseTickets;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use App\Support\LaporanCache;
use App\Support\LaporanFilter;
use App\Support\LaporanFilterQuery;
use App\Support\TicketResponsePayload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
        $filter = new LaporanFilter($request, 'semua', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'belum_dibaca', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi', 'respon_awal', 'respon_substantif'];
        if (! in_array($filter->tab, $allowedFilters, true)) {
            $filter->tab = 'semua';
        }

        $frontendFilterKey = ($filter->tab === 'permintaan_informasi') ? 'permintaan' : $filter->tab;

        $searchClosure = LaporanFilterQuery::searchClosure($filter->search);

        // Query utama daftar tiket laporan masuk (kecuali tiket yang diinput manual dari admin dan yang sudah selesai)
        $baseQueryBuilder = function () use ($filter, $searchClosure) {
            $query = Ticket::with(['channel', 'lastResponse.user'])
                ->where('source_app', '!=', 'admin')
                ->where('status', '!=', 'selesai')
                ->when(! $filter->isSemuaWaktu && $filter->from && $filter->to, function ($q) use ($filter) {
                    $q->whereDate('created_at', '>=', $filter->from)
                        ->whereDate('created_at', '<=', $filter->to);
                })
                ->tap($searchClosure);

            if ($filter->tab !== 'semua') {
                if ($filter->tab === 'belum_dibaca') {
                    $query->where('is_read', false);
                } elseif ($filter->tab === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter->tab === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter->tab === 'permintaan' || $filter->tab === 'permintaan_informasi') {
                    $query->where('classification', 'permintaan_informasi');
                } elseif ($filter->tab === 'respon_awal') {
                    $query->where('status', 'respon_awal');
                } elseif ($filter->tab === 'respon_substantif') {
                    $query->where('status', 'respon_substantif');
                }
            }

            return $query;
        };

        $fetchTickets = function () use ($baseQueryBuilder, $filter) {
            return $baseQueryBuilder()
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
                    'version' => $ticket->version,
                    'is_read' => $ticket->is_read,
                    'source_app' => $ticket->source_app,
                    'channel' => $ticket->channel?->name ?? '-',
                    'created_at' => $ticket->created_at->toIso8601String(),
                    'last_responded_by' => $ticket->relationLoaded('lastResponse')
                        ? $ticket->lastResponse?->user?->name
                        : null,
                ]);
        };

        if ($filter->search === '') {
            $isRecent = ($filter->isSemuaWaktu || (Carbon::parse($filter->to)->isToday() || Carbon::parse($filter->to)->isCurrentMonth()));
            $ttl = $isRecent ? 60 : 3600;
            $tickets = LaporanCache::remember('laporan-masuk', 'list', $filter->toCacheParams(), $ttl, $fetchTickets);
        } else {
            $tickets = $fetchTickets();
        }

        // Agregat counts per tab mengikuti rentang tanggal, TIDAK mengikuti search/tab
        $countParams = ['tab_counts', 'from' => $filter->from, 'to' => $filter->to];
        $fetchCounts = function () use ($filter) {
            $countBaseQuery = Ticket::query()
                ->where('source_app', '!=', 'admin')
                ->where('status', '!=', 'selesai')
                ->when(! $filter->isSemuaWaktu && $filter->from && $filter->to, function ($q) use ($filter) {
                    $q->whereDate('created_at', '>=', $filter->from)
                        ->whereDate('created_at', '<=', $filter->to);
                });

            $countsData = (clone $countBaseQuery)
                ->selectRaw("
                    COUNT(*) as semua,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as belum_dibaca,
                    SUM(CASE WHEN classification = 'pengaduan' THEN 1 ELSE 0 END) as pengaduan,
                    SUM(CASE WHEN classification = 'aspirasi' THEN 1 ELSE 0 END) as aspirasi,
                    SUM(CASE WHEN classification = 'permintaan_informasi' THEN 1 ELSE 0 END) as permintaan,
                    SUM(CASE WHEN status = 'respon_awal' THEN 1 ELSE 0 END) as respon_awal,
                    SUM(CASE WHEN status = 'respon_substantif' THEN 1 ELSE 0 END) as respon_substantif
                ")
                ->first();

            return [
                'semua' => (int) ($countsData->semua ?? 0),
                'belum_dibaca' => (int) ($countsData->belum_dibaca ?? 0),
                'pengaduan' => (int) ($countsData->pengaduan ?? 0),
                'aspirasi' => (int) ($countsData->aspirasi ?? 0),
                'permintaan' => (int) ($countsData->permintaan ?? 0),
                'respon_awal' => (int) ($countsData->respon_awal ?? 0),
                'respon_substantif' => (int) ($countsData->respon_substantif ?? 0),
            ];
        };

        $counts = LaporanCache::remember('laporan-masuk', 'counts', $countParams, 60, $fetchCounts);

        return Inertia::render('admin/laporan-masuk', [
            'tickets' => $tickets,
            'filters' => $filter->toFilterProps($frontendFilterKey),
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
        $ticket = Ticket::with([
            'channel',
            'creator',
            'attachments',
            'responses' => fn ($query) => $query->orderBy('created_at')->orderBy('id')->with(['user', 'attachments']),
        ])
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        // Tandai sudah dibaca
        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        return Inertia::render('admin/laporan-masuk/show', [
            'from' => 'laporan-masuk',
            'can' => [
                'edit' => false,
                'delete' => false,
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
                    fn ($response) => TicketResponsePayload::from($response, $ticket)
                )->values()->all(),
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
