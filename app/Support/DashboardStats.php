<?php

namespace App\Support;

use App\Models\Ticket;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Cache;

/**
 * Sumber tunggal data dashboard untuk admin DAN operator.
 *
 * Kedua role melihat laporan yang sama, jadi angka, tren, dan daftar laporan
 * terbaru harus dihitung sekali agar tidak pernah berbeda antar halaman.
 * Versi admin yang menjadi acuan; jangan menambahkan cabang per role.
 */
class DashboardStats
{
    /**
     * Counter versi yang juga di-bump oleh Ticket::booted().
     */
    public const VERSION_KEY = 'dashboard:admin:version';

    /**
     * Berapa lama payload dashboard disimpan (detik).
     */
    public const TTL = 300;

    /**
     * Slug kanal induk yang tampil sebagai kartu di dashboard.
     *
     * @var array<string, string>
     */
    private const CHANNEL_KEYS = [
        'sp4n-lapor' => 'span_lapor',
        'sosial-media' => 'sosial_media',
        'kunjungan-langsung' => 'kunjungan_langsung',
        'wbs' => 'wbs',
        'email' => 'email',
        'website' => 'website',
    ];

    /**
     * Payload dashboard bulan berjalan, dari cache bila tersedia.
     *
     * @return array{stats: array<string, int>, trend: list<array{label: string, total: int}>, recentTickets: list<array<string, mixed>>, periodLabel: string}
     */
    public static function cached(): array
    {
        return Cache::remember(self::cacheKey(), self::TTL, fn (): array => self::build());
    }

    /**
     * Kunci cache mengikuti counter versi supaya seluruh role langsung dapat
     * angka baru begitu ada tiket yang berubah.
     */
    public static function cacheKey(): string
    {
        return sprintf('dashboard:month:v%d', (int) Cache::get(self::VERSION_KEY, 0));
    }

    /**
     * @return array{stats: array<string, int>, trend: list<array{label: string, total: int}>, recentTickets: list<array<string, mixed>>, periodLabel: string}
     */
    public static function build(): array
    {
        $from = now()->startOfMonth();

        return [
            'stats' => self::stats($from),
            'trend' => self::trend($from),
            'recentTickets' => self::recentTickets($from),
            'periodLabel' => 'Bulan Ini ('.now()->locale('id')->translatedFormat('F Y').')',
        ];
    }

    /**
     * Total, klasifikasi, status, dan jumlah per kanal induk bulan berjalan.
     *
     * @return array<string, int>
     */
    private static function stats(Carbon $from): array
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

        $stats = [
            'total' => (int) $summary->total,
            'pengaduan' => (int) $summary->pengaduan,
            'aspirasi' => (int) $summary->aspirasi,
            'permintaan_informasi' => (int) $summary->permintaan_informasi,
        ];

        foreach (self::CHANNEL_KEYS as $slug => $key) {
            $stats[$key] = (int) ($channels[$slug] ?? 0);
        }

        return $stats + [
            'baru' => (int) $summary->baru,
            'respon_awal' => (int) $summary->respon_awal,
            'respon_substantif' => (int) $summary->respon_substantif,
            'selesai' => (int) $summary->selesai,
        ];
    }

    /**
     * Jumlah tiket per hari sejak awal bulan.
     *
     * @return list<array{label: string, total: int}>
     */
    private static function trend(Carbon $from): array
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

    /**
     * 7 laporan terbaru bulan berjalan.
     *
     * @return list<array<string, mixed>>
     */
    private static function recentTickets(Carbon $from): array
    {
        return Ticket::with('channel')
            ->where('created_at', '>=', $from)
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
