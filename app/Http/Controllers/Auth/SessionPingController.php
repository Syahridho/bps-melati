<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint ringan untuk menjaga status "aktif" tetap akurat.
 *
 * Dipanggil frontend setiap 60 detik lewat fetch biasa (bukan navigasi Inertia),
 * dan melalui middleware EnsureSingleSession yang sama — sehingga aturan
 * satu-sesi tetap ditegakkan walau WebSocket mati.
 */
class SessionPingController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json(['ok' => false], 401);
        }

        $isOnline = $user->isSessionActive();

        return response()->json([
            'ok' => true,
            'is_online' => $isOnline,
            'last_activity_at' => $user->last_activity_at?->toIso8601String(),
        ]);
    }
}
