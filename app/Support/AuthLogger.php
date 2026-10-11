<?php

namespace App\Support;

use App\Models\AuthLog;
use App\Models\User;
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
            'ip_address' => $request?->ip(),
            'user_agent' => $request !== null ? UserAgentParser::summarize($request->userAgent()) : null,
            'context' => $context ?? self::contextFrom($request),
            'meta' => $extra === [] ? null : $extra,
        ];

        try {
            // Ditunda sampai response terkirim: audit log tidak menambah latensi
            // login, dan tidak bisa ikut ter-rollback oleh transaksi yang gagal.
            dispatch(fn () => self::write($payload))->afterResponse();
        } catch (Throwable $e) {
            // Tidak ada handler antrean pun? tetap jangan menggagalkan login.
            self::write($payload);
        }
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
