<?php

namespace App\Http\Controllers\Concerns;

use BackedEnum;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

trait RendersRolePage
{
    /** Role yang punya folder di resources/js/pages/dashboard/. */
    private const PAGE_ROLES = ['admin', 'operator', 'operator-tim'];

    protected function renderPage(Request $request, string $page, array $props = []): Response
    {
        return Inertia::render($this->rolePage($request, $page), $props);
    }

    protected function rolePage(Request $request, string $page): string
    {
        $role = $request->user()?->role;
        $role = $role instanceof BackedEnum ? $role->value : $role;
        $role = str_replace('_', '-', (string) $role); // operator_tim → operator-tim

        abort_unless(in_array($role, self::PAGE_ROLES, true), 403);

        return 'dashboard/'.$role.'/'.ltrim($page, '/');
    }
}