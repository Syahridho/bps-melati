<?php

namespace App\Services;

use App\Events\AuditLogCreated;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Satu pintu penulisan audit log aplikasi.
 *
 * Setiap pemanggilan menulis satu baris ke `audit_logs` lalu menyiarkan
 * `AuditLogCreated` ke private channel `audit.log` (hanya admin aktif).
 *
 * Prinsip:
 *  - Audit log tidak boleh menggagalkan aksi utama: kegagalan penulisan
 *    dilaporkan lewat report() lalu ditelan.
 *  - Tidak ada password, token, atau email mentah yang masuk ke kolom/meta.
 *    Email hanya boleh dikirim dalam bentuk tersamar (lihat AuthLogger).
 */
final class AuditLogger
{
    /**
     * @param  array<string, mixed>  $meta  Konteks tambahan tanpa data sensitif.
     */
    public static function log(
        string $eventType,
        string $category,
        ?User $actor = null,
        ?Ticket $ticket = null,
        ?Request $request = null,
        array $meta = [],
        string $severity = 'info',
        bool $broadcast = true,
    ): ?AuditLog {
        $request ??= request();

        return self::write([
            'event_type' => $eventType,
            'category' => $category,
            'severity' => $severity,
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_role' => $actor?->role?->value,
            'ticket_id' => $ticket?->id,
            'ip' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'meta' => $meta === [] ? null : $meta,
        ], $broadcast, $ticket?->ticket_number);
    }

    /**
     * Tulis atribut yang sudah berbentuk skalar. Dipakai juga oleh AuthLogger
     * agar closure afterResponse tidak menangkap objek Request/User.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function write(array $attributes, bool $broadcast = true, ?string $ticketNumber = null): ?AuditLog
    {
        $attributes['user_agent'] = isset($attributes['user_agent'])
            ? mb_substr((string) $attributes['user_agent'], 0, 255)
            : null;

        try {
            $log = AuditLog::create($attributes);

            if ($broadcast) {
                AuditLogCreated::dispatch(
                    eventType: $log->event_type,
                    category: $log->category,
                    severity: $log->severity,
                    actorId: $log->actor_id,
                    actorName: $log->actor_name,
                    actorRole: $log->actor_role,
                    ticketId: $log->ticket_id,
                    ip: $log->ip,
                    userAgent: $log->user_agent,
                    meta: $log->meta ?? [],
                    id: $log->id,
                    ticketNumber: $ticketNumber,
                );
            }

            return $log;
        } catch (Throwable $e) {
            report($e);

            Log::warning('Gagal menulis audit log.', [
                'event_type' => $attributes['event_type'] ?? null,
                'category' => $attributes['category'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
