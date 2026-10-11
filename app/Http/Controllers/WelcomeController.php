<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    /**
     * Halaman publik: form пода laporan, pohon kanal, dan statistik publik.
     */
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'channels' => $this->channelTree(),
            'stats' => $this->publicStats(),
        ]);
    }

    /**
     * Pohon kanal induk + sub-kanal aktif untuk form select kanal.
     *
     * @return array<int, array{id: int, name: string, children: array<int, array{id: int, name: string}>}>
     */
    private function channelTree(): array
    {
        return Cache::remember('channels:tree', now()->addHours(24), function () {
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
    }

    /**
     * Statistik publik: total seluruh waktu, key ikut versi supaya otomatis segar saat ada tiket berubah.
     *
     * @return array{total: int, pengaduan: int, aspirasi: int, permintaan_informasi: int, span_lapor: int, sosial_media: int, kunjungan_langsung: int, website: int, wbs: int, email: int}
     */
    private function publicStats(): array
    {
        return Cache::remember(
            'welcome:stats:v'.Cache::get('dashboard:admin:version', 0),
            now()->addMinutes(10),
            function () {
                $summary = Ticket::query()
                    ->selectRaw("
                    COUNT(*) as total,
                    SUM(classification = 'pengaduan') as pengaduan,
                    SUM(classification = 'aspirasi') as aspirasi,
                    SUM(classification = 'permintaan_informasi') as permintaan_informasi
                ")
                    ->first();

                // Sub-kanal digabung ke kanal induknya
                $channelCounts = Ticket::query()
                    ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
                    ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
                    ->selectRaw('COALESCE(p.slug, c.slug) as root_slug, COUNT(*) as total')
                    ->groupBy('root_slug')
                    ->pluck('total', 'root_slug');

                return [
                    'total' => (int) $summary->total,
                    'pengaduan' => (int) $summary->pengaduan,
                    'aspirasi' => (int) $summary->aspirasi,
                    'permintaan_informasi' => (int) $summary->permintaan_informasi,
                    'span_lapor' => (int) ($channelCounts['sp4n-lapor'] ?? 0),
                    'sosial_media' => (int) ($channelCounts['sosial-media'] ?? 0),
                    'kunjungan_langsung' => (int) ($channelCounts['kunjungan-langsung'] ?? 0),
                    'website' => (int) ($channelCounts['website'] ?? 0),
                    'wbs' => (int) ($channelCounts['wbs'] ?? 0),
                    'email' => (int) ($channelCounts['email'] ?? 0),
                ];
            },
        );
    }
}
