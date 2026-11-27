<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Resolver dan normalisator IP klien terpusat.
 *
 * Seluruh pencatatan dan perbandingan IP wajib melewati kelas ini agar
 * format IPv4, IPv4-mapped IPv6 (::ffff:1.2.3.4), IPv6, dan deteksi
 * loopback konsisten di seluruh aplikasi.
 */
final class ClientIpResolver
{
    public static function resolve(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        $remoteAddr = self::normalize($request->server->get('REMOTE_ADDR'));

        // CF-Connecting-IP hanya dipercaya bila koneksi benar-benar datang dari proxy tepercaya.
        $cfConnectingIp = $request->headers->get('CF-Connecting-IP');
        if (is_string($cfConnectingIp) && $cfConnectingIp !== '' && self::isTrustedProxy($remoteAddr)) {
            $normalizedCf = self::normalize($cfConnectingIp);
            if ($normalizedCf !== null) {
                return $normalizedCf;
            }
        }

        return self::normalize($request->ip());
    }

    public static function normalize(?string $ip): ?string
    {
        if ($ip === null) {
            return null;
        }

        $candidate = trim(explode(',', $ip)[0]);

        if ($candidate === '' || filter_var($candidate, FILTER_VALIDATE_IP) === false) {
            return null;
        }

        $packed = @inet_pton($candidate);
        if ($packed === false) {
            return null;
        }

        // Ubah IPv4-mapped IPv6 (::ffff:a.b.c.d) menjadi IPv4 standar.
        if (strlen($packed) === 16 && substr($packed, 0, 12) === "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff") {
            $ipv4 = @inet_ntop(substr($packed, 12, 4));

            return $ipv4 !== false ? $ipv4 : null;
        }

        $normalized = @inet_ntop($packed);

        return $normalized !== false ? strtolower($normalized) : null;
    }

    public static function isLoopback(?string $ip): bool
    {
        $normalized = self::normalize($ip);
        if ($normalized === null) {
            return false;
        }

        if ($normalized === '::1') {
            return true;
        }

        return IpUtils::checkIp($normalized, '127.0.0.0/8');
    }

    public static function equals(?string $firstIp, ?string $secondIp): bool
    {
        $first = self::normalize($firstIp);
        $second = self::normalize($secondIp);

        return $first !== null && $second !== null && $first === $second;
    }

    /**
     * @return array<int, string>|string|null
     */
    public static function configuredProxies(): array|string|null
    {
        // Saat bootstrap (withMiddleware), config repository belum tersedia
        // sehingga env() dipakai langsung. Di runtime (misalnya dari test),
        // config() sudah bisa dan didahulukan agar bisa di-override.
        try {
            $raw = trim((string) config('trustedproxy.proxies', env('TRUSTED_PROXIES', '127.0.0.1,::1')));
        } catch (\Throwable) {
            $raw = trim((string) env('TRUSTED_PROXIES', '127.0.0.1,::1'));
        }

        if ($raw === '') {
            return null;
        }

        if ($raw === '*') {
            return '*';
        }

        $items = array_values(array_filter(array_map('trim', explode(',', $raw)), fn (string $v): bool => $v !== ''));

        return $items === [] ? null : $items;
    }

    public static function isTrustedProxy(?string $remoteAddr): bool
    {
        $normalized = self::normalize($remoteAddr);
        if ($normalized === null) {
            return false;
        }

        $proxies = self::configuredProxies();
        if ($proxies === null) {
            return false;
        }

        if ($proxies === '*') {
            return true;
        }

        return IpUtils::checkIp($normalized, $proxies);
    }
}
