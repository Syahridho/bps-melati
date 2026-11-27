<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Concerns\BuildsLaporanListPayload;
use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Support\ChannelFilter;
use App\Support\LaporanCache;
use App\Support\LaporanFilter;
use App\Support\LaporanFilterQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Response;

class CompletedReportsController extends Controller
{
    use BuildsLaporanListPayload, RendersRolePage;

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
        $filter = new LaporanFilter($request, 'bulan_ini', 15);

        $allowedFilters = ['semua', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi', 'berkadar_pengawasan', 'ditandai'];
        if (! in_array($filter->tab, $allowedFilters, true)) {
            $filter->tab = 'semua';
        }

        $frontendFilterKey = ($filter->tab === 'permintaan_informasi') ? 'permintaan' : $filter->tab;

        $search = $filter->search;
        $filterTab = $filter->tab;
        $perPage = $filter->perPage;
        $isSemuaWaktu = $filter->isSemuaWaktu;
        $fromInput = $filter->from;
        $toInput = $filter->to;

        $searchQueryClosure = LaporanFilterQuery::searchClosure($search);
        $roleKey = $request->user()?->role?->value ?? 'guest';

        $fetchTickets = function () use ($filter, $isSemuaWaktu, $fromInput, $toInput, $searchQueryClosure, $filterTab, $perPage) {
            return Ticket::with(['channel', 'flaggedBy'])
                ->whereIn('status', self::COMPLETED_STATUSES)
                ->filterByChannels($filter->channels)
                ->when(! $isSemuaWaktu && $fromInput && $toInput, function ($query) use ($fromInput, $toInput) {
                    $query->completedBetween($fromInput, $toInput);
                })
                ->tap($searchQueryClosure)
                ->when($filterTab !== 'semua', function ($query) use ($filterTab) {
                    if ($filterTab === 'pengaduan') {
                        $query->where('classification', 'pengaduan');
                    } elseif ($filterTab === 'aspirasi') {
                        $query->where('classification', 'aspirasi');
                    } elseif ($filterTab === 'permintaan' || $filterTab === 'permintaan_informasi') {
                        $query->where('classification', 'permintaan_informasi');
                    } elseif ($filterTab === 'berkadar_pengawasan') {
                        $query->where('is_pengawasan', true);
                    } elseif ($filterTab === 'ditandai') {
                        $query->where('is_flagged', true);
                    }
                })
                ->orderByCompletedDesc()
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (Ticket $ticket) => $this->completedListTicket($ticket));
        };

        if ($search === '') {
            $isRecent = ($isSemuaWaktu || ($toInput && (Carbon::parse($toInput)->isToday() || Carbon::parse($toInput)->isCurrentMonth())));
            $ttl = $isRecent ? 60 : LaporanCache::TTL;
            $tickets = LaporanCache::remember(
                'completed-reports',
                'list',
                [...$filter->toCacheParams(), 'role' => $roleKey],
                $ttl,
                $fetchTickets,
            );
        } else {
            $tickets = $fetchTickets();
        }

        $fetchCounts = function () use ($filter, $isSemuaWaktu, $fromInput, $toInput, $searchQueryClosure): array {
            $countBaseQuery = Ticket::query()
                ->whereIn('status', self::COMPLETED_STATUSES)
                ->filterByChannels($filter->channels)
                ->when(! $isSemuaWaktu && $fromInput && $toInput, function ($q) use ($fromInput, $toInput) {
                    $q->completedBetween($fromInput, $toInput);
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

            return [
                'semua' => (int) ($countsData->semua ?? 0),
                'pengaduan' => (int) ($countsData->pengaduan ?? 0),
                'aspirasi' => (int) ($countsData->aspirasi ?? 0),
                'permintaan' => (int) ($countsData->permintaan ?? 0),
                'berkadar_pengawasan' => (int) ($countsData->berkadar_pengawasan ?? 0),
                'ditandai' => (int) ($countsData->ditandai ?? 0),
            ];
        };

        if ($search === '') {
            $countParams = [
                'tab_counts',
                'from' => $fromInput,
                'to' => $toInput,
                'channels' => $filter->channels,
                'role' => $roleKey,
            ];
            $counts = LaporanCache::remember('completed-reports', 'counts', $countParams, 60, $fetchCounts);
        } else {
            $counts = $fetchCounts();
        }

        return $this->renderPage($request, 'completed-reports/index', [
            'tickets' => $tickets,
            'channels' => ChannelFilter::tree(),
            'filters' => $filter->toFilterProps($frontendFilterKey),
            'counts' => $counts,
        ]);
    }

    /**
     * Detail satu laporan selesai berdasarkan ticket_number.
     */
    public function show(string $ticketNumber, Request $request): Response
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

        return $this->renderPage($request, 'completed-reports/show/index', [
            'ticket' => array_merge($this->ticketPayload($ticket), [
                'is_flagged' => (bool) $ticket->is_flagged,
                'flagged_at' => $ticket->flagged_at?->toIso8601String(),
                'flagged_by_name' => $ticket->flaggedBy?->name,
                'flag_note' => $ticket->flag_note,
            ]),
        ]);
    }
}
