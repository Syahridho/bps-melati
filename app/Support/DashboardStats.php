<?php

namespace App\Support;

use App\Models\Channel;
use App\Models\Ticket;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Cache;

/**
 * Sumber tunggal data dashboard untuk admin DAN operator.
 */
class DashboardStats
{
    public const VERSION_KEY = CacheKeys::DASHBOARD_ADMIN_VERSION;

    public const TTL = 300;

    private const CHANNEL_KEYS = [
        'sp4n-lapor' => 'span_lapor',
        'sosial-media' => 'sosial_media',
        'kunjungan-langsung' => 'kunjungan_langsung',
        'wbs' => 'wbs',
        'email' => 'email',
        'website' => 'website',
    ];

    private const FALLBACK_COLOR = '#6b7280';

    public static function cached(?array $period = null): array
    {
        if ($period === null) {
            $period = DashboardPeriod::resolve('this_month', null, null);
        }

        return Cache::remember(self::cacheKey($period), self::ttl($period), fn (): array => self::build($period));
    }

    public static function cacheKey(array $period): string
    {
        $version = (int) Cache::get(self::VERSION_KEY, 0);

        if ($period['period'] === 'this_month') {
            return sprintf('dashboard:month:v%d', $version);
        }

        if ($period['period'] === 'this_year') {
            return sprintf('dashboard:this_year:%d:v%d', $period['year'], $version);
        }

        return sprintf('dashboard:%s:%d-%02d:v%d', $period['period'], $period['year'], $period['month'], $version);
    }

    public static function ttl(array $period): int
    {
        if (in_array($period['period'], ['this_month', 'this_year'], true)) {
            return self::TTL;
        }

        return 3600;
    }

    public static function build(?array $period = null): array
    {
        if ($period === null) {
            $period = DashboardPeriod::resolve('this_month', null, null);
        }
        $from = $period['start'];
        $to = $period['end'];

        return [
            'stats' => self::stats($from, $to),
            'trend' => self::trend($from, $to, $period['trend']),
            'recentTickets' => self::recentTickets($from, $to),
            'periodLabel' => $period['label'],
            'sumberKanal' => self::sumberKanal($from, $to),
        ];
    }

    public static function sumberKanal(Carbon $from, ?Carbon $to = null): array
    {
        $query = Ticket::query()
            ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
            ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
            ->where('tickets.created_at', '>=', $from);

        if ($to !== null) {
            $query->where('tickets.created_at', '<=', $to);
        }

        $counts = $query
            ->selectRaw('COALESCE(p.id, c.id) as root_id, COUNT(*) as total')
            ->groupBy('root_id')
            ->pluck('total', 'root_id');

        return Channel::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($ch) => [
                'id' => (int) $ch->id,
                'name' => (string) $ch->name,
                'slug' => (string) $ch->slug,
                'color' => (string) ($ch->color ?? self::FALLBACK_COLOR),
                'total' => (int) ($counts[$ch->id] ?? 0),
            ])
            ->all();
    }

    private static function stats(Carbon $from, ?Carbon $to = null): array
    {
        $query = Ticket::query()->where('created_at', '>=', $from);
        if ($to !== null) {
            $query->where('created_at', '<=', $to);
        }

        $summary = $query
            ->selectRaw("
                COUNT(*) as total,
                SUM(classification = 'pengaduan') as pengaduan,
                SUM(classification = 'aspirasi') as aspirasi,
                SUM(classification = 'permintaan_informasi') as permintaan_informasi,
                SUM(is_pengawasan = 1) as berkadar_pengawasan,
                SUM(status = 'baru') as baru,
                SUM(status = 'respon_awal') as respon_awal,
                SUM(status = 'respon_substantif') as respon_substantif,
                SUM(completed_at IS NOT NULL OR status = 'selesai') as selesai
            ")
            ->first();

        $channelQuery = Ticket::query()
            ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
            ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
            ->where('tickets.created_at', '>=', $from);

        if ($to !== null) {
            $channelQuery->where('tickets.created_at', '<=', $to);
        }

        $channels = $channelQuery
            ->selectRaw('COALESCE(p.slug, c.slug) as root_slug, COUNT(*) as total')
            ->groupBy('root_slug')
            ->pluck('total', 'root_slug');

        $stats = [
            'total' => (int) $summary->total,
            'pengaduan' => (int) $summary->pengaduan,
            'aspirasi' => (int) $summary->aspirasi,
            'permintaan_informasi' => (int) $summary->permintaan_informasi,
            'berkadar_pengawasan' => (int) $summary->berkadar_pengawasan,
        ];

        foreach (self::CHANNEL_KEYS as $slug => $key) {
            $stats[$key] = (int) ($channels[$slug] ?? 0);
        }
        if (isset($channels['android'])) {
            $stats['android'] = (int) $channels['android'];
        }

        return $stats + [
            'baru' => (int) $summary->baru,
            'respon_awal' => (int) $summary->respon_awal,
            'respon_substantif' => (int) $summary->respon_substantif,
            'selesai' => (int) $summary->selesai,
        ];
    }

    private static function trend(Carbon $from, ?Carbon $to = null, string $mode = 'daily'): array
    {
        $end = $to ?? now();

        if ($mode === 'monthly') {
            $rows = Ticket::query()
                ->where('created_at', '>=', $from)
                ->where('created_at', '<=', $end)
                ->selectRaw('MONTH(created_at) as bucket, classification, COUNT(*) as total')
                ->groupBy('bucket', 'classification')
                ->get()
                ->groupBy('bucket');

            $points = [];
            $endMonth = (int) $end->month;
            for ($m = 1; $m <= $endMonth; $m++) {
                $byClass = [];
                foreach ($rows->get($m, collect()) as $row) {
                    $byClass[$row->classification] = (int) $row->total;
                }
                $pengaduan = $byClass['pengaduan'] ?? 0;
                $aspirasi = $byClass['aspirasi'] ?? 0;
                $permintaan = $byClass['permintaan_informasi'] ?? 0;

                $monthCarbon = Carbon::create($from->year, $m, 1);

                $points[] = [
                    'label' => $monthCarbon->locale('id')->translatedFormat('M'),
                    'pengaduan' => $pengaduan,
                    'aspirasi' => $aspirasi,
                    'permintaan_informasi' => $permintaan,
                    'total' => $pengaduan + $aspirasi + $permintaan,
                ];
            }

            return $points;
        }

        $rows = Ticket::query()
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $end)
            ->selectRaw('DATE(created_at) as bucket, classification, COUNT(*) as total')
            ->groupBy('bucket', 'classification')
            ->get()
            ->groupBy('bucket');

        $points = [];

        foreach (CarbonPeriod::create($from->copy()->startOfDay(), $end->copy()->startOfDay()) as $day) {
            $date = $day->toDateString();
            $byClass = [];
            foreach ($rows->get($date, collect()) as $row) {
                $byClass[$row->classification] = (int) $row->total;
            }
            $pengaduan = $byClass['pengaduan'] ?? 0;
            $aspirasi = $byClass['aspirasi'] ?? 0;
            $permintaan = $byClass['permintaan_informasi'] ?? 0;

            $points[] = [
                'label' => $day->format('d M'),
                'pengaduan' => $pengaduan,
                'aspirasi' => $aspirasi,
                'permintaan_informasi' => $permintaan,
                'total' => $pengaduan + $aspirasi + $permintaan,
            ];
        }

        return $points;
    }

    private static function recentTickets(Carbon $from, ?Carbon $to = null): array
    {
        $query = Ticket::with('channel')
            ->where('created_at', '>=', $from);

        if ($to !== null) {
            $query->where('created_at', '<=', $to);
        }

        return $query
            ->orderByDesc('created_at')
            ->limit(7)
            ->get()
            ->map(fn (Ticket $t): array => [
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
