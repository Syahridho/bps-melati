<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class LaporanCache
{
    public const VERSION_KEY = 'laporan:version';

    public const TTL = 3600;

    public static function version(): string
    {
        return (string) Cache::rememberForever(
            self::VERSION_KEY,
            fn (): string => (string) now()->getTimestampMs()
        );
    }

    public static function remember(string $type, string $category, array $params, int $ttl, callable $callback)
    {
        $key = sprintf('laporan:%s:%s:%s:%s', $type, $category, md5(json_encode($params)), self::version());

        return Cache::remember($key, $ttl, $callback);
    }

    public static function invalidate(): void
    {
        Cache::forever(self::VERSION_KEY, (string) hrtime(true));
    }
}
