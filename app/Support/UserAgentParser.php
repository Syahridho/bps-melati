<?php

namespace App\Support;

/**
 * Mengubah user agent mentah menjadi keterangan perangkat yang enak dibaca
 * (mis. "Chrome di Windows"). Dipakai pada kartu konflik sesi dan audit log.
 */
final class UserAgentParser
{
    /**
     * @return array{label: string, os: string|null, browser: string|null, device: string}
     */
    public static function parse(?string $userAgent): array
    {
        $userAgent = trim((string) $userAgent);

        if ($userAgent === '') {
            return ['label' => 'Tidak diketahui', 'os' => null, 'browser' => null, 'device' => 'unknown'];
        }

        $os = match (true) {
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac OS X') || str_contains($userAgent, 'Macintosh') => 'macOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'iPhone'), str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => null,
        };

        $browser = match (true) {
            str_contains($userAgent, 'Edg/') => 'Edge',
            str_contains($userAgent, 'OPR/'), str_contains($userAgent, 'Opera') => 'Opera',
            str_contains($userAgent, 'Chrome/') => 'Chrome',
            str_contains($userAgent, 'Safari/') => 'Safari',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            default => 'Peramban lain',
        };

        $device = match (true) {
            str_contains($userAgent, 'iPad'), str_contains($userAgent, 'Tablet') => 'tablet',
            str_contains($userAgent, 'Mobile'), str_contains($userAgent, 'iPhone'), str_contains($userAgent, 'Android') => 'mobile',
            default => 'desktop',
        };

        $label = $os !== null
            ? sprintf('%s di %s', $browser, $os)
            : $browser;

        return ['label' => $label, 'os' => $os, 'browser' => $browser, 'device' => $device];
    }

    public static function label(?string $userAgent): string
    {
        return self::parse($userAgent)['label'];
    }

    /**
     * Versi pendek yang muat di kolom last_login_agent (255 karakter).
     */
    public static function summarize(?string $userAgent): ?string
    {
        $userAgent = trim((string) $userAgent);

        return $userAgent === '' ? null : mb_substr($userAgent, 0, 255);
    }
}
