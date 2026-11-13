<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Support\InboxCounter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification as Notification;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    /**
     * GET /notifications
     * Daftar notifikasi user login dengan cursor pagination.
     *
     * Query params:
     *  - filter: 'unread' | 'all' (default 'all')
     *  - type: 'laporan_masuk' | 'laporan_selesai' | 'laporan_dibalas' | 'input_data' (optional)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Notification::where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $filter = $request->query('filter', 'all');
        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif (! in_array($filter, ['all', 'unread'], true)) {
            throw ValidationException::withMessages([
                'filter' => 'Nilai filter tidak valid. Gunakan "all" atau "unread".',
            ]);
        }

        $type = $request->query('type');
        if ($type !== null && ! in_array($type, ['laporan_masuk', 'laporan_selesai', 'laporan_dibalas', 'input_data'], true)) {
            throw ValidationException::withMessages([
                'type' => 'Tipe notifikasi tidak valid.',
            ]);
        }

        if ($type !== null) {
            $query->where('type', $type);
        }

        $perPage = (int) $request->query('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 20, 50, 100], true) ? $perPage : 15;

        $notifications = $query->cursorPaginate($perPage);

        return response()->json([
            'success' => true,
            'data' => NotificationResource::collection($notifications)->resolve($request),
            'next_cursor' => $notifications->nextCursor(),
            'unread_count' => InboxCounter::getUnreadCount($user),
        ]);
    }

    /**
     * GET /notifications/unread-count
     * Jumlah notifikasi belum dibaca untuk user login.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'unread_count' => InboxCounter::getUnreadCount($user),
        ]);
    }

    /**
     * PATCH /notifications/{id}/read
     * Tandai satu notifikasi sebagai dibaca (hanya milik user login).
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = Notification::where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->where('id', $id)
            ->first();

        if (! $notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notifikasi tidak ditemukan.',
            ], 404);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sebagai dibaca.',
            'data' => new NotificationResource($notification->fresh()),
        ]);
    }

    /**
     * PATCH /notifications/{id}/unread
     * Tandai satu notifikasi sebagai belum dibaca (hanya milik user login).
     */
    public function markAsUnread(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = Notification::where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->where('id', $id)
            ->first();

        if (! $notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notifikasi tidak ditemukan.',
            ], 404);
        }

        $notification->update(['read_at' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sebagai belum dibaca.',
            'data' => new NotificationResource($notification->fresh()),
        ]);
    }

    /**
     * PATCH /notifications/read-all
     * Tandai semua notifikasi user login sebagai dibaca.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        Notification::where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Semua notifikasi ditandai sebagai dibaca.',
            'unread_count' => 0,
        ]);
    }
}
