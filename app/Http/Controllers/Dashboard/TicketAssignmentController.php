<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTicketAssignmentRequest;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class TicketAssignmentController extends Controller
{
    /**
     * Operator mengambil tiket mode claim. UPDATE atomik memastikan hanya
     * satu operator yang berhasil saat dua permintaan datang bersamaan.
     */
    public function claim(Request $request, Ticket $ticket, TicketAssignmentService $assignmentService): JsonResponse|RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        // Sudah ada PIC pada tiket claim: ini konflik klaim, bukan masalah izin.
        if ($ticket->assignment_mode === 'claim' && $ticket->assigned_to !== null) {
            $message = 'Tiket sudah diambil oleh operator lain.';

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'code' => 'already_claimed',
                ], Response::HTTP_CONFLICT);
            }

            return back()->withErrors(['assignment' => $message])->with('flash', [
                'error' => $message,
            ]);
        }

        Gate::authorize('claim', $ticket);

        if (! $assignmentService->claim($ticket, $actor)) {
            $message = 'Tiket sudah diambil oleh operator lain.';

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'code' => 'already_claimed',
                ], Response::HTTP_CONFLICT);
            }

            return back()->withErrors(['assignment' => $message])->with('flash', [
                'error' => $message,
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tiket berhasil diambil. Anda sekarang menjadi PIC.',
                'data' => [
                    'ticket_id' => $ticket->id,
                    'assigned_to' => $actor->id,
                    'assigned_to_name' => $actor->name,
                ],
            ]);
        }

        return back()->with('flash', [
            'success' => 'Tiket berhasil diambil. Anda sekarang menjadi PIC.',
        ]);
    }

    /**
     * Admin menetapkan/mengganti PIC lewat dropdown "Ubah PIC".
     */
    public function update(UpdateTicketAssignmentRequest $request, Ticket $ticket, TicketAssignmentService $assignmentService): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        Gate::authorize('reassign', $ticket);

        $target = $request->validated('assigned_to') !== null
            ? User::query()->assignable()->findOrFail((int) $request->validated('assigned_to'))
            : null;

        $assignmentService->reassign($ticket, $target, $actor, $request->validated('note'));

        return back()->with('flash', [
            'success' => $target !== null
                ? "PIC tiket diubah ke {$target->name}."
                : 'PIC tiket berhasil dilepas.',
        ]);
    }

    /**
     * Admin melepas PIC (tiket kembali tanpa penanggung jawab).
     */
    public function destroy(Request $request, Ticket $ticket, TicketAssignmentService $assignmentService): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        Gate::authorize('reassign', $ticket);

        $assignmentService->reassign($ticket, null, $actor, 'PIC dilepas oleh admin.');

        return back()->with('flash', [
            'success' => 'PIC tiket berhasil dilepas.',
        ]);
    }
}
