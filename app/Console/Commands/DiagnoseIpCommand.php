<?php

namespace App\Console\Commands;

use App\Support\ClientIpResolver;
use Illuminate\Console\Command;

class DiagnoseIpCommand extends Command
{
    protected $signature = 'ip:diagnose';

    protected $description = 'Tampilkan konfigurasi trusted proxies, header proxy yang dipercaya, dan panduan verifikasi IP klien.';

    public function handle(): int
    {
        $proxies = ClientIpResolver::configuredProxies();
        $proxiesLabel = match (true) {
            $proxies === null => '(tidak ada / dinonaktifkan)',
            $proxies === '*' => '* (SEMUA proxy dipercaya — pastikan aplikasi tidak bisa diakses langsung tanpa proxy)',
            default => implode(', ', $proxies),
        };

        $this->info('=== Diagnosa Konfigurasi IP Klien & Reverse Proxy ===');
        $this->table(
            ['Pengaturan', 'Nilai'],
            [
                ['APP_ENV', (string) config('app.env')],
                ['TRUSTED_PROXIES', $proxiesLabel],
                ['Header Proxy Symfony', 'X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Port, X-Forwarded-Proto'],
                ['Header Cloudflare', 'CF-Connecting-IP (hanya dipercaya jika REMOTE_ADDR ada di TRUSTED_PROXIES)'],
                ['AUDIT_IGNORE_PRIVATE_IPS', config('audit.ignore_private_ips') ? 'true' : 'false'],
            ]
        );

        $this->line('');
        $this->comment('Cara verifikasi:');
        $this->line('1. Pastikan Nginx meneruskan: proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
        $this->line('2. Jika memakai Cloudflare di depan Nginx, set TRUSTED_PROXIES ke IP Nginx lokal (mis. 127.0.0.1,::1) atau CIDR Docker.');
        $this->line('3. Setelah mengubah .env, jalankan: php artisan config:clear && php artisan queue:restart');

        return self::SUCCESS;
    }
}
