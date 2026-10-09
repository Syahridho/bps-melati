<?php

namespace App\Http\Controllers\Operator;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        // Counter versi yang sama dengan admin, di-bump oleh Ticket::booted
        $version = Cache::get('dashboard:admin:version', 0);
        $key = "dashboard:operator:v{$version}:month";

        $data = Cache::remember($key, now()->addMinutes(5), function () {
            $from = now()->startOfMonth();

            return [
                'stats' => $this->buildStats($from),
                'trend' => $this->buildTrend($from),
                'recentTickets' => $this->buildRecentTickets($from),
                'periodLabel' => 'Bulan Ini ('.now()->locale('id')->translatedFormat('F Y').')',
            ];
        });

        return Inertia::render('operator/dashboard', [
            'stats' => $data['stats'],
            'trend' => $data['trend'],
            'recentTickets' => $data['recentTickets'],
            'periodLabel' => $data['periodLabel'],
        ]);
    }

    private function buildStats(Carbon $from): array
    {
        $summary = Ticket::query()
            ->where('created_at', '>=', $from)
            ->selectRaw("
                COUNT(*) as total,
                SUM(classification = 'pengaduan') as pengaduan,
                SUM(classification = 'aspirasi') as aspirasi,
                SUM(classification = 'permintaan_informasi') as permintaan_informasi,
                SUM(status = 'baru') as baru,
                SUM(status = 'respon_awal') as respon_awal,
                SUM(status = 'respon_substantif') as respon_substantif,
                SUM(completed_at IS NOT NULL OR status = 'selesai') as selesai
            ")
            ->first();

        // Jumlah tiket per kanal induk (sub-kanal digabung ke induknya)
        $channels = Ticket::query()
            ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
            ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
            ->where('tickets.created_at', '>=', $from)
            ->selectRaw('COALESCE(p.slug, c.slug) as root_slug, COUNT(*) as total')
            ->groupBy('root_slug')
            ->pluck('total', 'root_slug');

        return [
            'total' => (int) $summary->total,
            'pengaduan' => (int) $summary->pengaduan,
            'aspirasi' => (int) $summary->aspirasi,
            'permintaan_informasi' => (int) $summary->permintaan_informasi,
            'span_lapor' => (int) ($channels['sp4n-lapor'] ?? 0),
            'sosial_media' => (int) ($channels['sosial-media'] ?? 0),
            'kunjungan_langsung' => (int) ($channels['kunjungan-langsung'] ?? 0),
            'wbs' => (int) ($channels['wbs'] ?? 0),
            'email' => (int) ($channels['email'] ?? 0),
            'baru' => (int) $summary->baru,
            'respon_awal' => (int) $summary->respon_awal,
            'respon_substantif' => (int) $summary->respon_substantif,
            'selesai' => (int) $summary->selesai,
        ];
    }

    private function buildTrend(Carbon $from): array
    {
        $rows = Ticket::query()
            ->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as bucket, COUNT(*) as total')
            ->groupBy('bucket')
            ->pluck('total', 'bucket');

        $points = [];
        foreach (CarbonPeriod::create($from->copy()->startOfDay(), now()->startOfDay()) as $day) {
            $points[] = [
                'label' => $day->format('d M'),
                'total' => (int) ($rows[$day->toDateString()] ?? 0),
            ];
        }

        return $points;
    }

    private function buildRecentTickets(Carbon $from): array
    {
        return Ticket::with('channel')
            ->where('created_at', '>=', $from)
            ->orderByDesc('created_at')
            ->limit(7)
            ->get()
            ->map(fn (Ticket $t) => [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'classification' => $t->classification,
                'title' => $t->title,
                'reporter_name' => $t->reporter_name,
                'content' => $t->content,
                'status' => $t->status,
                'channel' => $t->channel?->name ?? '-',
                'created_at' => $t->created_at->toIso8601String(),
            ])
            ->all();
    }
}
