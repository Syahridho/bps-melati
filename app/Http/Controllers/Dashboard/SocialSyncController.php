<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Jobs\SyncSocialToInputData;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SocialSyncController extends Controller
{
    public function sync(Request $request, string $platform): RedirectResponse|JsonResponse
    {
        if (! in_array($platform, ['youtube', 'facebook', 'instagram'], true)) {
            abort(404);
        }

        SyncSocialToInputData::dispatch($platform);

        if ($request->wantsJson()) {
            return response()->json(['status' => 'queued', 'platform' => $platform]);
        }

        return back()->with('flash', ['success' => "Sinkronisasi {$platform} dijadwalkan."]);
    }

    public function status(): JsonResponse
    {
        $status = [];
        foreach (['youtube', 'facebook', 'instagram'] as $platform) {
            $status[$platform] = Setting::get("social_import_{$platform}_last_synced_at");
        }

        return response()->json($status);
    }
}
