<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePushSubscriptionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use NotificationChannels\WebPush\ContentEncoding;

class PushSubscriptionController extends Controller
{
    /**
     * POST /push-subscriptions
     * Simpan atau perbarui push subscription perangkat milik user login.
     */
    public function store(StorePushSubscriptionRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $contentEncoding = null;
        if ($request->has('keys.contentEncoding')) {
            $contentEncoding = ContentEncoding::from($request->input('keys.contentEncoding'));
        }

        $user->updatePushSubscription(
            $validated['endpoint'],
            $validated['keys']['p256dh'],
            $validated['keys']['auth'],
            $contentEncoding,
        );

        return response()->json([
            'success' => true,
            'message' => 'Subscription push disimpan.',
        ]);
    }

    /**
     * DELETE /push-subscriptions
     * Hapus subscription berdasarkan endpoint (hanya milik user login).
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        $user->deletePushSubscription($request->input('endpoint'));

        return response()->json([
            'success' => true,
            'message' => 'Subscription push dihapus.',
        ]);
    }

    /**
     * GET /push-subscriptions/status?endpoint=...
     * Cek apakah endpoint milik user login telah terdaftar di server.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        $subscription = $user->pushSubscriptions()
            ->where('endpoint', $request->input('endpoint'))
            ->first();

        return response()->json([
            'success' => true,
            'subscribed' => $subscription !== null,
        ]);
    }
}
