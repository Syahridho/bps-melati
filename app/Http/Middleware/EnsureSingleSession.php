<?php

namespace App\Http\Middleware;

use App\Support\AuthLogger;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menegakkan kebijakan "satu sesi aktif per akun" pada setiap request.
 *
 * 1. Bila current_session_id di database tidak sama dengan session id request,
 *    sesi ini sudah diambil alih / dipaksa keluar → keluarkan pengguna.
 * 2. Bila last_activity_at sudah melewati batas inaktivitas → sesi kedaluwarsa.
 * 3. Selain itu, perbarui last_activity_at secara throttled (tidak menulis DB
 *    pada setiap request).
 *
 * Dijalankan pada middleware group `web` setelah StartSession. Request tamu
 * dilewati sepenuhnya.
 *
 * Tidak ada DB::transaction di middleware ini: seluruh penulisan audit log
 * terjadi di luar transaksi, sehingga tidak pernah ikut ter-rollback.
 */
class EnsureSingleSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $request->hasSession()) {
            return $next($request);
        }

        if (config('session_policy.single_session', true) === false) {
            $user->touchActivity();

            return $next($request);
        }

        $sessionId = $request->session()->getId();

        // Kebijakan ini_apply terhadap SESI. Bila autentikasi pada request ini
        // tidak berasal dari session (mis. guard diinjeksi manual), tidak ada
        // sesi yang bisa divalidasi — biarkan request berjalan.
        if (! $request->session()->has(Auth::guard()->getName())) {
            return $next($request);
        }

        $recorded = $user->current_session_id;

        // 1. Ada sesi LAIN yang masih aktif (takeover / paksa logout / dinonaktifkan).
        //    Sesi yang sudah basi diabaikan agar browser yang tertinggal boleh
        //    mengambil alih secara diam-diam.
        if ($recorded !== null && $recorded !== $sessionId && $user->isSessionActive()) {
            $reason = $this->detectReason($user);

            $this->terminateLocalSession($request, $reason);

            return $this->redirectToLogin($request, $reason);
        }

        // 2. Sesi milik request ini tetapi sudah melewati batas inaktivitas.
        if ($recorded === $sessionId && $user->isIdleBeyondTimeout()) {
            // Dicatat sebelum invalidate() supaya IP & user agent request masih
            // terbaca (tidak ada transaksi yang bisa me-rollback baris ini).
            AuthLogger::record(AuthLogger::SESSION_EXPIRED, $request, $user, null, 'web', [
                'inactivity_minutes' => (int) config('session_policy.inactivity_timeout_minutes', 120),
                'last_active_at' => $user->last_activity_at?->toIso8601String(),
            ]);

            $this->terminateLocalSession($request, 'expired');

            return $this->redirectToLogin($request, 'expired');
        }

        // 3. Sesi basi atau belum tercatat: klaim ulang sebagai sesi milik request ini.
        if ($recorded !== $sessionId) {
            $user->forceFill([
                'current_session_id' => $sessionId,
                'last_activity_at' => now(),
            ])->saveQuietly();
        }

        // 4. Segarkan aktivitas (penulisan throttled di User::touchActivity).
        $user->touchActivity();

        return $next($request);
    }

    /**
     * Kenapa sesi dicabut? Akun dinonaktifkan punya prioritas tertinggi.
     */
    private function detectReason(Model $user): string
    {
        if (property_exists($user, 'is_active') && $user->is_active === false) {
            return 'deactivated';
        }

        return 'taken_over';
    }

    private function terminateLocalSession(Request $request, string $reason): void
    {
        $user = $request->user();

        Auth::guard('web')->logout();

        $request->session()->forget('terminated_by');
        $request->session()->put('terminated_by', $reason);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($reason === 'taken_over') {
            Log::info('Sesi lokal diputus karena login di perangkat lain.', ['user_id' => $user?->getAuthIdentifier()]);
        }
    }

    /**
     * Untuk request Inertia gunakan Inertia::location() agar terjadi full page
     * reload — tidak ada state/flash Inertia yang bisa membawa pesan.
     */
    private function redirectToLogin(Request $request, string $reason): Response
    {
        $url = route('login', ['alasan' => $reason]);

        if ($request->header('X-Inertia')) {
            return Inertia::location($url);
        }

        return redirect($url)->with('status', __('session.login_notice.'.$reason, ['reason' => $reason]));
    }
}
