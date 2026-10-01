<?php

namespace App\Http\Controllers\Admin;

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
    private const RANGES = ['today', '7d', '30d'];

    public function __invoke(Request $request): Response
    {
        $range = $request->query('range', '7d');
        if (! in_array($range, self::RANGES, true)) {
            $range = '7d';
        }

        // Versi cache naik setiap ada tiket berubah, sehingga key lama otomatis tidak terpakai
        $version = Cache::get('dashboard:admin:version', 0);
        $key = "dashboard:admin:v{$version}:{$range}";

        $data = Cache::remember($key, now()->addMinutes(5), function () use ($range) {
            $from = $this->resolveFrom($range);

            return [
                'stats' => $this->buildStats($from),
                'trend' => $this->buildTrend($range, $from),
                'recentTickets' => $this->buildRecentTickets($from),
            ];
        });

        return Inertia::render('admin/dashboard', [
            'range' => $range,
            'stats' => $data['stats'],
            'trend' => $data['trend'],
            'recentTickets' => $data['recentTickets'],
        ]);
    }

    private function resolveFrom(string $range): Carbon
    {
        return match ($range) {
            'today' => now()->startOfDay(),
            '30d' => now()->subDays(29)->startOfDay(),
            default => now()->subDays(6)->startOfDay(),
        };
    }

    private function buildStats(Carbon $from): array
    {
        // Satu query untuk total, klasifikasi, dan status
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
            'website' => (int) ($channels['website'] ?? 0),
            'baru' => (int) $summary->baru,
            'respon_awal' => (int) $summary->respon_awal,
            'respon_substantif' => (int) $summary->respon_substantif,
            'selesai' => (int) $summary->selesai,
        ];
    }

    private function buildTrend(string $range, Carbon $from): array
    {
        // Hari ini: per jam. Lainnya: per hari.
        if ($range === 'today') {
            $rows = Ticket::query()
                ->where('created_at', '>=', $from)
                ->selectRaw('HOUR(created_at) as bucket, COUNT(*) as total')
                ->groupBy('bucket')
                ->pluck('total', 'bucket');

            return collect(range(0, 23))
                ->map(fn (int $h) => [
                    'label' => sprintf('%02d:00', $h),
                    'total' => (int) ($rows[$h] ?? 0),
                ])
                ->all();
        }

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
