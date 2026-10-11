<?php

namespace App\Support;

/**
 * Menyamarkan alamat IP sebelum dikirim ke antarmuka pengguna.
 *
 * Aturan:
 *  - IPv4: dua octet terakhir diganti 'xx'  -> 103.22.xx.xx
 *  - IPv6: dua grup terakhir diganti 'xxxx' -> 2001:db8:85a3::xxxx:xxxx
 *
 * Tujuannya mencegah pengungkapan lokasi jaringan pengguna ke pihak ketiga,
 * sambil tetap cukup informatif untuk mengenali perangkat sendiri.
 */
final class IpMasker
{
    public static function mask(?string $ip): ?string
    {
        if ($ip === null || $ip === '') {
            return null;
        }

        // Alamat lokal tidak perlu disamarkan.
        if ($ip === '::1' || str_starts_with($ip, '127.')) {
            return $ip;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            $parts = explode('.', $ip);

            return $parts[0].'.'.$parts[1].'.xx.xx';
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $parts = array_values(array_filter(explode(':', $ip), static fn (string $part): bool => $part !== ''));

            if (count($parts) <= 2) {
                return $ip;
            }

            $masked = array_slice($parts, 0, count($parts) - 2);

            return implode(':', $masked).':xxxx:xxxx';
        }

        return 'xxx.xxx.xx.xx';
    }
}
