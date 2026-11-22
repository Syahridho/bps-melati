<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Concerns\BuildsLaporanListPayload;
use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AssignmentModeService;
use App\Services\TicketCacheInvalidator;
use App\Support\LaporanCache;
use App\Support\LaporanFilter;
use App\Support\LaporanTicketQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;

class IncomingReportsController extends Controller
{
    use BuildsLaporanListPayload, RendersRolePage;

    /**
     * Daftar laporan masuk dengan paginasi dan pencarian.
     */
    public function index(Request $request): Response
    {
        $filter = new LaporanFilter($request, 'semua', 10);

        // Whitelist filter
        $allowedFilters = ['semua', 'belum_dibaca', 'pengaduan', 'aspirasi', 'permintaan', 'permintaan_informasi', 'respon_awal', 'respon_substantif', 'berkadar_pengawasan', 'ditandai', 'tanpa_pic'];
        if (! in_array($filter->tab, $allowedFilters, true)) {
            $filter->tab = 'semua';
        }

        $frontendFilterKey = ($filter->tab === 'permintaan_informasi') ? 'permintaan' : $filter->tab;

        // Query utama daftar tiket laporan masuk (kecuali tiket yang diinput manual dari admin dan yang sudah selesai)
        $baseQueryBuilder = fn () => LaporanTicketQuery::activeList($filter)
            ->when($filter->tab !== 'semua', function ($q) use ($filter) {
                $q->applyTabFilter($filter->tab);
            });

        $fetchTickets = function () use ($baseQueryBuilder, $filter) {
            return $baseQueryBuilder()
                ->orderByDesc('created_at')
                ->paginate($filter->perPage)
                ->withQueryString()
                ->through(fn (Ticket $ticket) => $this->laporanListTicket($ticket));
        };

        if ($filter->search === '') {
            $isRecent = ($filter->isSemuaWaktu || (Carbon::parse($filter->to)->isToday() || Carbon::parse($filter->to)->isCurrentMonth()));
            $ttl = $isRecent ? 60 : 3600;
            $tickets = LaporanCache::remember('incoming-reports', 'list', $filter->toCacheParams(), $ttl, $fetchTickets);
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
                    SUM(CASE WHEN status = 'respon_substantif' THEN 1 ELSE 0 END) as respon_substantif,
                    SUM(CASE WHEN is_pengawasan = 1 THEN 1 ELSE 0 END) as berkadar_pengawasan,
                    SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as ditandai
                ")
                ->first();

            $tanpaPicCount = (clone $countBaseQuery)->withoutActivePic()->count();

            return [
                'semua' => (int) ($countsData->semua ?? 0),
                'tanpa_pic' => $tanpaPicCount,
                'belum_dibaca' => (int) ($countsData->belum_dibaca ?? 0),
                'pengaduan' => (int) ($countsData->pengaduan ?? 0),
                'aspirasi' => (int) ($countsData->aspirasi ?? 0),
                'permintaan' => (int) ($countsData->permintaan ?? 0),
                'respon_awal' => (int) ($countsData->respon_awal ?? 0),
                'respon_substantif' => (int) ($countsData->respon_substantif ?? 0),
                'berkadar_pengawasan' => (int) ($countsData->berkadar_pengawasan ?? 0),
                'ditandai' => (int) ($countsData->ditandai ?? 0),
            ];
        };

        $counts = LaporanCache::remember('incoming-reports', 'counts', $countParams, 60, $fetchCounts);

        return $this->renderPage($request, 'incoming-reports/index', [
            'tickets' => $tickets,
            'filters' => $filter->toFilterProps($frontendFilterKey),
            'counts' => $counts,
            'activeAssignmentMode' => app(AssignmentModeService::class)->current()->value,
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
        $fromMyReports = $request->query('origin') === 'my-reports';

        $ticket = Ticket::with([
            'channel',
            'creator',
            'flaggedBy',
            'assignedTo',
            'attachments',
            'assignmentLogs.fromUser',
            'assignmentLogs.toUser',
            'assignmentLogs.performer',
            'responses' => fn ($query) => $query->orderBy('created_at')->orderBy('id')->with(['user', 'attachments']),
        ])
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        // Detail yang dibuka dari Laporan Saya tidak boleh menampilkan tiket
        // milik operator lain meskipun URL dimanipulasi.
        if ($fromMyReports) {
            abort_unless((int) $ticket->assigned_to === (int) $request->user()?->id, 404);
        }

        // Tandai sudah dibaca
        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        $user = $request->user();
        $isAdmin = $user?->isAdmin() ?? false;

        return $this->renderPage($request, 'incoming-reports/show/index', [
            'from' => $fromMyReports ? 'my-reports' : 'incoming-reports',
            'can' => [
                'edit' => false,
                'delete' => false,
                'reply' => $user?->can('reply', $ticket) ?? false,
                'claim' => $user?->can('claim', $ticket) ?? false,
                'reassign' => $isAdmin,
                'view_assignment_history' => $isAdmin,
            ],
            'assignableOperators' => $isAdmin
                ? User::query()->assignable()->get(['id', 'name'])->map(fn (User $operator): array => [
                    'id' => $operator->id,
                    'name' => $operator->name,
                ])->all()
                : [],
            'assignmentLogs' => $isAdmin
                ? $ticket->assignmentLogs->map(fn ($log): array => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->actionLabel(),
                    'from_user_name' => $log->fromUser?->name,
                    'to_user_name' => $log->toUser?->name,
                    'performed_by_name' => $log->performer?->name,
                    'note' => $log->note,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values()->all()
                : [],
            'activeAssignmentMode' => app(AssignmentModeService::class)->current()->value,
            'ticket' => $this->ticketPayload($ticket),
        ]);
    }

    /**
     * Perbarui data tiket (hanya admin).
     */
    public function update(UpdateTicketRequest $request, string $ticketNumber): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)
            ->visibleTo($request->user())
            ->firstOrFail();

        $ticket->update([
            'reporter_name' => $request->validated('reporter_name'),
            'reporter_email' => $request->validated('reporter_email'),
            'reporter_wa' => $request->validated('reporter_wa'),
            'title' => $request->validated('title'),
            'content' => $request->validated('content'),
        ]);

        app(TicketCacheInvalidator::class)->invalidateDashboard();

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

        app(TicketCacheInvalidator::class)->invalidateDashboard();

        $routePrefix = $request->user()->role->value === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

        return redirect()->route("{$routePrefix}.incoming-reports.index")
            ->with('success', 'Laporan berhasil dihapus.');
    }
}
