<?php

namespace App\Actions;

use App\EmailStatus;
use App\Events\TicketResponseCreated;
use App\Events\TicketUpdated;
use App\Exceptions\TicketAlreadyCompletedException;
use App\Exceptions\TicketAlreadyRespondedException;
use App\Jobs\SendTicketResponseNotification;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Support\SafeBroadcast;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sumber kebenaran untuk menyimpan balasan petugas terhadap sebuah tiket.
 *
 * Urutan guarantee:
 *  1. Lock Redis per tiket  -> request kembar tidak sama-sama menunggu row lock.
 *  2. Transaksi DB + lockForUpdate pada baris tiket -> pemeriksaan & tulis bersifat atomik.
 *  3. Idempotency key (unique index) -> retry / double submit tidak menyimpan dobel.
 *  4. Respon awal "hanya sekali" dijamin unique index generated column, diperiksa
 *     ulang di dalam lock agar pesannya informatif (409) alih-alih 500.
 *  5. Broadcast & notifikasi dijalankan setelah commit.
 */
class ReplyToTicket
{
    /**
     * Ranking status agar tidak menurunkan status yang sudah lebih tinggi.
     *
     * @var array<string, int>
     */
    private const STATUS_RANK = [
        'baru' => 0,
        'respon_awal' => 1,
        'respon_substantif' => 2,
        'selesai' => 3,
    ];

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<UploadedFile>  $attachments
     */
    public function handle(Ticket $ticket, User $actor, array $payload, array $attachments = []): ReplyResult
    {
        $type = (string) $payload['type'];
        $message = (string) $payload['message'];
        $idempotencyKey = $this->normalizeKey($payload['idempotency_key'] ?? null);
        $expectedVersion = isset($payload['expected_version']) && $payload['expected_version'] !== ''
            ? (int) $payload['expected_version']
            : null;

        // Layer 1: lock Redis agar request kembar tidak berlomba masuk ke row lock.
        return Cache::lock("ticket:{$ticket->id}:reply", 10)->block(5, function () use ($ticket, $actor, $type, $message, $idempotencyKey, $expectedVersion, $attachments): ReplyResult {
            // Replay idempoten: key yang sama sudah pernah berhasil disimpan.
            $replayed = $this->findByKey($ticket->id, $idempotencyKey);

            if ($replayed !== null) {
                Log::info('Replay idempotency balasan tiket, tidak menyimpan ulang.', [
                    'ticket_id' => $ticket->id,
                    'response_id' => $replayed->id,
                ]);

                return new ReplyResult($replayed, true);
            }

            try {
                return DB::transaction(function () use ($ticket, $actor, $type, $message, $idempotencyKey, $expectedVersion, $attachments): ReplyResult {
                    // Kunci baris tiket: semua penulis lain untuk tiket ini ikut antre.
                    $locked = Ticket::whereKey($ticket->id)->lockForUpdate()->firstOrFail();

                    // Pemeriksaan ulang idempotency di dalam lock (memperkecil jendela race).
                    $replayed = $this->findByKey($locked->id, $idempotencyKey);

                    if ($replayed !== null) {
                        return new ReplyResult($replayed, true);
                    }

                    if ($locked->status === 'selesai') {
                        throw new TicketAlreadyCompletedException;
                    }

                    // "Respon awal hanya sekali" — dicek di dalam lock agar pesan 409-nya informatif.
                    if ($type === 'respon_awal') {
                        $this->guardResponAwal($locked, $actor);
                    }

                    $initialEmailStatus = blank($locked->reporter_email) ? EmailStatus::Skipped : EmailStatus::Pending;

                    $response = TicketResponse::create([
                        'ticket_id' => $locked->id,
                        'user_id' => $actor->id,
                        'type' => $type,
                        'message' => $message,
                        'idempotency_key' => $idempotencyKey,
                        'sent_at' => now(),
                        'email_status' => $initialEmailStatus,
                    ]);

                    foreach ($attachments as $file) {
                        $path = $file->store("response_attachments/{$response->id}", 'public');

                        $response->attachments()->create([
                            'path' => $path,
                            'original_name' => $file->getClientOriginalName(),
                            'mime_type' => $file->getClientMimeType(),
                            'size' => $file->getSize(),
                        ]);
                    }

                    // Status hanya boleh maju. expected_version dicatat untuk observabilitas
                    // namun tidak memblokir: balasan berurutan antar petugas itu normal.
                    $updates = [];
                    $newRank = self::STATUS_RANK[$type] ?? 0;
                    $currentRank = self::STATUS_RANK[$locked->status] ?? 0;

                    if ($newRank > $currentRank) {
                        $updates['status'] = $type;
                    }

                    if ($expectedVersion !== null && $expectedVersion !== $locked->version) {
                        Log::info('Balasan diterima dengan versi tiket yang sudah usang.', [
                            'ticket_id' => $locked->id,
                            'expected_version' => $expectedVersion,
                            'actual_version' => $locked->version,
                        ]);
                    }

                    $updates['version'] = $locked->version + 1;
                    $locked->update($updates);

                    return new ReplyResult($response->load(['user', 'attachments']), false);
                }, 3);
            } catch (Throwable $e) {
                // Race pada unique index (idempotency_key / respon_awal) = ada request kembar.
                if ($this->isUniqueViolation($e)) {
                    return $this->replayOrRethrow($ticket, $idempotencyKey, $type, $e);
                }

                throw $e;
            }
        });
    }

    /**
     * Efek samping yang harus berjalan setelah transaksi benar-benar commit.
     */
    public function afterCommit(Ticket $ticket, TicketResponse $response, User $actor): void
    {
        $ticket = $ticket->fresh() ?? $ticket;
        $response->loadMissing(['user', 'attachments']);

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");
        Cache::forget('dashboard:admin:stats');
        Cache::forget('dashboard:operator:stats');

        Cache::put("response:{$response->id}", [
            'id' => $response->id,
            'ticket_id' => $ticket->id,
            'type' => $response->type,
            'message' => $response->message,
            'user' => $actor->name,
            'sent_at' => $response->sent_at?->toIso8601String(),
        ], now()->addHours(24));

        // Notifikasi ke pelapor: antrean terpisah, idempoten, tidak membatalkan balasan.
        SendTicketResponseNotification::dispatch($response)->afterCommit();

        // Broadcast ke kanal publik ticket (halaman /check pelapor) dan kanal staff.
        // Balasan sudah tersimpan dan tidak boleh gagal gara-gara broadcaster.
        $context = ['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number, 'response_id' => $response->id];

        SafeBroadcast::send('TicketUpdated', fn () => TicketUpdated::dispatch($ticket, $response), $context);
        SafeBroadcast::send('TicketResponseCreated', fn () => TicketResponseCreated::dispatch($ticket, $response, $actor), $context);
        SafeBroadcast::send('InboxUpdated', fn () => InboxUpdated::dispatch($ticket, $actor->name, $actor), $context);
    }

    private function findByKey(int $ticketId, ?string $idempotencyKey): ?TicketResponse
    {
        if ($idempotencyKey === null) {
            return null;
        }

        return TicketResponse::with('user')
            ->where('ticket_id', $ticketId)
            ->withIdempotencyKey($idempotencyKey)
            ->first();
    }

    /**
     * Tolak bila Respon Awal untuk tiket ini sudah pernah tercatat.
     */
    private function guardResponAwal(Ticket $locked, ?User $actor = null): void
    {
        $firstResponse = TicketResponse::with('user')
            ->where('ticket_id', $locked->id)
            ->where('type', 'respon_awal')
            ->first();

        if ($firstResponse === null) {
            return;
        }

        Log::warning('Konflik balasan: Respon Awal sudah ada.', [
            'ticket_id' => $locked->id,
            'existing_response_id' => $firstResponse->id,
            'actor_id' => $actor?->id,
        ]);

        throw TicketAlreadyRespondedException::for(
            $firstResponse,
            $firstResponse->user?->name,
            ($firstResponse->sent_at ?? $firstResponse->created_at)?->toIso8601String(),
        );
    }

    private function normalizeKey(mixed $key): ?string
    {
        if (! is_string($key)) {
            return null;
        }

        $key = trim($key);

        return Str::isUuid($key) ? Str::lower($key) : null;
    }

    private function isUniqueViolation(Throwable $e): bool
    {
        return Str::contains($e->getMessage(), [
            'Duplicate entry',
            'duplicate key value',
            '1062',
        ]);
    }

    /**
     * Request kembar yang kalah race: kembalikan respons yang sudah tersimpan,
     * atau lempar 409 bila yang bentrok adalah Respon Awal.
     */
    private function replayOrRethrow(Ticket $ticket, ?string $idempotencyKey, string $type, Throwable $original): ReplyResult
    {
        $replayed = $this->findByKey($ticket->id, $idempotencyKey);

        if ($replayed !== null) {
            Log::info('Replay idempotency balasan tiket via unique index.', [
                'ticket_id' => $ticket->id,
                'response_id' => $replayed->id,
            ]);

            return new ReplyResult($replayed, true);
        }

        if ($type === 'respon_awal') {
            $this->guardResponAwal($ticket);
        }

        throw $original;
    }
}
