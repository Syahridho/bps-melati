<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class RedisHealthCheckCommand extends Command
{
    protected $signature = 'redis:health';

    protected $description = 'Periksa koneksi Redis (ping + cache roundtrip).';

    public function handle(): int
    {
        try {
            $pong = Redis::connection('default')->ping();
            $this->info('Redis ping: '.(is_array($pong) ? implode(',', $pong) : (string) $pong));

            Cache::store('redis')->put('redis:health:check', 'ok', 60);
            $value = Cache::store('redis')->get('redis:health:check');

            if ($value !== 'ok') {
                $this->error('Cache roundtrip gagal.');

                return self::FAILURE;
            }

            $this->info('Cache roundtrip: OK');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Redis tidak tersedia: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
