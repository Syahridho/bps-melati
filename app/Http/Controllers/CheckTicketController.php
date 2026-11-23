<?php

namespace App\Http\Controllers;

use App\Actions\AutoCloseTickets;
use App\Actions\RecordReporterCompletionAudit;
use App\Actions\ReplyFromReporter;
use App\Enums\UserRole;
use App\Events\InboxUpdated;
use App\Events\TicketClosedByReporter;
use App\Events\TicketUpdated;
use App\Models\Ticket;
use App\Models\User;
use App\Support\AppSettings;
use App\Support\ProfanityFilter;
use App\Support\SafeBroadcast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CheckTicketController extends Controller
{
    /**
     * Tampilkan halaman publik untuk cek tiket.
     */
    public function __invoke(Request $request): Response
    {
        $ticketNumber = trim((string) $request->query('ticket_number', ''));
        $ticket = null;
        $searched = false;

        if ($ticketNumber !== '') {
            $searched = true;

            $cacheKey = 'ticket_check:'.md5($ticketNumber);
            $filter = app(ProfanityFilter::class);

            $ticket = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($ticketNumber, $filter) {
                $t = Ticket::with(['channel', 'attachments', 'responses.user', 'responses.attachments'])
                    ->where('ticket_number', $ticketNumber)
                    ->first();

                if (! $t) {
                    return null;
                }

                if (blank($t->access_code)) {
                    $t->forceFill(['access_code' => Str::random(32)])->saveQuietly();
                }

                $t->checkAndAutoClose();

                return [
                    'id' => $t->id,
                    'ticket_number' => $t->ticket_number,
                    'access_code' => $t->access_code,
                    'classification' => $t->classification,
                    'title' => $filter->censor($t->title),
                    'service_type' => $t->service_type,
                    'satuan_tugas' => $t->satuan_tugas,
                    'reporter_name' => $t->reporter_name,
                    'content' => $filter->censor($t->content),
                    'status' => $t->status,
                    'channel' => $t->channel?->name ?? '-',
                    'created_at' => $t->created_at->toIso8601String(),
                    'completed_at' => $t->completed_at?->toIso8601String(),
                    'closed_reason' => $t->closed_reason,
                    'rating' => $t->rating,
                    'rating_comment' => $filter->censor($t->rating_comment ?? ''),
                    'rated_at' => $t->rated_at?->toIso8601String(),
                    'auto_close_at' => AutoCloseTickets::deadlineFor($t)?->toIso8601String(),
                    'attachments' => $t->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                    ])->values()->all(),
                    'responses' => $t->responses
                        ->filter(fn ($response) => ! (bool) $response->is_system)
                        ->sortBy(fn ($response) => ($response->sent_at ?? $response->created_at)->getTimestamp())
                        ->values()
                        ->map(function ($response) use ($t, $filter) {
                            $isSystem = (bool) $response->is_system;
                            $isReporter = $isSystem || $response->user_id === null || $response->type === 'balasan_pelapor';
                            $userName = $isReporter
                                ? ($t->reporter_name ? $t->reporter_name.' (Pelapor)' : 'Pelapor')
                                : ($response->user?->name ?? 'Petugas BPS');

                            return [
                                'id' => $response->id,
                                'type' => $response->type,
                                'message' => $filter->censor($response->message),
                                'user_name' => $isSystem ? 'Sistem' : $userName,
                                'is_reporter' => $isReporter,
                                'is_system' => $isSystem,
                                'sent_at' => $response->sent_at?->toIso8601String(),
                                'created_at' => $response->created_at->toIso8601String(),
                                'attachments' => $response->attachments->map(fn ($att) => [
                                    'id' => $att->id,
                                    'original_name' => $att->original_name,
                                    'mime_type' => $att->mime_type,
                                    'size' => $att->size,
                                ])->values()->all(),
                            ];
                        })->values()->all(),
                ];
            });

            if ($ticket) {
                $ticketId = $ticket['id'];

                $ticket['attachments'] = array_map(function ($attachment) use ($ticketId, $ticket) {
                    $attachment['url'] = URL::temporarySignedRoute(
                        'check.attachments.download',
                        now()->addMinutes(30),
                        ['type' => 'ticket', 'id' => $attachment['id'], 'ticket' => $ticketId, 'access_code' => $ticket['access_code']]
                    );

                    return $attachment;
                }, $ticket['attachments']);

                $ticket['responses'] = array_map(function ($response) use ($ticketId, $ticket) {
                    $response['attachments'] = array_map(function ($att) use ($ticketId, $ticket) {
                        $att['url'] = URL::temporarySignedRoute(
                            'check.attachments.download',
                            now()->addMinutes(30),
                            ['type' => 'response', 'id' => $att['id'], 'ticket' => $ticketId, 'access_code' => $ticket['access_code']]
                        );

                        return $att;
                    }, $response['attachments']);

                    return $response;
                }, $ticket['responses']);
            }
        }

        return Inertia::render('check/index', [
            'ticketNumber' => $ticketNumber,
            'ticket' => $ticket,
            'searched' => $searched,
            'ratingEnabled' => AppSettings::ratingEnabled(),
            'rating_enabled' => AppSettings::ratingEnabled(),
            'accessCodeRequired' => Ticket::accessCodeRequired(),
        ]);
    }

    /**
     * Pelapor membalas tanggapan dari petugas BPS.
     */
    public function reply(Request $request, string $ticketNumber, ReplyFromReporter $replyFromReporter): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        if ($ticket->status === 'selesai') {
            return redirect()->back()->withErrors([
                'message' => 'Tiket telah selesai dan tidak dapat dibalas.',
            ]);
        }

        $validated = $request->validate([
            'access_code' => [Ticket::accessCodeRequired() ? 'required' : 'nullable', 'string'], 
            'message' => ['required', 'string', 'min:5'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        if (blank($ticket->access_code)) {
            $ticket->forceFill(['access_code' => Str::random(32)])->saveQuietly();
        }

        if (! $ticket->accessCodeMatches($validated['access_code'] ?? null)) {
            return redirect()->back()->withErrors([
                'access_code' => 'Kode akses tiket tidak valid.',
                'message' => 'Kode akses tiket tidak valid.',
            ])->withInput();
        }

        // Penyimpanan, invalidasi cache, dan broadcast ditangani satu action agar
        // jalur web dan API mobile tidak lagi berperilaku berbeda.
        $replyFromReporter->handle($ticket, $validated['message'], (array) $request->file('attachments', []));

        return redirect()->back()->with('flash', [
            'success' => 'Balasan Anda berhasil terkirim!',
        ]);
    }

    /**
     * Pelapor menandai laporan sebagai selesai.
     */
    public function complete(Request $request, string $ticketNumber): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        $validated = $request->validate([
            'access_code' => [Ticket::accessCodeRequired() ? 'required' : 'nullable', 'string'], 
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:'.$this->ratingCommentMax()],
        ]);

        if (blank($ticket->access_code)) {
            $ticket->forceFill(['access_code' => Str::random(32)])->saveQuietly();
        }

        if (! $ticket->accessCodeMatches($validated['access_code'] ?? null)) {
            return redirect()->back()->withErrors([
                'access_code' => 'Kode akses tiket tidak valid.',
                'message' => 'Kode akses tiket tidak valid.',
            ])->withInput();
        }

        $rating = array_key_exists('rating', $validated) && $validated['rating'] !== null && $validated['rating'] !== ''
            ? (int) $validated['rating']
            : null;

        $comment = isset($validated['comment']) ? trim((string) $validated['comment']) : null;
        if ($comment === '') {
            $comment = null;
        }

        if (! AppSettings::ratingEnabled()) {
            $rating = null;
            $comment = null;
        }

        $didComplete = false;
        $completedAt = now();

        if ($ticket->status !== 'selesai') {
            $didComplete = DB::transaction(function () use ($ticket, $rating, $comment, &$completedAt): bool {
                $locked = Ticket::query()->lockForUpdate()->find($ticket->id);

                if ($locked === null || $locked->status === 'selesai') {
                    return false;
                }

                $locked->update([
                    'status' => 'selesai',
                    'completed_at' => $completedAt,
                    'closed_reason' => 'reporter',
                    'rating' => $rating,
                    'rating_comment' => $comment,
                    'rated_at' => ($rating !== null || $comment !== null) ? $completedAt : null,
                ]);

                return true;
            }, 3);

            if ($didComplete) {
                $ticket->refresh();
                $completedAt = $ticket->completed_at ?? $completedAt;

                $context = ['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number];

                SafeBroadcast::send('InboxUpdated', fn () => InboxUpdated::dispatch($ticket, 'Pelapor'), $context);
                SafeBroadcast::send('TicketUpdated', fn () => TicketUpdated::dispatch($ticket), $context);

                $operatorUserIds = [];
                foreach ([$ticket->created_by, $ticket->assigned_to] as $candidateUserId) {
                    if (! $candidateUserId) {
                        continue;
                    }
                    $candidate = User::find($candidateUserId);
                    if ($candidate && ($candidate->isOperator() || $candidate->isOperatorTim())) {
                        $operatorUserIds[] = (int) $candidateUserId;
                    }
                }
                $operatorUserIds = array_values(array_unique($operatorUserIds));

                SafeBroadcast::send('TicketClosedByReporter', fn () => TicketClosedByReporter::dispatch(
                    ticketId: (int) $ticket->id,
                    ticketNumber: (string) $ticket->ticket_number,
                    status: (string) $ticket->status,
                    rating: $ticket->rating,
                    ratingComment: $ticket->rating_comment,
                    ratedAt: $ticket->rated_at?->toIso8601String(),
                    closedAt: $ticket->completed_at?->toIso8601String(),
                    operatorUserIds: $operatorUserIds,
                ), $context);

                $recipients = User::query()
                    ->where('is_active', true)
                    ->whereIn('role', [UserRole::Admin, UserRole::Operator, UserRole::OperatorTim])
                    ->pluck('id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();

                $notificationMessage = 'Laporan telah ditandai selesai oleh pelapor.';
                if ($ticket->rating !== null) {
                    $notificationMessage .= ' Rating: '.$ticket->rating.'/5.';
                }

                foreach ($recipients as $recipientId) {
                    DB::table('notifications')->insert([
                        'id' => Str::uuid()->toString(),
                        'type' => 'laporan_selesai',
                        'notifiable_type' => User::class,
                        'notifiable_id' => $recipientId,
                        'data' => json_encode([
                            'id' => $ticket->id,
                            'ticket_number' => $ticket->ticket_number,
                            'type' => $ticket->classification,
                            'title' => 'Laporan selesai',
                            'message' => $notificationMessage,
                            'url' => '/dashboard/admin/completed-reports/'.$ticket->ticket_number,
                            'actor_name' => null,
                            'rating' => $ticket->rating,
                        ]),
                        'read_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                app(RecordReporterCompletionAudit::class)->handle($ticket, $request, $ticket->rating !== null);
            }
        }

        return redirect()->back()->with('flash', [
            'success' => 'Laporan telah ditandai selesai. Terima kasih!',
        ]);
    }

    private function ratingCommentMax(): int
    {
        $candidates = [
            config('ticket.rating_comment_max'),
            config('ticket.rating_comment_max_length'),
            config('ticket.rating.comment_max'),
            config('ticket.rating.comment_max_length'),
            config('ticket.rating.max_comment_length'),
            config('rating.comment_max'),
            config('rating.comment_max_length'),
            config('rating.max_comment_length'),
            config('rating.rating_comment_max'),
            config('tickets.rating_comment_max'),
            config('tickets.rating_comment_max_length'),
            config('tickets.rating.comment_max'),
            config('feedback.rating_comment_max'),
            config('feedback.comment_max'),
            config('feedback.comment_max_length'),
            config('feedback.max_comment_length'),
        ];

        foreach ($candidates as $value) {
            if (is_numeric($value) && (int) $value > 0) {
                return (int) $value;
            }
        }

        return 1000;
    }
}
