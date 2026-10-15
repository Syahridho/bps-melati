<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LaporanFilterQuery
{
    public static function resolveDateRange(Request $request, string $defaultMode = 'bulan_ini'): array
    {
        $fromInput = $request->query('from');
        $toInput = $request->query('to');
        $tz = 'Asia/Jakarta';

        if ($fromInput === null && $toInput === null) {
            if ($defaultMode === 'semua') {
                return ['semua', 'semua', true];
            }
            $now = Carbon::now($tz);

            return [
                $now->copy()->startOfMonth()->toDateString(),
                $now->copy()->endOfMonth()->toDateString(),
                false,
            ];
        }

        $isSemuaWaktu = ($fromInput === 'semua' || $toInput === 'semua');

        if ($isSemuaWaktu) {
            return ['semua', 'semua', true];
        }

        if ($fromInput && $toInput) {
            try {
                $fromDate = Carbon::parse($fromInput, $tz)->toDateString();
                $toDate = Carbon::parse($toInput, $tz)->toDateString();
                if ($toDate < $fromDate) {
                    $toDate = $fromDate;
                }

                return [$fromDate, $toDate, false];
            } catch (\Throwable) {
                // Fallback
            }
        }

        if ($defaultMode === 'semua') {
            return ['semua', 'semua', true];
        }

        $now = Carbon::now($tz);

        return [
            $now->copy()->startOfMonth()->toDateString(),
            $now->copy()->endOfMonth()->toDateString(),
            false,
        ];
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
