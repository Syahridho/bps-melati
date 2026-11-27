<?php

namespace App\Support;

use App\Models\Channel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Helper filter sumber kanal untuk daftar laporan.
 *
 * Nilai `channels` pada query string boleh berupa array id kanal. Hanya id
 * yang benar-benar ada di tabel channels yang dipakai, sehingga parameter
 * tidak valid tidak membuat query error.
 */
class ChannelFilter
{
    /**
     * Ambil id kanal terpilih dari request dan buang id yang tidak valid.
     *
     * @return list<int>
     */
    public static function idsFromRequest(Request $request): array
    {
        $input = $request->query('channels', []);

        if (is_string($input)) {
            $input = explode(',', $input);
        }

        if (! is_array($input)) {
            return [];
        }

        $ids = [];
        foreach ($input as $value) {
            if (! is_scalar($value)) {
                continue;
            }

            $id = (int) $value;
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }

        if ($ids === []) {
            return [];
        }

        $validIds = Channel::query()
            ->whereIn('id', array_values($ids))
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return array_values(array_intersect(array_values($ids), $validIds));
    }

    /**
     * Kembangkan kanal induk menjadi seluruh sub-kanalnya tanpa duplikasi.
     *
     * @param  array<int, int|string>  $ids
     * @return list<int>
     */
    public static function expand(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(
            array_map(fn ($id): int => (int) $id, $ids),
            fn (int $id): bool => $id > 0,
        )));

        if ($ids === []) {
            return [];
        }

        $childIds = Channel::query()
            ->whereIn('parent_id', $ids)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return array_values(array_unique([...$ids, ...$childIds]));
    }

    /**
     * Pohon kanal aktif (induk + sub-kanal) untuk filter di frontend.
     *
     * @return list<array{id: int, name: string, slug: string, color: string|null, children: list<array{id: int, name: string, slug: string, color: string|null}>}>
     */
    public static function tree(): array
    {
        return Cache::remember('channels:filter-tree', now()->addHours(24), function (): array {
            return Channel::with(['children' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')])
                ->whereNull('parent_id')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Channel $parent): array => [
                    'id' => $parent->id,
                    'name' => $parent->name,
                    'slug' => $parent->slug,
                    'color' => $parent->color,
                    'children' => $parent->children
                        ->map(fn (Channel $child): array => [
                            'id' => $child->id,
                            'name' => $child->name,
                            'slug' => $child->slug,
                            'color' => $child->color ?? $parent->color,
                        ])
                        ->values()
                        ->all(),
                ])
                ->all();
        });
    }

    /**
     * Hapus cache pohon kanal saat kanal dibuat, diubah, atau dihapus.
     */
    public static function forget(): void
    {
        Cache::forget('channels:tree');
        Cache::forget('channels:filter-tree');
    }
}
