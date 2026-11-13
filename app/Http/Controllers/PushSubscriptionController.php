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
     * POST /push/subscribe
     * Simpan atau perbarui subscription. Satu endpoint hanya milik satu user,
     * jadi jika user lain login di browser yang sama, endpoint berpindah.
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
     * POST /push/unsubscribe
     * DELETE /push-subscriptions
     * Hapus subscription berdasarkan endpoint. Idempotent (selalu 204).
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        $request->user()->pushSubscriptions()
            ->where('endpoint', $request->input('endpoint'))
            ->delete();

        return response()->noContent();
    }

    /**
     * GET /push-subscriptions/status?endpoint=...
     */
    public function status(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => ['required', 'string', 'url'],
        ]);

        $exists = $request->user()->pushSubscriptions()
            ->where('endpoint', $request->input('endpoint'))
            ->exists();

        return response()->json([
            'success' => true,
            'subscribed' => $exists,
        ]);
    }
}
