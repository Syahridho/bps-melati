<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiKeyIsValid
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedApiKey = config('app.api_key');

        $providedApiKey = $request->header('X-API-KEY')
            ?? $request->header('x-api-key')
            ?? $request->header('Authorization')
            ?? $request->query('api_key');

        // Normalisasi jika header Authorization: Bearer <key>
        if ($providedApiKey && str_starts_with($providedApiKey, 'Bearer ')) {
            $providedApiKey = substr($providedApiKey, 7);
        }

        if (empty($expectedApiKey) || $providedApiKey !== $expectedApiKey) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Invalid or missing API key.',
            ], 401);
        }

        return $next($request);
    }
}
