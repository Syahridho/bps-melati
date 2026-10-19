<?php

namespace App\Http\Controllers\Admin;

use App\Events\TicketBookmarkChanged;
use App\Events\TicketBookmarkersChanged;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Support\LaporanCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TicketBookmarkController extends Controller
{
    public function store(Request $request, string $ticketNumber): JsonResponse|RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();
        $userId = $request->user()->id;
        $origin = $request->header('X-Socket-ID') ?? '';

        $exists = $ticket->bookmarkedBy()->where('users.id', $userId)->exists();

        if (! $exists) {
            $ticket->bookmarkedBy()->attach($userId, [
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            LaporanCache::invalidate();

            $ditandaiCount = Ticket::query()
                ->where('source_app', '!=', 'admin')
                ->where('status', '!=', 'selesai')
                ->whereHas('bookmarkedBy', fn ($q) => $q->where('users.id', $userId))
                ->count();

            broadcast(new TicketBookmarkChanged($userId, $ticket->id, $ticket->ticket_number, true, $ditandaiCount, $origin));

            $others = $ticket->bookmarkedBy()->select('users.id', 'users.name')->get()
                ->reject(fn ($u) => $u->id === $userId)
                ->values()
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
                ->all();

            broadcast(new TicketBookmarkersChanged($ticket->id, $others, count($others)));
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tiket ditandai.',
                'data' => ['bookmarked' => true],
            ]);
        }

        return back()->with('success', 'Tiket ditandai.');
    }

    public function destroy(Request $request, string $ticketNumber): JsonResponse|RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();
        $userId = $request->user()->id;
        $origin = $request->header('X-Socket-ID') ?? '';

        $detached = $ticket->bookmarkedBy()->detach($userId);

        if ($detached > 0) {
            LaporanCache::invalidate();

            $ditandaiCount = Ticket::query()
                ->where('source_app', '!=', 'admin')
                ->where('status', '!=', 'selesai')
                ->whereHas('bookmarkedBy', fn ($q) => $q->where('users.id', $userId))
                ->count();

            broadcast(new TicketBookmarkChanged($userId, $ticket->id, $ticket->ticket_number, false, $ditandaiCount, $origin));

            $others = $ticket->bookmarkedBy()->select('users.id', 'users.name')->get()
                ->reject(fn ($u) => $u->id === $userId)
                ->values()
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
                ->all();

            broadcast(new TicketBookmarkersChanged($ticket->id, $others, count($others)));
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tanda dihapus.',
                'data' => ['bookmarked' => false],
            ]);
        }

        return back()->with('success', 'Tanda dihapus.');
    }
}
