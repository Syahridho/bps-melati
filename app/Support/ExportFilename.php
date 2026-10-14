<?php

namespace App\Support;

class ExportFilename
{
    /**
     * Buat nama file export yang unik berbasis prefix, periode, dan timestamp lokal (Asia/Jakarta).
     */
    public static function make(string $prefix, string $periode, string $ext = 'xls'): string
    {
        $timestamp = now(config('app.timezone', 'Asia/Jakarta'))->format('Ymd_His');

        $sanitizedPeriode = preg_replace('/[\\\\\/]+/', '-', $periode);
        $sanitizedPeriode = preg_replace('/\s+/', '-', $sanitizedPeriode);
        $sanitizedPeriode = preg_replace('/[^a-zA-Z0-9\-_]/', '', $sanitizedPeriode);
        $sanitizedPeriode = preg_replace('/-+/', '-', $sanitizedPeriode);
        $sanitizedPeriode = trim($sanitizedPeriode, '-');

        return sprintf('%s-%s_%s.%s', $prefix, $sanitizedPeriode, $timestamp, ltrim($ext, '.'));
    }
}
