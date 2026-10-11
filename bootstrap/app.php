<?php

use App\Http\Middleware\EnsureApiKeyIsValid;
use App\Http\Middleware\EnsureSingleSession;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'api.key' => EnsureApiKeyIsValid::class,
        ]);

        $middleware->web(append: [
            SecurityHeaders::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            // Kebijakan satu sesi aktif per akun. Berjalan setelah StartSession,
            // sehingga $request->user() sudah ter-resolve dari session cookie.
            EnsureSingleSession::class,
        ]);

        $middleware->api(append: [
            SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // 1. Halaman kedaluwarsa / token CSRF usang → 419.
        $exceptions->render(function (Response $response, Throwable $exception, Request $request) {
            if ($response->getStatusCode() !== 419) {
                return null;
            }

            return $request->is('api/*')
                ? response()->json([
                    'message' => __('Halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.'),
                    'code' => 'page_expired',
                ], 419)
                : back()->withErrors(['general' => __('Halaman kedaluwarsa. Muat ulang halaman lalu coba lagi.')]);
        });

        // 2. Rate limit → 429 dengan sisa detik dalam Bahasa Indonesia.
        $exceptions->render(function (InvalidSignatureException $exception, Request $request) {
            $message = __('Tautan unduhan sudah kedaluwarsa. Muat ulang halaman status laporan lalu coba lagi.');

            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                    'code' => 'link_expired',
                ], 403);
            }

            return Inertia::render('error', [
                'status' => 403,
                'message' => $message,
            ])
                ->toResponse($request)
                ->setStatusCode(403);
        });

        $exceptions->render(function (Response $response, Throwable $exception, Request $request) {
            if ($response->getStatusCode() !== 429) {
                return null;
            }

            $seconds = method_exists($response, 'getHeaders')
                ? (int) ($response->getHeaders()['Retry-After'] ?? 60)
                : 60;

            return $request->is('api/*')
                ? response()->json([
                    'message' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => (int) ceil($seconds / 60)]),
                    'code' => 'throttled',
                    'retry_after' => $seconds,
                ], 429)
                : back()->withErrors([
                    'general' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => (int) ceil($seconds / 60)]),
                ])->with('throttle_seconds', $seconds);
        });

        // 3. Error server / layanan tidak tersedia → pesan generik Bahasa Indonesia.
        //    Detail teknis TIDAK pernah dibocorkan ke pengguna.
        $exceptions->render(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if (! in_array($status, [500, 502, 503, 504], true)) {
                return null;
            }

            // Di development & debug, biarkan halaman exception Laravel tampil.
            if ($status >= 500 && config('app.debug') && ! app()->environment('production')) {
                return null;
            }

            $message = $status === 503
                ? __('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.')
                : __('Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.');

            if ($request->is('api/*')) {
                return response()->json(['message' => $message, 'code' => 'server_error'], $status);
            }

            return back()->withErrors(['general' => $message]);
        });

        // 4. Halaman error Inertia (403/404/405/5xx) untuk request web biasa.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($request->is('api/*')) {
                return $response;
            }

            $statusCode = $response->getStatusCode();

            if (in_array($statusCode, [403, 404, 405, 500, 502, 503, 504, 505], true)) {
                if ($statusCode >= 500 && config('app.debug') && ! app()->environment('production')) {
                    return $response;
                }

                $message = match (true) {
                    $exception instanceof InvalidSignatureException => __('Tautan unduhan sudah kedaluwarsa. Muat ulang halaman status laporan lalu coba lagi.'),
                    default => $exception->getMessage() ?: null,
                };

                return Inertia::render('error', [
                    'status' => $statusCode,
                    'message' => $message,
                ])
                    ->toResponse($request)
                    ->setStatusCode($statusCode);
            }

            return $response;
        });
    })->create();
