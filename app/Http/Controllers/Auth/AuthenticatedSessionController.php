<?php

namespace App\Http\Controllers\Auth;

use App\Events\LoginAttemptBlocked;
use App\Exceptions\AccountDisabledException;
use App\Exceptions\AccountInUseException;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\AuthenticateUser;
use App\Services\SessionTerminator;
use App\Support\AuthLogger;
use App\Support\UserAgentParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Alur yang dipakai controller ini:
 *   rate limit → verifikasi kredensial (pesan generik) → cek akun nonaktif →
 *   cek sesi aktif → login (atau 409 + kartu ambil alih).
 *
 * Semua keputusan terkait sesi TIDAK ada di sini; semuanya milik
 * App\Services\AuthenticateUser.
 */
class AuthenticatedSessionController extends Controller
{
    /**
     * Halaman login.
     */
    public function create(Request $request): Response
    {
        $conflict = $request->session()->get('session_conflict');
        $throttleSeconds = (int) $request->session()->get('throttle_seconds', 0);

        // Berkas flash hanya dipakai sekali.
        $request->session()->forget('session_conflict');
        $request->session()->forget('throttle_seconds');

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
            // Alasan sesi berakhir diteruskan lewat query string agar tetap
            // terbaca setelah Inertia::location() melakukan full page reload.
            'noticeReason' => $request->query('alasan'),
            'throttleSeconds' => $throttleSeconds,
            'sessionConflict' => $conflict,
        ]);
    }

    /**
     * Proses login.
     */
    public function store(LoginRequest $request, AuthenticateUser $authenticate): RedirectResponse|JsonResponse
    {
        $email = (string) $request->validated('email');
        $password = (string) $request->validated('password');
        $force = $request->boolean('force');

        try {
            $request->ensureIsNotRateLimited();
        } catch (ValidationException $e) {
            // Terlalu banyak percobaan. Dicatat DI LUAR transaksi apa pun.
            AuthLogger::record(AuthLogger::LOCKED_OUT, $request, null, $email, 'web', [
                'retry_after' => (int) $request->session()->get('throttle_seconds', 0),
            ]);

            throw $e;
        }

        try {
            $user = $authenticate->handle($request, $email, $password, $force);
        } catch (InvalidCredentialsException $e) {
            $request->recordFailedAttempt();

            AuthLogger::record(AuthLogger::LOGIN_FAILED, $request, null, $email, 'web', ['reason' => 'invalid_credentials']);

            return $this->failLogin($request, $e->getMessage());
        } catch (AccountDisabledException $e) {
            $request->recordFailedAttempt();

            return $this->failLogin($request, $e->getMessage());
        } catch (AccountInUseException $e) {
            $this->reportBlockedAttempt($request, $e, $email);

            return $this->failSessionConflict($request, $e);
        }

        $request->clearRateLimit();
        $request->session()->forget('throttle_seconds');

        return redirect()->intended($user->isAdmin()
            ? route('dashboard.admin.index', absolute: false)
            : route('dashboard.operator.index', absolute: false));
    }

    /**
     * Logout normal: putuskan sesi di server, invalidate, regenerate token.
     */
    public function destroy(Request $request, SessionTerminator $terminator): RedirectResponse
    {
        $user = $request->user();

        if ($user instanceof User) {
            $terminator->terminate($user, SessionTerminator::REASON_LOGOUT, actor: $user, request: $request);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Login gagal: pesan generik, tidak membocorkan apakah email terdaftar.
     */
    private function failLogin(Request $request, string $message): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'code' => 'invalid_credentials',
            ], HttpResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        return back()
            ->withInput($request->only('email'))
            ->withErrors(['email' => $message]);
    }

    /**
     * Login ditolak karena sesi lain masih aktif → 409 + data untuk kartu
     * konfirmasi pengambilan alih di frontend.
     */
    private function failSessionConflict(Request $request, AccountInUseException $e): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'account_in_use',
                'data' => $e->context,
            ], HttpResponse::HTTP_CONFLICT);
        }

        return back()
            ->withInput($request->only('email'))
            ->withErrors(['email' => $e->getMessage()])
            ->with('session_conflict', $e->context);
    }

    /**
     * Efek samping saat login diblokir. Dijalankan DI LUAR transaksi karena
     * transaksi di-rollback oleh exception, sehingga afterCommit tidak aktif.
     */
    private function reportBlockedAttempt(Request $request, AccountInUseException $e, string $email): void
    {
        $user = User::find($e->userId);

        // `meta` hanya berisi data yang SUDAH aman untuk disimpan: perangkat
        // dalam bentuk ringkas, waktu relatif, dan IP yang sudah disamarkan.
        // Alamat IP mentah hanya ada di kolom `ip_address` untuk keperluan audit.
        AuthLogger::record(AuthLogger::BLOCKED_ACTIVE_SESSION, $request, $user, $email, 'web', [
            'device' => $e->context['device'] ?? null,
            'last_active' => $e->context['last_active'] ?? null,
            'last_active_at' => $e->context['last_active_iso'] ?? null,
            'ip_masked' => $e->context['ip'] ?? null,
            'attempted_device' => UserAgentParser::label($request->userAgent()),
        ]);

        LoginAttemptBlocked::dispatch(
            $e->userId,
            $e->context['device'] ?? UserAgentParser::label($user?->last_login_agent),
            $e->context['last_active'] ?? null,
        );

        Log::notice('Login diblokir: sesi lain masih aktif.', [
            'user_id' => $e->userId,
        ]);
    }
}
