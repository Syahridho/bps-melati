<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreChannelRequest;
use App\Http\Requests\Settings\UpdateChannelRequest;
use App\Models\Channel;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ChannelController extends Controller
{
    public function index(): Response
    {
        $roots = Channel::with(['children' => fn ($q) => $q->orderBy('sort_order')])
            ->root()
            ->orderBy('sort_order')
            ->withCount(['tickets', 'children' => fn ($q) => $q->withCount('tickets')])
            ->get()
            ->map(function (Channel $root) {
                $childrenCount = $root->children->sum(fn (Channel $c) => $c->tickets_count ?? 0);

                return [
                    'id' => $root->id,
                    'name' => $root->name,
                    'slug' => $root->slug,
                    'color' => $root->color,
                    'effective_color' => $root->effective_color,
                    'parent_id' => $root->parent_id,
                    'sort_order' => $root->sort_order,
                    'is_active' => $root->is_active,
                    'tickets_count' => ($root->tickets_count ?? 0) + $childrenCount,
                    'children' => $root->children->map(fn (Channel $c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'slug' => $c->slug,
                        'color' => $c->color,
                        'effective_color' => $c->effective_color ?? $root->color,
                        'parent_id' => $c->parent_id,
                        'sort_order' => $c->sort_order,
                        'is_active' => $c->is_active,
                        'tickets_count' => $c->tickets_count ?? 0,
                    ])->all(),
                ];
            })
            ->all();

        $parents = Channel::active()->root()->orderBy('sort_order')->get(['id', 'name', 'slug'])
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug])
            ->all();

        return Inertia::render('settings/sumber-kanal/index', [
            'channels' => $roots,
            'parents' => $parents,
        ]);
    }

    public function store(StoreChannelRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $channel = Channel::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'parent_id' => $validated['parent_id'] ?? null,
            'color' => ! empty($validated['color']) ? strtolower($validated['color']) : null,
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('flash', [
            'success' => "Kanal {$channel->name} berhasil ditambahkan!",
        ]);
    }

    public function update(UpdateChannelRequest $request, Channel $channel): RedirectResponse
    {
        $validated = $request->validated();

        // Guard: kanal Website tidak dapat dinonaktifkan (default laporan).
        if ($channel->slug === 'website' && $request->has('is_active') && ! $request->boolean('is_active')) {
            return redirect()->back()->withErrors([
                'is_active' => 'Kanal Website tidak dapat dinonaktifkan karena menjadi default laporan.',
            ]);
        }

        $channel->update([
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
            'color' => ! empty($validated['color']) ? strtolower($validated['color']) : null,
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $channel->is_active,
        ]);

        return redirect()->back()->with('flash', [
            'success' => "Kanal {$channel->name} berhasil diperbarui!",
        ]);
    }

    public function destroy(Channel $channel): RedirectResponse
    {
        if ($channel->slug === 'website') {
            return redirect()->back()->withErrors([
                'error' => 'Kanal Website tidak dapat dihapus karena menjadi default laporan.',
            ]);
        }

        if ($channel->children()->exists()) {
            return redirect()->back()->withErrors([
                'error' => "Kanal {$channel->name} memiliki sub-kanal. Hapus atau pindahkan sub-kanal terlebih dahulu, atau nonaktifkan kanal ini.",
            ]);
        }

        $usedCount = $channel->tickets()->count();
        if ($usedCount > 0) {
            return redirect()->back()->withErrors([
                'error' => "Kanal {$channel->name} sudah dipakai {$usedCount} tiket. Kanal tidak dapat dihapus — nonaktifkan saja.",
            ]);
        }

        $name = $channel->name;
        $channel->delete();

        return redirect()->back()->with('flash', [
            'success' => "Kanal {$name} berhasil dihapus!",
        ]);
    }
}
