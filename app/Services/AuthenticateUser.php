<?php

namespace App\Services;

use App\Exceptions\AccountDisabledException;
use App\Exceptions\AccountInUseException;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use App\Support\AuthLogger;
use App\Support\IpMasker;
use App\Support\UserAgentParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Sumber kebenaran untuk login sesi web.
 *
 * Urutan pemeriksaan WAJIB (menjaga anti user-enumeration):
 *  1. Verifikasi kredensial. Email tidak ada DAN password salah → pesan identik,
 *     dan Hash::check tetap dijalankan terhadap hash dummy agar waktu respons
 *     tidak membocorkan keberadaan sebuah email.
 *  2. HANYA setelah kredensial valid: cek akun nonaktif, lalu cek sesi aktif.
 *     Pesan "akun sedang digunakan" tidak boleh muncul sebelum titik ini.
 *  3. Pemutusan / pembuatan sesi di bawah lock Redis + lockForUpdate pada baris
 *     user, sehingga dua login bersamaan tidak sama-sama lolos.
 *
 * Efek samping yang perlu terlihat (audit log, notifikasi ke sesi aktif)
 * sengaja dikembalikan ke controller lewat exception, karena transaksi akan
 * di-rollback pada kasus konflik dan event afterCommit tidak akan terpakai.
 */
class AuthenticateUser
{
    /**
     * Hash bcrypt bercost 12 (sama dengan default Hash::make) yang dipakai untuk
     * membakar waktu setara saat email tidak ditemukan.
     */
    private const DUMMY_HASH = '$2y$12$/z.J7L3ckMrW24XYXJVkR.iDfn5pdG1U928Pc4BDI3eNxh1xRbyU.';

    /**
     * @throws InvalidCredentialsException|AccountDisabledException|AccountInUseException
     */
    public function handle(Request $request, string $email, string $password, bool $force = false): User
    {
        $user = $this->verifyCredentials($email, $password);

        if ($user->is_active !== true) {
            AuthLogger::record(AuthLogger::LOGIN_FAILED, $request, $user, $email, 'web', ['reason' => 'inactive']);

            throw new AccountDisabledException;
        }

        // Lock per user: dua tab yang login bersamaan tidak bisa lolos bersamaan.
        $loggedIn = Cache::lock("login:user:{$user->id}", 10)->block(5, function () use ($request, $user, $force): User {
            return DB::transaction(function () use ($request, $user, $force): User {
                $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

                if (config('session_policy.single_session', true) && $this->isHeldByAnotherSession($request, $locked)) {
                    if (! $force || ! config('session_policy.allow_takeover', true)) {
                        throw $this->buildInUseException($locked);
                    }

                    $this->takeoverExistingSession($request, $locked);
                }

                $this->startSession($request, $locked);

                return $locked;
            }, 3);
        });

        // Audit log DI LUAR transaksi: bila commit gagal, baris login_success
        // tidak ikut hilang, dan penulisannya tidak menambah latensi di dalam lock.
        AuthLogger::record(AuthLogger::LOGIN_SUCCESS, $request, $loggedIn, $email, 'web', [
            'took_over' => $force,
            'session_id_suffix' => substr((string) $loggedIn->current_session_id, -8),
        ]);

        return $loggedIn;
    }

    /**
     * Verifikasi kredensial tanpa membocorkan keberadaan email.
     *
     * @throws InvalidCredentialsException
     */
    public function verifyCredentialsForToken(Request $request, string $email, string $password): User
    {
        $user = $this->verifyCredentials($email, $password);

        if ($user->is_active !== true) {
            AuthLogger::record(AuthLogger::LOGIN_FAILED, $request, $user, $email, 'mobile', ['reason' => 'inactive']);

            throw new AccountDisabledException;
        }

        return $user;
    }

    private function verifyCredentials(string $email, string $password): User
    {
        $user = User::where('email', $email)->whereNull('deleted_at')->first();

        // Selalu jalankan Hash::check, baik user ditemukan maupun tidak, supaya
        // lama proses tidak menjadi side channel.
        $valid = $user !== null
            ? Hash::check($password, $user->password)
            : Hash::check($password, self::DUMMY_HASH);

        if ($user === null || ! $valid) {
            throw new InvalidCredentialsException;
        }

        return $user;
    }

    /**
     * Apakah ada sesi LAIN yang masih aktif untuk akun ini?
     */
    private function isHeldByAnotherSession(Request $request, User $user): bool
    {
        if (! $user->isSessionActive()) {
            return false;
        }

        return ! ($request->hasSession() && $request->session()->getId() === $user->current_session_id);
    }

    /**
     * Mulai sesi baru: regenerate id (anti session fixation), login guard, lalu
     * catat sidik jari sesi di database.
     */
    private function startSession(Request $request, User $user): void
    {
        $request->session()->regenerate();

        Auth::guard('web')->login($user);

        $user->forceFill([
            'current_session_id' => $request->session()->getId(),
            'last_activity_at' => now(),
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_login_agent' => UserAgentParser::summarize($request->userAgent()),
        ])->save();
    }

    /**
     * Putuskan sesi lama milik akun yang sama, lalu lanjutkan dengan sesi baru
     * pada request ini. Wajib menyertakan kredensial valid ulang (flag force)
     * — tidak ada jalan mengambil alih sesi tanpa password.
     */
    private function takeoverExistingSession(Request $request, User $user): void
    {
        $oldSessionId = $user->current_session_id;

        if (blank($oldSessionId)) {
            return;
        }

        app(SessionTerminator::class)->terminate(
            $user,
            SessionTerminator::REASON_TAKEN_OVER,
            $oldSessionId,
            actor: $user,
            request: $request,
        );

        Log::info('Sesi lama diambil alih oleh pemilik akun yang sama.', [
            'user_id' => $user->id,
        ]);
    }

    /**
     * @throws AccountInUseException
     */
    private function buildInUseException(User $user): AccountInUseException
    {
        $device = UserAgentParser::label($user->last_login_agent);

        return new AccountInUseException($user->id, [
            'device' => $device === 'Tidak diketahui' ? __('session.in_use_unknown_device') : $device,
            'last_active' => $user->last_activity_at?->locale('id')->diffForHumans() ?? __('session.in_use_unknown_agent'),
            'last_active_iso' => $user->last_activity_at?->toIso8601String(),
            'ip' => IpMasker::mask($user->last_login_ip),
        ]);
    }

    /**
     * Verifikasi ulang password pada proses ambil alih.
     *
     * @throws InvalidCredentialsException
     */
    public function assertTakeoverPassword(string $email, string $password): User
    {
        return $this->verifyCredentials($email, $password);
    }

    /**
     * Cabut token mobile lama agar hanya ada satu token aktif per jenis klien.
     */
    public function revokeMobileTokens(User $user): int
    {
        return $user->tokens()->where('name', config('session_policy.token_name_mobile', 'mobile'))->delete();
    }
}
