<?php

namespace App\Support;

use Illuminate\Http\Request;

class LaporanFilterQuery
{
    public static function resolveDateRange(Request $request, string $defaultMode = 'bulan_ini'): array
    {
        return LaporanFilter::resolveDateRange($request, $defaultMode);
    }

    public static function searchClosure(string $search)
    {
        return function ($query) use ($search) {
            if ($search !== '') {
                $escapedSearch = str_replace(['%', '_'], ['\\\\%', '\\\\_'], $search);
                $query->where(function ($q) use ($escapedSearch) {
                    $q->where('ticket_number', 'like', "%{$escapedSearch}%")
                        ->orWhere('title', 'like', "%{$escapedSearch}%")
                        ->orWhere('reporter_name', 'like', "%{$escapedSearch}%")
                        ->orWhere('reporter_email', 'like', "%{$escapedSearch}%")
                        ->orWhere('reporter_wa', 'like', "%{$escapedSearch}%")
                        ->orWhere('content', 'like', "%{$escapedSearch}%");
                });
            }
        };
    }
}
