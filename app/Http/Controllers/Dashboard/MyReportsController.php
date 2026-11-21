<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Concerns\BuildsLaporanListPayload;
use App\Http\Controllers\Concerns\RendersRolePage;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AssignmentModeService;
use App\Support\LaporanCache;
use App\Support\LaporanFilter;
use App\Support\LaporanTicketQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Response;

class MyReportsController extends Controller
{
    use BuildsLaporanListPayload, RendersRolePage;

    /**
     * Tab yang relevan untuk Laporan Saya. Tiket tanpa PIC tidak mungkin
     * muncul di sini karena daftar selalu dibatasi ke PIC yang login.
     *
     * @var list<string>
     */
    private const ALLOWED_FILTERS = [
        'semua',
        'belum_dibaca',
        'pengaduan',
        'aspirasi',
        'permintaan',
        'permintaan_informasi',
        'respon_awal',
        'respon_substantif',
        'berkadar_pengawasan',
        'ditandai',
    ];

    /**
     * Laporan aktif yang PIC-nya adalah operator yang sedang login.
     */
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->isOperator(), 403);

        $filter = new LaporanFilter($request, 'semua', 10);

        if (! in_array($filter->tab, self::ALLOWED_FILTERS, true)) {
            $filter->tab = 'semua';
        }

        $frontendFilterKey = ($filter->tab === 'permintaan_informasi') ? 'permintaan' : $filter->tab;

        // Pembatasan PIC selalu dari sesi login, bukan dari parameter request.
        $baseQueryBuilder = fn () => LaporanTicketQuery::activeList($filter, (int) $user->id, false)
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
            $tickets = LaporanCache::remember(
                'my-reports',
                'list',
                [...$filter->toCacheParams(), 'assigned_to' => $user->id],
                $ttl,
                $fetchTickets,
            );
        } else {
            $tickets = $fetchTickets();
        }

        // Agregat tab mengikuti rentang tanggal dan PIC, bukan search/tab aktif.
        $countParams = ['tab_counts', 'assigned_to' => $user->id, 'from' => $filter->from, 'to' => $filter->to];
        $fetchCounts = function () use ($filter, $user) {
            $countBaseQuery = Ticket::query()
                ->where('assigned_to', $user->id)
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

            return [
                'semua' => (int) ($countsData->semua ?? 0),
                'tanpa_pic' => 0,
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

        $counts = LaporanCache::remember('my-reports', 'counts', $countParams, 60, $fetchCounts);

        return $this->renderPage($request, 'my-reports/index', [
            'tickets' => $tickets,
            'filters' => $filter->toFilterProps($frontendFilterKey),
            'counts' => $counts,
            'activeAssignmentMode' => app(AssignmentModeService::class)->current()->value,
        ]);
    }
}
