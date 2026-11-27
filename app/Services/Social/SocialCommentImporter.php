<?php

namespace App\Services\Social;

use App\Events\TicketCreated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Services\AuditLogger;
use App\Services\NewReportNotificationService;
use App\Services\TicketAssignmentService;
use App\Support\SafeBroadcast;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SocialCommentImporter
{
    public function __construct(
        private readonly TicketAssignmentService $assignmentService,
        private readonly NewReportNotificationService $notifier,
    ) {}

    /**
     * @param  list<NormalizedSocialComment>  $comments
     */
    public function import(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        $createdTickets = NewReportNotificationService::withoutNotifications(function () use ($platform, $channel, $comments, $since): array {
            $createdTickets = [];

            foreach ($comments as $comment) {
                if (trim($comment->content) === '') {
                    continue;
                }

                if ($since !== null && $comment->occurredAt->lessThanOrEqualTo($since)) {
                    continue;
                }

                if ($this->isOwnAccount($platform, $comment)) {
                    continue;
                }

                // Dedupe cepat via Redis (TTL 90 hari) dengan kunci sumber "platform:external_id".
                $dedupeKey = 'social_import:dedupe:'.md5($platform.':'.$comment->externalId);
                if (! Cache::add($dedupeKey, true, now()->addDays(90))) {
                    // Kunci sudah ada di cache: anggap duplikat, tapi tetap cek DB untuk keamanan.
                    if (Ticket::query()
                        ->where('channel_id', $channel->id)
                        ->where('external_id', $comment->externalId)
                        ->exists()) {
                        continue;
                    }
                }

                if (Ticket::query()
                    ->where('channel_id', $channel->id)
                    ->where('external_id', $comment->externalId)
                    ->exists()) {
                    continue;
                }

                // Penanda komentar yang sudah dinilai (bukan laporan), berbasis version aturan.
                $skipKey = 'social_import:skipped:'.md5($platform.':'.$comment->externalId);
                $rules = app(RuleRepository::class)->rules();
                $rulesVersion = (int) ($rules['version'] ?? 1);
                $skipVersion = Cache::get($skipKey);
                if ($skipVersion !== null && (int) $skipVersion >= $rulesVersion) {
                    // Sudah dinilai dengan aturan versi ini atau lebih baru: lewati.
                    continue;
                }

                // Klasifikasi berbasis aturan sebelum menyimpan.
                $classifier = app(CommentClassifier::class);
                $result = $classifier->classify((string) $comment->content, $rules);
                if (($result['jenis'] ?? null) === null) {
                    Log::info('Komentar sosial dilewati (bukan laporan).', [
                        'platform' => $platform,
                        'external_id' => $comment->externalId,
                        'alasan' => $result['alasan'] ?? '',
                    ]);
                    Cache::put($skipKey, $rulesVersion, now()->addDays(90));

                    continue;
                }

                try {
                    $ticket = $this->createTicket($platform, $channel, $comment, (string) $result['jenis']);
                } catch (QueryException $e) {
                    // Race condition: unique index (channel_id, external_id) menang.
                    if ($this->isUniqueViolation($e)) {
                        continue;
                    }

                    throw $e;
                }

                $this->cacheTicket($ticket);
                SafeBroadcast::send('TicketCreated', fn () => TicketCreated::dispatch($ticket), [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                ]);

                AuditLogger::log(
                    eventType: 'social_import.ticket_created',
                    category: 'ticket',
                    actor: null,
                    ticket: $ticket,
                    meta: [
                        'platform' => $platform,
                        'external_id' => $comment->externalId,
                        'channel' => $channel->slug,
                    ],
                );

                $createdTickets[] = $ticket;
            }

            return $createdTickets;
        });

        $createdCount = count($createdTickets);
        $pushSent = $createdCount > 0
            ? $this->notifier->notifyBatch($this->platformLabel($platform), $createdTickets)
            : 0;

        Log::info('Ringkasan impor komentar sosial.', [
            'platform' => $platform,
            'channel' => $channel->slug,
            'fetched' => count($comments),
            'created' => $createdCount,
            'push_sent' => $pushSent,
        ]);

        return $createdCount;
    }

    private function createTicket(string $platform, Channel $channel, NormalizedSocialComment $comment, ?string $classification = null): Ticket
    {
        $period = now()->format('Y-m');
        $classification = $classification ?: (string) config('services.social_import.default_classification', 'pengaduan');
        $generated = Ticket::generateTicketNumber(
            $classification,
            $period
        );

        $platformLabel = $this->platformLabel($platform);

        return $this->assignmentService->createTicket([
            'ticket_number' => $generated['ticket_number'],
            'period' => $period,
            'sequence' => $generated['sequence'],
            'classification' => $classification,
            'title' => Str::limit(trim($comment->content), 100),
            'service_type' => null,
            'satuan_tugas' => null,
            'channel_id' => $channel->id,
            'reporter_name' => $comment->authorName ?: $comment->externalAuthorHandle,
            'reporter_email' => null,
            'reporter_wa' => null,
            'content' => $comment->content,
            'access_code' => Str::random(32),
            'status' => 'baru',
            'is_read' => false,
            'source_app' => 'social_'.$platform,
            'created_by' => null,
            'external_id' => $comment->externalId,
            'external_parent_id' => $comment->externalParentId,
            'external_permalink' => $comment->externalPermalink,
            'external_occurred_at' => $comment->occurredAt,
            'external_author_handle' => $comment->externalAuthorHandle,
        ], "Ditugaskan otomatis (Round Robin, Import {$platformLabel})");
    }

    private function platformLabel(string $platform): string
    {
        return match ($platform) {
            'youtube' => 'YouTube',
            'facebook' => 'Facebook',
            'instagram' => 'Instagram',
            default => ucfirst($platform),
        };
    }

    private function cacheTicket(Ticket $ticket): void
    {
        Cache::put("ticket:{$ticket->ticket_number}", [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'status' => $ticket->status,
            'created_at' => $ticket->created_at->toIso8601String(),
        ], now()->addHours(24));
    }

    private function isOwnAccount(string $platform, NormalizedSocialComment $comment): bool
    {
        $handle = (string) ($comment->externalAuthorHandle ?? '');

        return match ($platform) {
            'youtube' => $handle !== '' && $handle === (string) config('services.youtube.channel_id'),
            'facebook' => $handle !== '' && $handle === (string) config('services.meta.page_id'),
            'instagram' => $handle !== '' && config('services.meta.ig_username') !== null
                && $handle === (string) config('services.meta.ig_username'),
            default => false,
        };
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'UNIQUE constraint failed')
            || str_contains($message, 'Duplicate entry')
            || str_contains($message, 'duplicate key value');
    }
}
