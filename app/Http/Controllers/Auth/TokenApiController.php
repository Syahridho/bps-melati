<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\AccountDisabledException;
use App\Exceptions\AccountInUseException;
use App\Exceptions\InvalidCredentialsException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthenticateUser;
use App\Support\AuthLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Login untuk klien non-browser (Flutter/Android).
 *
 * Kebijakan yang dipakai: satu token aktif per akun PER JENSIS KLIEN.
 * Token web (sesi) dan token mobile tidak saling meniadakan; login mobile
 * baru selalu mencabut token mobile lama dengan nama yang sama.
 *
 * Format error konsisten: { "message": "...", "code": "..." }
 */
class TokenApiController extends Controller
{
    public function store(Request $request, AuthenticateUser $authenticate): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ], [
            'email.required' => __('auth.email_required'),
            'email.email' => __('auth.email_invalid'),
            'password.required' => __('auth.password_required'),
        ]);

        $email = (string) $validated['email'];
        $throttleKey = 'token-login|'.Str::lower($email).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => (int) ceil($seconds / 60)]),
                'code' => 'throttled',
                'retry_after' => $seconds,
            ], HttpResponse::HTTP_TOO_MANY_REQUESTS);
        }

        $user = null;

        try {
            $user = $authenticate->verifyCredentialsForToken($request, $email, (string) $validated['password']);
        } catch (InvalidCredentialsException) {
            RateLimiter::hit($throttleKey, 60);
            AuthLogger::record(AuthLogger::LOGIN_FAILED, $request, null, $email, 'mobile', ['reason' => 'invalid_credentials']);

            return response()->json([
                'message' => __('auth.failed'),
                'code' => 'invalid_credentials',
            ], HttpResponse::HTTP_UNPROCESSABLE_ENTITY);
        } catch (AccountDisabledException) {
            RateLimiter::hit($throttleKey, 60);
            AuthLogger::record(AuthLogger::LOGIN_FAILED, $request, $user, $email, 'mobile', ['reason' => 'inactive']);

            return response()->json([
                'message' => __('auth.account_disabled'),
                'code' => 'account_disabled',
            ], HttpResponse::HTTP_FORBIDDEN);
        } catch (AccountInUseException) {
            return response()->json([
                'message' => __('auth.account_in_use'),
                'code' => 'account_in_use',
            ], HttpResponse::HTTP_CONFLICT);
        }

        RateLimiter::clear($throttleKey);

        // Satu token aktif per jenis klien: cabut token mobile lama.
        $revoked = $authenticate->revokeMobileTokens($user);

        $tokenName = (string) ($validated['device_name'] ?? config('session_policy.token_name_mobile', 'mobile'));

        $expiresAt = now()->addMinutes((int) config('session_policy.token_expiration_minutes', 10080));

        $token = $user->createToken($tokenName, ['mobile'], $expiresAt);

        AuthLogger::record(AuthLogger::TOKEN_ISSUED, $request, $user, $email, 'mobile', [
            'revoked' => $revoked,
            'device_name' => $tokenName,
        ]);

        return response()->json([
            'message' => 'Berhasil masuk.',
            'code' => 'ok',
            'data' => [
                'token' => $token->plainTextToken,
                'token_type' => 'Bearer',
                'expires_at' => $expiresAt->toIso8601String(),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                ],
            ],
        ], HttpResponse::HTTP_CREATED);
    }

    /**
     * Cabut token milik akun yang sedang login.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user instanceof User) {
            $user->currentAccessToken()?->delete();
            AuthLogger::record(AuthLogger::TOKEN_REVOKED, $request, $user, context: 'mobile');
        }

        return response()->json(['message' => 'Token berhasil dicabut.', 'code' => 'ok']);
    }
}
