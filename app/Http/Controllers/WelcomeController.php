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
     * @return array<int, array{id: int, name: string, slug: string, color: string|null, children: array<int, array{id: int, name: string, slug: string, color: string|null}>}>
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
                    'slug' => $ch->slug,
                    'color' => $ch->color,
                    'children' => $ch->children->where('is_active', true)->map(fn ($c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'slug' => $c->slug,
                        'color' => $c->color ?? $ch->color,
                    ])->values()->all(),
                ])
                ->all();
        });
    }

    /**
     * Statistik publik: total seluruh waktu, key ikut versi supaya otomatis segar saat ada tiket berubah.
     *
     * @return array<string, mixed>
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

                // Sub-kanal digabung ke kanal induknya (by id, tidak lagi slug-hardcode)
                $channelCounts = Ticket::query()
                    ->join('channels as c', 'c.id', '=', 'tickets.channel_id')
                    ->leftJoin('channels as p', 'p.id', '=', 'c.parent_id')
                    ->selectRaw('COALESCE(p.id, c.id) as root_id, COUNT(*) as total')
                    ->groupBy('root_id')
                    ->pluck('total', 'root_id');

                $channels = Channel::whereNull('parent_id')
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->get()
                    ->map(fn ($ch) => [
                        'id' => (int) $ch->id,
                        'name' => (string) $ch->name,
                        'slug' => (string) $ch->slug,
                        'color' => (string) ($ch->color ?? '#6b7280'),
                        'total' => (int) ($channelCounts[$ch->id] ?? 0),
                    ])
                    ->values()
                    ->all();

                return [
                    'total' => (int) $summary->total,
                    'pengaduan' => (int) $summary->pengaduan,
                    'aspirasi' => (int) $summary->aspirasi,
                    'permintaan_informasi' => (int) $summary->permintaan_informasi,
                    // Key lama dipertahankan untuk kompatibilitas, diisi dari DB by slug.
                    'span_lapor' => (int) $channelCounts->get((int) Channel::where('slug', 'sp4n-lapor')->value('id'), 0),
                    'sosial_media' => (int) $channelCounts->get((int) Channel::where('slug', 'sosial-media')->value('id'), 0),
                    'kunjungan_langsung' => (int) $channelCounts->get((int) Channel::where('slug', 'kunjungan-langsung')->value('id'), 0),
                    'website' => (int) $channelCounts->get((int) Channel::where('slug', 'website')->value('id'), 0),
                    'wbs' => (int) $channelCounts->get((int) Channel::where('slug', 'wbs')->value('id'), 0),
                    'email' => (int) $channelCounts->get((int) Channel::where('slug', 'email')->value('id'), 0),
                    'channels' => $channels,
                ];
            },
        );
    }
}
