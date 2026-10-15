<?php

namespace App\Http\Controllers\Admin;

use App\Actions\ReplyToTicket;
use App\Exceptions\TicketAlreadyCompletedException;
use App\Exceptions\TicketAlreadyRespondedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\StoreTicketResponseRequest;
use App\Jobs\SendTicketResponseNotification;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class TicketResponseController extends Controller
{
    /**
     * Simpan respon (respon awal / respon substantif) untuk tiket.
     *
     * Seluruh logika tabrakan & idempotensi berada di App\Actions\ReplyToTicket.
     * Controller hanya menerjemahkan exception domain menjadi respons HTTP/Inertia.
     */
    public function store(StoreTicketResponseRequest $request, Ticket $ticket, ReplyToTicket $replyToTicket): RedirectResponse|JsonResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User, 403);

        try {
            $result = $replyToTicket->handle(
                $ticket,
                $actor,
                [
                    'type' => $request->validated('response_type'),
                    'message' => $request->validated('response_message'),
                    'idempotency_key' => $request->validated('idempotency_key'),
                    'expected_version' => $request->validated('expected_version'),
                ],
                $request->file('response_attachments', []),
            );

            $response = $result->response;
        } catch (TicketAlreadyRespondedException $e) {
            Log::warning('Balasan ditolak (409): Respon Awal sudah ada.', [
                'ticket_id' => $ticket->id,
                'actor_id' => $actor->id,
                'existing_response_id' => $e->existingResponse->id,
            ]);

            $message = $this->conflictMessage($e);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'data' => [
                        'code' => 'already_responded',
                        'responded_by' => $e->respondedBy,
                        'responded_at' => $e->respondedAt,
                    ],
                ], Response::HTTP_CONFLICT);
            }

            // Draft di frontend tidak dihapus: useForm mempertahankan isinya saat
            // onError, jadi pengguna bisa langsung kirim ulang sebagai Respon Substantif.
            return back()->withErrors(['response_message' => $message])->with('flash', [
                'conflict' => [
                    'code' => 'already_responded',
                    'message' => $message,
                    'responded_by' => $e->respondedBy,
                    'responded_at' => $e->respondedAt,
                ],
            ]);
        } catch (TicketAlreadyCompletedException $e) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'data' => ['code' => 'already_completed'],
                ], Response::HTTP_CONFLICT);
            }

            return back()->withErrors(['response_message' => $e->getMessage()]);
        } catch (Throwable $e) {
            Log::error('Gagal menyimpan tanggapan tiket: '.$e->getMessage(), [
                'ticket_id' => $ticket->id,
                'actor_id' => $actor->id,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan tanggapan. Silakan coba lagi.',
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }

            return back()->withErrors([
                'response_message' => 'Gagal menyimpan tanggapan. Silakan coba lagi.',
            ]);
        }

        // Permintaan kembar: balasan sudah tersimpan, jangan ulangi broadcast/notifikasi.
        if (! $result->replayed) {
            $replyToTicket->afterCommit($ticket, $response, $actor);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $result->replayed ? 'Respon sudah terkirim sebelumnya.' : 'Respon berhasil dikirim!',
                'data' => [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->fresh()?->ticket_number,
                    'status' => $ticket->fresh()?->status,
                    'version' => $ticket->fresh()?->version,
                    'response_id' => $response->id,
                    'replayed' => $result->replayed,
                ],
            ], Response::HTTP_CREATED);
        }

        return back()->with('flash', [
            'success' => $result->replayed
                ? 'Respon ini sudah pernah terkirim sebelumnya.'
                : 'Respon berhasil dikirim!',
        ]);
    }

    private function conflictMessage(TicketAlreadyRespondedException $e): string
    {
        $message = 'Tiket ini sudah mendapat Respon Awal';

        if ($e->respondedBy !== null) {
            $message .= ' dari '.$e->respondedBy;
        }

        if ($e->respondedAt !== null) {
            $message .= ' pada '.now()->parse($e->respondedAt)->locale('id')->translatedFormat('d F Y H:i');
        }

        return $message.'. Silakan kirim sebagai Respon Substantif.';
    }

    /**
     * Perbarui email pelapor dan kirim ulang notifikasi untuk respon yang gagal/bounce.
     * Hanya admin yang boleh mengakses (authorize di sini, bukan di FormRequest).
     */
    public function resend(Ticket $ticket, TicketResponse $response): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user instanceof User && $user->isAdmin(), 403);
        abort_unless($response->ticket_id === $ticket->id, 404);

        $statusValue = $response->email_status instanceof \App\EmailStatus
            ? $response->email_status->value
            : $response->email_status;

        if (! in_array($statusValue, ['failed', 'bounced'], true)) {
            return back()->withErrors(['reporter_email' => 'Respon ini tidak berada dalam status gagal atau bounce.']);
        }

        $validated = request()->validate([
            'reporter_email' => ['required', ...StoreTicketRequest::emailRules(), 'max:255'],
        ], [
            'reporter_email.required' => 'Email pelapor wajib diisi.',
            'reporter_email.email' => 'Alamat email tampaknya tidak valid. Periksa kembali penulisannya.',
            'reporter_email.max' => 'Email maksimal 255 karakter.',
        ]);

        $newEmail = strtolower(trim($validated['reporter_email']));

        // Perbarui email pelapor di tiket
        $ticket->update(['reporter_email' => $newEmail]);

        // Reset flag idempotensi agar job mengirim ulang
        $response->forceFill([
            'email_sent_at' => null,
            'email_status' => 'pending',
            'email_failed_at' => null,
            'email_error' => null,
            'email_bounced_at' => null,
        ])->save();

        // Dispatch ulang job
        SendTicketResponseNotification::dispatch($response)->afterCommit();

        return back()->with('flash', [
            'success' => 'Email pelapor diperbarui dan notifikasi sedang dikirim ulang.',
        ]);
    }
}
