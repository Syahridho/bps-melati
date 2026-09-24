<?php

namespace App\Http\Middleware;

use App\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null || $user->is_active === false) {
            abort(403);
        }

        $allowedRoles = array_map(
            fn (string $role): string => UserRole::tryFrom($role)?->value ?? $role,
            $roles
        );

        if (! in_array($user->role->value, $allowedRoles, true)) {
            abort(403);
        }

        return $next($request);
    }
}
