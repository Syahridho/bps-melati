<?php

namespace App\Services;

use App\Events\SessionTerminated;
use App\Models\User;
use App\Support\AuthLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Satu-satunya cara untuk mengakhiri sesi milik pengguna.
 *
 * Dipakai oleh: logout normal, pengambilan alih sesi (takeover), paksa logout
 * oleh admin, penonaktifan akun, dan penggantian password.
 *
 * Alur:
 *  1. Catat alasan pada request ini bila sesi yang diputus adalah sesi sendiri
 *     (middleware membacanya untuk membuat pesan yang tepat).
 *  2. Hapus baris sesi lama dari session store (Redis / database / file) —
 *     tidak bergantung pada tabel `sessions`.
 *  3. Kosongkan kolom current_session_id di database.
 *  4. Broadcast SessionTerminated ke kanal privat user.{id} supaya browser
 *     yang sedang aktif langsung keluar dengan alasannya.
 *  5. Catat audit log (tanpa password, tanpa email mentah).
 */
final class SessionTerminator
{
    public const REASON_TAKEN_OVER = 'taken_over';

    public const REASON_FORCED_LOGOUT = 'forced_logout';

    public const REASON_DEACTIVATED = 'deactivated';

    public const REASON_PASSWORD_CHANGED = 'password_changed';

    /**
     * Logout sukarela oleh pemilik akun (bukan paksa oleh pihak lain).
     */
    public const REASON_LOGOUT = 'logout';

    public const SESSION_MARKER_KEY = 'terminated_by';

    /**
     * Akhiri satu sesi milik pengguna.
     *
     * @param  string|null  $sessionId  ID sesi yang harus diputus. null = sesi milik user yang tercatat.
     */
    public function terminate(User $user, string $reason = self::REASON_FORCED_LOGOUT, ?string $sessionId = null, ?User $actor = null, ?Request $request = null): ?string
    {
        $sessionId ??= $user->current_session_id;

        if (blank($sessionId)) {
            return null;
        }

        $request ??= request();

        if ($request->hasSession() && $request->session()->getId() === $sessionId) {
            $request->session()->put(self::SESSION_MARKER_KEY, $reason);
        }

        $this->forgetSession($sessionId);

        $user->forceFill([
            'current_session_id' => null,
            'last_activity_at' => null,
        ])->saveQuietly();

        SessionTerminated::dispatch($user->id, $reason, $actor?->id);

        AuthLogger::record(
            self::auditEventFor($reason),
            $request,
            $user,
            null,
            'web',
            ['reason' => $reason, 'forced_by' => $actor?->id],
        );

        Log::info('Sesi pengguna diakhiri.', [
            'user_id' => $user->id,
            'reason' => $reason,
            'forced_by' => $actor?->id,
        ]);

        return $sessionId;
    }

    /**
     * Pemetaan alasan → event audit.
     *
     * Logout sukarela TIDAK boleh tercatat sebagai `forced_logout`; keduanya
     * adalah aksi yang sangat berbeda secara audit.
     */
    private static function auditEventFor(string $reason): string
    {
        return match ($reason) {
            self::REASON_TAKEN_OVER => AuthLogger::FORCE_LOGIN,
            self::REASON_LOGOUT => AuthLogger::LOGOUT,
            default => AuthLogger::FORCED_LOGOUT,
        };
    }

    /**
     * Hapus baris sesi dari store memakai API driver resmi Laravel.
     */
    private function forgetSession(string $sessionId): void
    {
        try {
            session()->getHandler()->destroy($sessionId);
        } catch (Throwable $e) {
            Log::warning('Gagal menghapus baris sesi dari store: '.$e->getMessage(), [
                'session_id' => substr($sessionId, 0, 12).'…',
            ]);
        }
    }
}
