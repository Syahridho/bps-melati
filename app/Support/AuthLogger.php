<?php

namespace App\Support;

use App\Models\AuthLog;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pencatat audit log untuk seluruh aksi autentikasi.
 *
 * Prinsip: audit log TIDAK PERNAH boleh menggagalkan login.
 *  - Penulisan dibungkus try/catch, kegagalan dilaporkan lewat report() lalu
 *    ditelan — bukan dilempar ulang.
 *  - Penulisan ditunda ke "setelah response" supaya tidak menambah latensi login.
 *  - Password tidak pernah disimpan. Email hanya disimpan sebagai HMAC (tidak
 *    bisa dibalik) dan bentuk tersamar; email mentah tidak pernah ditulis.
 *
 * KRONOLOGI bug SQLSTATE[42S22] Unknown column 'meta':
 * migration `2026_10_12_000002_create_auth_logs_table` sudah tercatat "Ran"
 * sebelum kolom `meta` ditambahkan ke file-nya. Perbaikannya ada di migration
 * `2026_10_13_000001_add_meta_to_auth_logs_table`. try/catch di bawah
 * membuat masalah skema serupa tidak lagi menjatuhkan respons login.
 */
final class AuthLogger
{
    public const LOGIN_SUCCESS = 'login_success';

    public const LOGIN_FAILED = 'login_failed';

    public const LOCKED_OUT = 'locked_out';

    public const BLOCKED_ACTIVE_SESSION = 'blocked_active_session';

    public const FORCE_LOGIN = 'force_login';

    public const LOGOUT = 'logout';

    public const FORCED_LOGOUT = 'forced_logout';

    public const SESSION_EXPIRED = 'session_expired';

    public const TOKEN_ISSUED = 'token_issued';

    public const TOKEN_REVOKED = 'token_revoked';

    /**
     * Catat satu aksi autentikasi. Selalu "fire and forget".
     *
     * @param  array<string, mixed>  $extra  Ditulis ke kolom `meta` (JSON).
     */
    public static function record(
        string $event,
        ?Request $request = null,
        ?User $user = null,
        ?string $attemptedEmail = null,
        ?string $context = null,
        array $extra = [],
    ): void {
        $payload = [
            'user_id' => $user?->id,
            'event' => $event,
            'email_hash' => $attemptedEmail !== null ? self::hashEmail($attemptedEmail) : null,
            'email_masked' => $attemptedEmail !== null ? self::maskEmail($attemptedEmail) : null,
            'ip_address' => ClientIpResolver::resolve($request),
            'user_agent' => $request !== null ? UserAgentParser::summarize($request->userAgent()) : null,
            'context' => $context ?? self::contextFrom($request),
            'meta' => $extra === [] ? null : $extra,
        ];

        // Hanya skalar yang ditangkap closure. Objek Request/User tidak boleh
        // ikut karena closure afterResponse diserialisasi oleh queue.
        $auditAttributes = self::auditAttributes($event, $user, $request, $payload);

        try {
            // Ditunda sampai response terkirim: audit log tidak menambah latensi
            // login, dan tidak bisa ikut ter-rollback oleh transaksi yang gagal.
            dispatch(function () use ($payload, $auditAttributes): void {
                self::write($payload);
                AuditLogger::write($auditAttributes);
            })->afterResponse();
        } catch (Throwable $e) {
            // Tidak ada handler antrean pun? tetap jangan menggagalkan login.
            self::write($payload);
            AuditLogger::write($auditAttributes);
        }
    }

    /**
     * Cerminkan aksi autentikasi ke tabel audit_logs agar tampil di /audit-log.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private static function auditAttributes(string $event, ?User $user, ?Request $request, array $payload): array
    {
        $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];
        $meta['context'] = $payload['context'] ?? null;

        if (! empty($payload['email_masked'])) {
            $meta['email_masked'] = $payload['email_masked'];
        }

        return [
            'event_type' => 'auth.'.$event,
            'category' => 'auth',
            'severity' => self::auditSeverity($event),
            'actor_id' => $user?->id,
            'actor_name' => $user?->name,
            'actor_role' => $user?->role?->value,
            'ticket_id' => null,
            'ip' => ClientIpResolver::resolve($request),
            'user_agent' => $request?->userAgent(),
            'meta' => array_filter($meta, static fn ($value): bool => $value !== null),
        ];
    }

    private static function auditSeverity(string $event): string
    {
        return match ($event) {
            self::LOGIN_FAILED, self::BLOCKED_ACTIVE_SESSION, self::LOCKED_OUT => 'warning',
            self::SESSION_EXPIRED, self::FORCED_LOGOUT, self::FORCE_LOGIN => 'notice',
            default => 'info',
        };
    }

    /**
     * Tulis langsung ke tabel. Selama dipanggil di dalam try/catch pemanggil.
     *
     * @param  array<string, mixed>  $payload
     */
    private static function write(array $payload): void
    {
        try {
            AuthLog::create($payload);
        } catch (Throwable $e) {
            report($e);

            Log::warning('Gagal menulis audit log autentikasi.', [
                'event' => $payload['event'] ?? null,
                'user_id' => $payload['user_id'] ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * HMAC-SHA256 dengan kunci aplikasi.
     *
     * Berbeda dari hash() biasa, HMAC tidak bisa di-dictionary-attack tanpa
     * mengetahui APP_KEY. Email mentah tidak pernah disimpan.
     */
    public static function hashEmail(string $email): string
    {
        return hash_hmac('sha256', mb_strtolower(trim($email)), (string) config('app.key'));
    }

    /**
     * a***@contoh.id — cukup untuk mengenali, tidak cukup untuk menghubungi.
     */
    public static function maskEmail(string $email): string
    {
        $email = trim($email);

        if (! str_contains($email, '@')) {
            return 'xxx';
        }

        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, 1);

        return $visible.'***@'.$domain;
    }

    private static function contextFrom(?Request $request): string
    {
        $request ??= request();

        return $request->is('api/*') ? 'api' : 'web';
    }
}
