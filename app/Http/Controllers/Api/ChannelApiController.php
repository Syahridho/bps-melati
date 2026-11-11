<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use Illuminate\Http\JsonResponse;

class ChannelApiController extends Controller
{
    public function index(): JsonResponse
    {
        $roots = Channel::with(['children' => fn ($q) => $q->active()->orderBy('sort_order')])
            ->root()
            ->active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Channel $root) => [
                'id' => $root->id,
                'name' => $root->name,
                'slug' => $root->slug,
                'color' => $root->color,
                'effective_color' => $root->effective_color,
                'parent_id' => $root->parent_id,
                'sort_order' => $root->sort_order,
                'children' => $root->children->map(fn (Channel $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'color' => $c->color,
                    'effective_color' => $c->effective_color,
                    'parent_id' => $c->parent_id,
                    'sort_order' => $c->sort_order,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => $roots,
        ]);
    }
}
