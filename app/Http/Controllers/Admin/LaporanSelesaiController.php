<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

use Inertia\Inertia;
use Inertia\Response;

class LaporanSelesaiController extends Controller
{
    /**
     * Status yang dianggap "selesai" (sudah direspon).
     *
     * @var array<int, string>
     */
    private const COMPLETED_STATUSES = ['selesai'];

    /**
     * Daftar laporan selesai dengan paginasi, pencarian, dan rentang tanggal (Date Range).
     */
    public function index(Request $request): Response
    {
        $search = trim((string) ($request->query('q', $request->query('search', ''))));
        $filter = (string) ($request->query('tab', $request->query('filter', 'semua')));
        $perPage = (int) $request->query('per_page', 15);
        $fromInput = $request->query('from');
        $toInput = $request->query('to');

        // Whitelist filter / tab
        $allowedFilters = ['semua', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi', 'berkadar_pengawasan', 'ditandai'];
        if (! in_array($filter, $allowedFilters, true)) {
            $filter = 'semua';
        }

        // Whitelist per_page
        if (! in_array($perPage, [10, 15, 20, 50, 100], true)) {
            $perPage = 15;
        }

        $frontendFilterKey = ($filter === 'permintaan_informasi') ? 'permintaan' : $filter;

        // Resolusi rentang tanggal (Timezone: Asia/Jakarta)
        $tz = 'Asia/Jakarta';
        $isSemuaWaktu = ($fromInput === 'semua' || $toInput === 'semua');

        if (! $isSemuaWaktu) {
            if ($fromInput && $toInput) {
                try {
                    $fromDate = Carbon::parse($fromInput, $tz)->toDateString();
                    $toDate = Carbon::parse($toInput, $tz)->toDateString();
                    if ($toDate < $fromDate) {
                        $toDate = $fromDate;
                        $toInput = $fromInput;
                    }
                    $fromInput = $fromDate;
                    $toInput = $toDate;
                } catch (\Throwable) {
                    $now = Carbon::now($tz);
                    $fromInput = $now->copy()->startOfMonth()->toDateString();
                    $toInput = $now->copy()->endOfMonth()->toDateString();
                }
            } else {
                // Default: Bulan ini
                $now = Carbon::now($tz);
                $fromInput = $now->copy()->startOfMonth()->toDateString();
                $toInput = $now->copy()->endOfMonth()->toDateString();
            }
        } else {
            $fromInput = 'semua';
            $toInput = 'semua';
        }

        // Callback pencarian kata kunci (Catatan: untuk performa tabel besar, pertimbangkan MySQL FULLTEXT index)
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
        $ticketsQuery = Ticket::with(['channel', 'flaggedBy'])
            ->whereIn('status', self::COMPLETED_STATUSES)
            ->when(! $isSemuaWaktu && $fromInput && $toInput, function ($query) use ($fromInput, $toInput) {
                $query->whereDate('updated_at', '>=', $fromInput)
                    ->whereDate('updated_at', '<=', $toInput);
            })
            ->tap($searchQueryClosure)
            ->when($filter !== 'semua', function ($query) use ($filter) {
                if ($filter === 'pengaduan') {
                    $query->where('classification', 'pengaduan');
                } elseif ($filter === 'aspirasi') {
                    $query->where('classification', 'aspirasi');
                } elseif ($filter === 'permintaan' || $filter === 'permintaan_informasi') {
                    $query->where('classification', 'permintaan_informasi');
                } elseif ($filter === 'berkadar_pengawasan') {
                    $query->where('is_pengawasan', true);
                } elseif ($filter === 'ditandai') {
                    $query->where('is_flagged', true);
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
                'is_pengawasan' => (bool) $ticket->is_pengawasan,
                'is_flagged' => (bool) $ticket->is_flagged,
                'flagged_at' => $ticket->flagged_at?->toIso8601String(),
                'flagged_by_name' => $ticket->flaggedBy?->name,
                'flag_note' => $ticket->flag_note,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'closed_reason' => $ticket->closed_reason,
                'completed_at' => $ticket->completed_at?->toIso8601String(),
                'created_at' => $ticket->created_at->toIso8601String(),
                'updated_at' => $ticket->updated_at->toIso8601String(),
            ]);

        // Base query untuk counts (mengikuti rentang tanggal dan pencarian, tanpa filter tab)
        $countBaseQuery = Ticket::query()
            ->whereIn('status', self::COMPLETED_STATUSES)
            ->when(! $isSemuaWaktu && $fromInput && $toInput, function ($q) use ($fromInput, $toInput) {
                $q->whereDate('updated_at', '>=', $fromInput)
                    ->whereDate('updated_at', '<=', $toInput);
            })
            ->tap($searchQueryClosure);

        $countsData = (clone $countBaseQuery)
            ->selectRaw("
                COUNT(*) as semua,
                SUM(CASE WHEN classification = 'pengaduan' THEN 1 ELSE 0 END) as pengaduan,
                SUM(CASE WHEN classification = 'aspirasi' THEN 1 ELSE 0 END) as aspirasi,
                SUM(CASE WHEN classification = 'permintaan_informasi' THEN 1 ELSE 0 END) as permintaan,
                SUM(CASE WHEN is_pengawasan = 1 THEN 1 ELSE 0 END) as berkadar_pengawasan,
                SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as ditandai
            ")
            ->first();

        $counts = [
            'semua' => (int) ($countsData->semua ?? 0),
            'pengaduan' => (int) ($countsData->pengaduan ?? 0),
            'aspirasi' => (int) ($countsData->aspirasi ?? 0),
            'permintaan' => (int) ($countsData->permintaan ?? 0),
            'berkadar_pengawasan' => (int) ($countsData->berkadar_pengawasan ?? 0),
            'ditandai' => (int) ($countsData->ditandai ?? 0),
        ];

        return Inertia::render('admin/laporan-selesai', [
            'tickets' => $tickets,
            'filters' => [
                'search' => $search,
                'filter' => $frontendFilterKey,
                'per_page' => $perPage,
                'from' => $fromInput,
                'to' => $toInput,
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Detail satu laporan selesai berdasarkan ticket_number.
     */
    public function show(string $ticketNumber): Response
    {
        $ticket = Ticket::with([
            'channel',
            'creator',
            'flaggedBy',
            'pengawasanBy',
            'attachments',
            'responses' => fn ($query) => $query->orderBy('created_at')->orderBy('id')->with(['user', 'attachments']),
        ])
            ->where('ticket_number', $ticketNumber)
            ->whereIn('status', self::COMPLETED_STATUSES)
            ->firstOrFail();

        return Inertia::render('admin/laporan-selesai/show', [
            'ticket' => array_merge($this->ticketPayload($ticket), [
                'is_flagged' => (bool) $ticket->is_flagged,
                'flagged_at' => $ticket->flagged_at?->toIso8601String(),
                'flagged_by_name' => $ticket->flaggedBy?->name,
                'flag_note' => $ticket->flag_note,
            ]),
        ]);
    }
}
