# Panduan Setup & Deployment Aplikasi "Melati"

Dokumen ini adalah panduan setup **berbasis kode proyek terkini** untuk aplikasi pelaporan **Melati** (Laravel 12 + Inertia.js v2 + React 19 + Laravel Reverb). Berlaku untuk dua lingkungan:

| Lingkungan | Web Server | Process Manager | Deskripsi |
|---|---|---|---|
| **Lokal (Windows)** | Laragon (Apache/Nginx + PHP) | `composer dev` (concurrently) | Pengembangan |
| **Produksi (VPS Ubuntu)** | Nginx + PHP-FPM 8.2 | **Supervisor** + cron | Operasional |

> Semua nilai di bawah diverifikasi langsung terhadap `composer.json`, `package.json`, `config/*.php`, `routes/console.php`, dan `.env` proyek.

---

## Daftar Isi

1. [Kebutuhan Sistem](#1-kebutuhan-sistem)
2. [Instalasi Dependensi](#2-instalasi-dependensi)
3. [Konfigurasi `.env`](#3-konfigurasi-env)
4. [Redis](#4-redis)
5. [WebSocket - Laravel Reverb](#5-websocket-laravel-reverb)
6. [Queue Worker](#6-queue-worker)
7. [Scheduler](#7-scheduler)
8. [Supervisor (Produksi)](#8-supervisor-produksi)
9. [Nginx + PHP-FPM (Produksi)](#9-nginx-php-fpm-produksi)
10. [Cron (Produksi)](#10-cron-produksi)
11. [Broadcast Channel & Event](#11-broadcast-channel-event)
12. [Validasi & Troubleshooting](#12-validasi-troubleshooting)
13. [Checklist Rilis](#13-checklist-rilis)

---

## 1. Kebutuhan Sistem

### 1.1 Versi yang Dipakai Proyek

| Komponen | Versi | Sumber |
|---|---|---|
| PHP | `^8.2` (terpasang 8.2.34) | `composer.json` |
| Laravel Framework | `12.69.2` | `php artisan --version` |
| Laravel Reverb | `^1.0` | `composer.json` |
| Laravel Sanctum | `^4.0` | `composer.json` |
| Inertia (server) | `^2.0` | `composer.json` |
| Inertia (client) | `^2.0.0` | `package.json` |
| React | `^19.0.0` | `package.json` |
| Vite | `^6.0` | `package.json` |
| Tailwind CSS | `^4.0` (CSS-first, tanpa `tailwind.config.js`) | `package.json` |
| Laravel Echo | `^2.5.0` + `@laravel/echo-react` `^2.5.0` | `package.json` |
| Predis | `^3.6` | `composer.json` |
| Pest | `^3.8` | `composer.json` (dev) |
| Pint | `^1.18` | `composer.json` (dev) |
| Node.js | `^20` atau `^22` | - |
| MySQL | `^8.0` | - |
| Redis | `^6` atau `^7` | - |

### 1.2 Ekstensi PHP Wajib

 requisite:

- `pdo_mysql` - koneksi database
- `fileinfo` - validasi MIME unggah lampiran
- `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `curl`, `zip`

Cek cepat:

```bash
php -m | grep -E "pdo_mysql|mbstring|openssl|tokenizer|xml|ctype|json|fileinfo|curl|zip"
```

> **Catatan:** proyek memakai `predis/predis` (pure PHP), **bukan** ekstensi `phpredis`. Jadi ekstensi `redis` tidak wajib dipasang.

### 1.3 Pak Sistem (Ubuntu 22.04 / 24.04)

```bash
sudo apt update
sudo apt install -y \
  nginx \
  php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl \
  php8.2-zip php8.2-bcmath php8.2-intl php8.2-gd \
  unzip git curl redis-server supervisor
```

---

## 2. Instalasi Dependensi

```bash
git clone <repo> /var/www/bps-melati
cd /var/www/bps-melati

# Dependency PHP
composer install --no-dev --optimize-autoloader   # produksi
composer install                                    # lokal (punya dev tools)

# Dependency JS
npm ci                                             # produksi (dari package-lock.json)
npm install                                        # lokal

# Build asset produksi
npm run build

# Link storage ke public
php artisan storage:link

# Migrasi + cache
php artisan migrate --force
php artisan optimize:clear
```

> **Penting:** `php artisan storage:link` **wajib** dijalankan. Proyek menyimpan lampiran di `storage/app/public`, dan halaman `/check` kini memakai URL bertanda tangan (signed URL). Tanpa symlink, berkas tidak dapat dilayani.

---

## 3. Konfigurasi `.env`

### 3.1 Pembuatan Awal

```bash
cp .env.example .env
php artisan key:generate
```

> `.env.example` proyek ini **perlu diubah**: nilai bawaannya masih sqlite dan `BROADCAST_CONNECTION=log`. Salin file tersebut, lalu **timpa** sesuai bagian 3.2.

### 3.2 Konfigurasi Lengkap (Referensi)

```dotenv
# --- Aplikasi ---
APP_NAME=Melati
APP_ENV=production              # local saat pengembangan
APP_KEY=base64:...              # php artisan key:generate
APP_DEBUG=false                 # WAJIB false di produksi
APP_URL=https://melati.example.id
API_KEY=melati-secret-api-key   # header X-API-KEY untuk /api/*

# --- Locale ---
APP_LOCALE=id
APP_FALLBACK_LOCALE=id
APP_FAKER_LOCALE=id_ID

# --- Database ---
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=melati_bps
DB_USERNAME=melati
DB_PASSWORD=kata-sandi-kuat

# --- Session (Redis) ---
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

# Kebijakan satu sesi aktif per akun (config/session_policy.php)
SESSION_SINGLE=true
SESSION_ACTIVE_THRESHOLD_MINUTES=5
SESSION_INACTIVITY_MINUTES=120
SESSION_ALLOW_TAKEOVER=true
SESSION_ACTIVITY_WRITE_THROTTLE=60

# Token API (Sanctum) dan audit log
AUTH_TOKEN_EXPIRATION=10080
AUTH_LOG_RETENTION_DAYS=90

# --- Broadcast / Queue / Cache ---
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=local

CACHE_STORE=redis
CACHE_PREFIX=melati_cache_

# --- Redis ---
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# --- Laravel Reverb (WebSocket) ---
REVERB_APP_ID=979893
REVERB_APP_KEY=z6zpnfzrdghd5j25rj81
REVERB_APP_SECRET=mdztdbzoqy1bhiuybbl7
REVERB_HOST=melati.example.id     # hostname PUBLIK yang diakses browser
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0         # bind internal Reverb
REVERB_SERVER_PORT=8080

# WAJIB true bila aplikasi dijalankan lebih dari satu proses/server Reverb
REVERB_SCALING_ENABLED=true
REVERB_SCALING_CHANNEL=reverb

# Harus sama persis dengan REVERB_* di atas (dibaca Vite saat build)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
VITE_APP_NAME="${APP_NAME}"

# --- Mail (SMTP Gmail) ---
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=contoh@gmail.com
MAIL_PASSWORD="app-password-16-karakter"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="contoh@gmail.com"
MAIL_FROM_NAME="${APP_NAME}"
```

> **PENTING - `VITE_REVERB_*` harus diubah lalu `npm run build` dijalankan ulang.**
> Nilai Vite di-inline saat build. Mengubah `.env` saja tidak mengubah bundle JS yang sudah ter-deploy.

> **Catatan Timezone.** `.env.example` memakai `APP_TIMEZONE=Asia/Jakarta`, namun instalasi lokal proyek ini memakai `APP_TIMEZONE=UTC`. Keduanya aman karena migrasi `2026_10_01_000001_adjust_timestamps_to_wib.php` telah menggeser seluruh timestamp lama +7 jam sehingga kolom database terbaca sebagai WIB. **Jangan mengacak antara dua nilai ini pada instalasi yang sama** - gunakan satu nilai secara konsisten. Perhitungan auto-close memakai `addDays(N)` pada nilai yang sudah berupa WIB.

> **Catatan Redis Prefix.** `CACHE_PREFIX=melati_cache_` mencegah bentrok bila Redis dipakai bersama aplikasi lain. Pastikan nilainya sama di web, queue worker, Reverb, dan scheduler.

---

## 4. Redis

Redis adalah fondasi tunggal di proyek ini - dipakai untuk 4 keperluan sekaligus:

| Pemakaian | Config | Keterangan |
|---|---|---|
| Session | `SESSION_DRIVER=redis` | Tabel `sessions` selalu kosong; sumber kebenaran sesi ada di tabel `users` |
| Cache | `CACHE_STORE=redis` | Hitungan dashboard, rekap, kanal, setting, ticket |
| Queue | `QUEUE_CONNECTION=redis` | Broadcast dan notifikasi email |
| Lock | - | `Cache::lock()` untuk penghitungan nomor tiket dan login |

### 4.1 Instalasi dan Konfigurasi (Ubuntu)

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

File konfigurasi: `/etc/redis/redis.conf`

```conf
bind 127.0.0.1 ::1
protected-mode yes
port 6379
supervised systemd

# WAJIB untuk Reverb scaling dan Laravel Locks
notify-keyspace-events K$
```

> **`notify-keyspace-events K$` wajib untuk `REVERB_SCALING_ENABLED=true`.** Tanpa itu, Reverb tidak menerima notifikasi pub/sub dari Redis sehingga broadcast antar-node tidak terkirim.

Verifikasi:

```bash
redis-cli ping
# PING

redis-cli config get notify-keyspace-events
```

### 4.2 Redis untuk Reverb (Scaling)

```dotenv
REVERB_SCALING_ENABLED=true
REVERB_SCALING_CHANNEL=reverb
```

`config/reverb.php:43-51` membaca `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` untuk kanal pub/sub:

```php
'server' => [
    'url'      => env('REDIS_URL'),
    'host'     => env('REDIS_HOST', '127.0.0.1'),
    'port'     => env('REDIS_PORT', '6379'),
    'username' => env('REDIS_USERNAME'),
    'password' => env('REDIS_PASSWORD'),
    'database' => env('REDIS_DB', '0'),
    'timeout'  => env('REDIS_TIMEOUT', 60),
],
```

### 4.3 Redis untuk Reverb (Windows / Laragon)

Laragon sudah menyertakan Redis. Pastikan:

- Redis berjalan (ikon tray Laragon, lalu pilih `Redis`)
- `REDIS_CLIENT=predis` (bukan `phpredis`)

---

## 5. WebSocket - Laravel Reverb

### 5.1 Konsep

Reverb adalah server WebSocket. Arsitektur di proyek ini:

```
+----------------+   HTTP POST /apps/{id}/events   +------------------+
|  Queue Worker  | ---------------------------------> |  Reverb Server   |
|  (broadcasts)  |                                    |  :8080 (ws://)   |
+----------------+                                    +--------+---------+
         ^                                                     | WebSocket
         |  ShouldBroadcast + ShouldDispatchAfterCommit          v
         |                                             +------------------+
+----------------+   Reverb SDK / HTTP                 |     Browser      |
|  Laravel App   | --------------------------------->  |  (Echo / Pusher) |
+----------------+                                    +------------------+
```

- Server ke Browser: **langsung** lewat WebSocket, tanpa antrean.
- App ke Server: **lewat queue `broadcasts`**, agar tidak memblokir response HTTP.

### 5.2 Konfigurasi

```dotenv
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=979893
REVERB_APP_KEY=z6zpnfzrdghd5j25rj81
REVERB_APP_SECRET=mdztdbzoqy1bhiuybbl7

# Hostname dan port yang DIBACA BROWSER
REVERB_HOST=melati.example.id
REVERB_PORT=443
REVERB_SCHEME=https

# Bind internal server Reverb
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

REVERB_SCALING_ENABLED=true
REVERB_SCALING_CHANNEL=reverb

# Wajib identik dengan REVERB_* di atas
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

| Variabel | Arti | Dipakai oleh |
|---|---|---|
| `REVERB_HOST` | Hostname publik yang diakses browser | Vite dan `config/reverb.php` |
| `REVERB_SERVER_HOST` | Alamat bind internal Reverb | `config/reverb.php:32` |
| `REVERB_SCHEME` | `https` (wss) atau `http` (ws) | Vite dan `config/reverb.php` |
| `REVERB_PORT` | Port yang dipakai browser | Vite |
| `REVERB_SERVER_PORT` | Port yang didengar server | `config/reverb.php:33` |
| `REVERB_APP_SECRET` | Verifikasi signature dari client | Keamanan |

### 5.3 Inisialisasi Echo di Frontend

`resources/js/app.tsx:11-13`:

```ts
configureEcho({
    broadcaster: 'reverb',
});
```

Semua kredensial dibaca otomatis dari `import.meta.env.VITE_REVERB_*` oleh `laravel-echo` dan `laravel-reverb`.

### 5.4 Menjalankan Reverb

```bash
# Lokal
php artisan reverb:start --debug

# Produksi (dijalankan oleh Supervisor)
php artisan reverb:start --host=0.0.0.0 --port=8080 --debug
```

Opsi tersedia (`php artisan reverb:start --help`):

```
--host[=HOST]          The IP address the server should bind to
--port[=PORT]          The port the server should listen on
--path[=PATH]          The path the server should prefix to all routes
--hostname[=HOSTNAME]  The hostname the server is accessible from
--debug                Indicates whether debug messages should be displayed
```

### 5.5 Event Broadcast yang Digunakan

Semua event ada di `app/Events/`:

| Event | Channel | Nama Event | Antrean | Dipicu Dari |
|---|---|---|---|---|
| `TicketCreated` | `admin.notifications` (publik) | `.ticket.created` | - (`ShouldBroadcastNow`) | `TicketController`, `TicketApiController`, `InputDataController` |
| `TicketUpdated` | `ticket.{ticket_number}` (publik) + presence `ticket.{id}` | `.ticket.updated` | `broadcasts` | `ReplyToTicket`, `CheckTicketController` |
| `TicketResponseCreated` | `ticket.{ticket_number}` (publik) + presence `ticket.{id}` | `.ticket.response.created` | `broadcasts` | `ReplyToTicket` |
| `InboxUpdated` | private `inbox.laporan-masuk` | `.inbox.updated` | `broadcasts` | `ReplyToTicket`, `CheckTicketController::complete`, `TicketApiController::complete` |
| `InboxChanged` | private `inbox.laporan-masuk` | `.inbox.changed` | `broadcasts` | `AutoCloseTicketsCommand` (1 event per batch) |
| `SessionTerminated` | private `user.{id}` | `.session.terminated` | `broadcasts` | `SessionTerminator` |
| `LoginAttemptBlocked` | private `user.{id}` | `.login.attempt.blocked` | `broadcasts` | `AuthenticatedSessionController` |

> **`admin.notifications` saat ini channel PUBLIK.** Rekomendasi: migrasikan ke `private-admin.notifications` dengan callback di `routes/channels.php`, tapi **jangan diubah tanpa langkah terpisah** karena frontend `useEchoPublic` harus ikut berubah menjadi `useEcho`.

### 5.6 Otorisasi Channel (`routes/channels.php`)

```php
Broadcast::channel('App.Models.User.{id}', fn ($user, $id) => (int) $user->id === (int) $id);

Broadcast::channel('user.{userId}', function (User $user, int $userId) {
    if ((int) $user->id !== $userId) return false;
    return $user->is_active === true;
});

Broadcast::channel('ticket.{ticketId}', function (User $user, int $ticketId) {
    if (! ($user->isAdmin() || $user->isOperator())) return false;
    if (! Ticket::whereKey($ticketId)->exists()) return false;
    return ['id' => $user->id, 'name' => $user->name, 'role' => $user->role->value];
});

Broadcast::channel('inbox.{scope}', function (User $user, string $scope) {
    if (! in_array($scope, ['laporan-masuk'], true)) return false;
    return $user->isAdmin() || $user->isOperator();
});
```

Endpoint `/broadcasting/auth` **sudah terdaftar** otomatis oleh Laravel 12 (`withRouting(channels: ...)` yang memanggil `withBroadcasting()`).

### 5.7 Endpoint Autentikasi Channel

```bash
curl -i http://127.0.0.1:8000/broadcasting/auth
# HTTP/1.1 401 Unauthorized  <- ini NORMAL untuk tamu
```

Private dan presence channel butuh session login yang valid.

---

## 6. Queue Worker

### 6.1 Kenapa Wajib

- Semua event `ShouldBroadcast` masuk antrean `broadcasts`.
- Notifikasi email (`SendTicketResponseNotification`) masuk antrean `default`.
- **Kalau worker mati, realtime mati**: toast, badge, dan baris realtime tidak muncul.

### 6.2 Perintah

```bash
# WAJIB menyertakan antrean broadcasts
php artisan queue:work --queue=broadcasts,default --tries=3 --backoff=5 --max-time=3600
```

Atau mode pengembangan:

```bash
php artisan queue:listen --tries=1
```

> `php artisan queue:work` **tanpa** `--queue=broadcasts,default` hanya memproses antrean `default`. Broadcast **tidak akan terkirim** karena event memakai `public string $queue = 'broadcasts'`.

### 6.3 Antrean yang Terpakai

| Antrean | Isi | Event/Job |
|---|---|---|
| `broadcasts` | Broadcast realtime | Semua `App\Events\*` kecuali `TicketCreated` |
| `default` | Notifikasi email | `SendTicketResponseNotification` |

### 6.4 Monitoring

```bash
# Lihat antrean tertunda
php artisan tinker --execute="echo Redis::llen('queues:default');"

# Monitor langsung
php artisan queue:monitor default,100 --timeout=60
```

---

## 7. Scheduler

### 7.1 Job Terjadwal (`routes/console.php`)

| Command | Frekuensi | Tujuan |
|---|---|---|
| `tickets:auto-close` | `*/15 * * * *` (setiap 15 menit) | Menutup tiket yang dijawab petugas tapi tidak dijawab pelapor |
| `sessions:cleanup` | `* * * * *` (setiap menit) | Membersihkan `current_session_id` sesi basi |
| `auth:prune-logs` | `15 2 * * *` (setiap hari 02:15) | Memangkas `auth_logs` sesuai retensi |

Konfigurasi `tickets:auto-close`:

```php
Schedule::command('tickets:auto-close')
    ->everyFifteenMinutes()
    ->timezone('Asia/Jakarta')
    ->onOneServer()          // butuh CACHE_STORE=redis
    ->withoutOverlapping(10)
    ->onFailure(fn (string $message) => Log::error('Jadwal tickets:auto-close gagal.', ['message' => $message]));
```

### 7.2 Verifikasi

```bash
php artisan schedule:list
```

Output yang diharapkan:

```
  */15 * * * *  php artisan tickets:auto-close
  *    * * * *  php artisan sessions:cleanup
  15   2 * * *  php artisan auth:prune-logs
```

### 7.3 Menjalankan Manual

```bash
# Lihat kandidat tanpa mengubah data
php artisan tickets:auto-close --dry-run

# Batasi jumlah tiket
php artisan tickets:auto-close --limit=50

# Bersihkan sesi basi
php artisan sessions:cleanup
```

### 7.4 Lock Scheduler

`withoutOverlapping()` memakai `cache` lock. Karena `CACHE_STORE=redis`, `onOneServer()` aman dipakai: hanya satu node menjalankan task tersebut.

---

## 8. Supervisor (Produksi)

Supervisor menggantikan `composer dev` di produksi: menjalankan **queue worker** dan **Reverb server** sebagai daemon yang auto-restart.

### 8.1 Instalasi

```bash
sudo apt install -y supervisor
sudo systemctl enable --now supervisor
```

### 8.2 Konfigurasi `/etc/supervisor/conf.d/melati.conf`

```ini
; ==========================================================
;  Aplikasi Melati - Queue Worker dan Laravel Reverb
; ==========================================================

[program:melati-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/bps-melati/artisan queue:work --queue=broadcasts,default --tries=3 --backoff=5 --max-time=3600
directory=/var/www/bps-melati
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/bps-melati/storage/logs/worker.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
stopwaitsecs=120

[program:melati-reverb]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/bps-melati/artisan reverb:start --host=0.0.0.0 --port=8080 --debug
directory=/var/www/bps-melati
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/bps-melati/storage/logs/reverb.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
stopwaitsecs=30
```

> **`numprocs=2` pada worker** - menjalankan 2 proses queue agar broadcast tidak menumpuk ketika banyak petugas membalas bersamaan. Semua event sudah `ShouldDispatchAfterCommit` dengan `queue='broadcasts'`, jadi aman dijalankan paralel.

> **`user=www-data`** - sesuaikan dengan owner folder proyek: `chown -R www-data:www-data /var/www/bps-melati`.

> **`stopwaitsecs=120` pada worker** memastikan job yang sedang berjalan (mis. kirim email) selesai sebelum proses dihentikan. Reverb cukup 30 detik karena stateless.

### 8.3 Validasi Log Reverb

Reverb gagal start bila port 8080 sudah dipakai. Cek sebelum restart:

```bash
sudo ss -tlnp | grep 8080
```

### 8.4 Aktifkan dan Kelola

```bash
# Validasi konfigurasi
sudo supervisorctl reread
sudo supervisorctl update

# Status
sudo supervisorctl status
```

Output yang diharapkan:

```
melati-worker:0    RUNNING   pid 12345, uptime 1:02:33
melati-worker:1    RUNNING   pid 12346, uptime 1:02:33
melati-reverb:0    RUNNING   pid 12347, uptime 1:02:33
```

```bash
# Restart setelah update kode
sudo supervisorctl restart melati-worker:*
sudo supervisorctl restart melati-reverb:*

# Melihat log
sudo supervisorctl tail -f melati-reverb:*
sudo supervisorctl tail -f melati-worker:*
```

### 8.5 Melihat Log

```bash
tail -f /var/www/bps-melati/storage/logs/laravel-*.log   # log aplikasi
tail -f /var/www/bps-melati/storage/logs/reverb.log     # log WebSocket
tail -f /var/www/bps-melati/storage/logs/worker.log     # log queue
```

---

## 9. Nginx + PHP-FPM (Produksi)

### 9.1 Site `/etc/nginx/sites-available/melati`

```nginx
server {
    listen 80;
    server_name melati.example.id www.melati.example.id;
    root /var/www/bps-melati/public;

    # WAJIB: batas ukuran unggahan lampiran
    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    # Aset build Vite (nama file di-hash, aman di-cache lama)
    location ^~ /build/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Lampiran: DILARANG dilayani langsung sebagai file statis publik.
    # Halaman /check memakai signed URL, jadi /storage harus lewat PHP.
    location ^~ /storage/ {
        expires 1y;
        access_log off;
        try_files $uri =404;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT   $realpath_root;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    # WebSocket Reverb: PROXY ke port 8080
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering off;
    }

    # Autentikasi channel Laravel
    location /broadcasting/auth {
        try_files $uri $uri/ /index.php?$query_string;
    }

    error_page 404 /index.php;
    error_page 500 502 503 504 /index.php;

    access_log /var/log/nginx/melati.access.log;
    error_log  /var/log/nginx/melati.error.log;
}

# Redirect HTTP ke HTTPS
server {
    listen 80;
    server_name melati.example.id www.melati.example.id;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name melati.example.id www.melati.example.id;
    root /var/www/bps-melati/public;

    ssl_certificate     /etc/letsencrypt/live/melati.example.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/melati.example.id/privkey.pem;

    client_max_body_size 10M;

    include /etc/nginx/snippets/nginx-ssl.conf;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ^~ /build/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ^~ /storage/ {
        expires 1y;
        access_log off;
        try_files $uri =404;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT   $realpath_root;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    # WebSocket Reverb via TLS
    location /app {
        proxy_pass https://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    error_page 404 /index.php;
    error_page 500 502 503 504 /index.php;
}
```

### 9.2 Perintah Nginx

```bash
sudo ln -s /etc/nginx/sites-available/melati /etc/nginx/sites-enabled/
sudo nginx -t                       # wajib keluar "syntax is ok"
sudo systemctl reload nginx

# Sertifikat SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d melati.example.id -d www.melati.example.id
```

### 9.3 PHP-FPM

```bash
sudo systemctl enable --now php8.2-fpm

sudo nano /etc/php/8.2/fpm/conf.d/99-melati.ini
```

Isi `99-melati.ini`:

```ini
memory_limit = 256M
upload_max_filesize = 8M
post_max_size = 10M
max_execution_time = 120
```

```bash
sudo systemctl restart php8.2-fpm
```

---

## 10. Cron (Produksi)

Laravel 12 memakai **satu cron** yang memanggil `schedule:run` setiap menit.

```bash
sudo crontab -u www-data -e
```

Isi:

```cron
* * * * * cd /var/www/bps-melati && php artisan schedule:run >> /dev/null 2>&1
```

Verifikasi:

```bash
sudo crontab -u www-data -l

# pastikan jalan
grep CRON /var/log/syslog | tail -5
```

> **Scheduler TIDAK boleh dijalankan oleh Supervisor** - cukup cron. Menjalankannya dua kali akan memicu guard `withoutOverlapping()`, tetapi cron adalah cara yang benar.

---

## 11. Broadcast Channel dan Event

### 11.1 Frontend Listener (`resources/js/`)

| File | Channel | Hook | Event |
|---|---|---|---|
| `components/app-sidebar.tsx` | `admin.notifications` (publik) | `useEchoPublic` | `.ticket.created` |
| `components/app-sidebar.tsx` | `inbox.laporan-masuk` (private) | `useEcho` | `.inbox.updated`, `.inbox.changed` |
| `components/app-header.tsx` | `admin.notifications` (publik) | `useEchoPublic` | `.ticket.created` |
| `pages/admin/hooks/use-inbox-realtime.ts` | `inbox.laporan-masuk` (private) | `useEcho` | `.inbox.updated`, `.inbox.changed` |
| `pages/admin/laporan-masuk/components/use-ticket-realtime.ts` | presence `ticket.{id}` | `useEchoPresence` | `.ticket.response.created`, `.ticket.updated` |
| `pages/check.tsx` | `ticket.{ticket_number}` (publik) | `useEchoPublic` | `.ticket.updated` |
| `hooks/use-session-guard.ts` (dari `session-provider.tsx`) | `user.{id}` (private) | `useEcho` | `.session.terminated`, `.login.attempt.blocked` |

### 11.2 Alur Realtime Laporan Masuk

```
Tiket baru masuk (web / API / Input Data)
        |
        v
TicketCreated::dispatch()  --> channel PUBLIK admin.notifications
        |                             |
        |                             v
        |              Browser A dan B menerima event
        |                             |
        |                             v
        |              useEchoPublic('.ticket.created')
        |                 |-- toast "Laporan Masuk Baru"
        |                 `-- router.reload(only: ['tickets','counts','inbox_open_count'])
        |                             |
        |                             v
        |              Badge sidebar dan angka tab ikut naik
        |
Auto close (cron tiap 15 menit)
        |
        v
AutoCloseTicketsCommand --> InboxChanged::dispatch('auto_closed', [...])
                                     |
                                     v
                     useEcho('.inbox.changed') --> router.reload(...)
                                     |
                                     v
                     Baris hilang dari Laporan Masuk, badge turun
```

### 11.3 Debug Kanal

```bash
# Cek channel yang di-broadcast
tail -f storage/logs/reverb.log

# Cek antrean broadcast
redis-cli llen queues:broadcasts
redis-cli lrange queues:default 0 -1
```

---

## 12. Validasi dan Troubleshooting

### 12.1 Checklist Validasi Cepat

```bash
# 1. Konfigurasi aktif
php artisan about | grep -A 12 "Drivers"

# 2. Broadcast = reverb, Queue = redis, Cache = redis, Session = redis
php artisan about

# 3. Jadwal aktif
php artisan schedule:list

# 4. Asset ter-build
ls -la public/build/manifest.json

# 5. Symlink storage
ls -la public/storage

# 6. Reverb dan worker jalan (produksi)
sudo supervisorctl status

# 7. Redis hidup
redis-cli ping
```

### 12.2 Gejala, Penyebab, Solusi

| Gejala | Penyebab | Solusi |
|---|---|---|
| Toast dan badge tidak muncul | Queue worker mati atau tidak listen antrean `broadcasts` | `sudo supervisorctl restart melati-worker:*`; pastikan flag `--queue=broadcasts,default` |
| Toast muncul tapi angka tab basi | `router.reload` tidak menyertakan `counts` | Pastikan `only: ['tickets','counts','inbox_open_count']` |
| WebSocket tidak terhubung | `VITE_REVERB_*` berbeda dengan `REVERB_*` | Samakan `.env`, lalu `npm run build` ulang |
| 403 saat unduh lampiran di `/check` | Symlink storage hilang | `php artisan storage:link` |
| Tautan lampiran "sudah kedaluwarsa" | Signed URL TTL 30 menit habis | Muat ulang halaman `/check` |
| Redis error "notify-keyspace-events" | Reverb scaling tidak menerima pub/sub | `redis-cli config set notify-keyspace-events K$` lalu `systemctl restart redis-server` |
| Broadcast antar-node tidak jalan | `REVERB_SCALING_ENABLED=false` | Set `true` dan pastikan Redis mendukung keyspace |
| Login "akun sedang digunakan" false positive | `SESSION_ACTIVE_THRESHOLD_MINUTES` terlalu kecil | Naikkan ke 5 sampai 10 menit |
| Semua user terlihat online | `last_activity_at` basi tidak dibersihkan | Pastikan cron `sessions:cleanup` jalan |
| Error 419 | Token CSRF kedaluwarsa | Refresh halaman |
| 500 di produksi tanpa detail | `APP_DEBUG=true` | Set `false`, lalu clear cache |
| Reverb gagal start | Port 8080 sudah dipakai proses lain | `sudo ss -tlnp | grep 8080` |

### 12.3 Melihat Error Produksi

```bash
# Laravel log
tail -f storage/logs/laravel-*.log

# Queue worker
sudo supervisorctl tail melati-worker:*

# Reverb
sudo supervisorctl tail melati-reverb:*

# Nginx
sudo tail -f /var/log/nginx/melati.error.log

# Redis
redis-cli monitor
```

---

## 13. Checklist Rilis

```bash
cd /var/www/bps-melati

# 1. Masuk mode maintenance
php artisan down --render="errors::503" --retry=60

# 2. Tarik kode terbaru
git pull origin main

# 3. Update dependency
composer install --no-dev --optimize-autoloader
npm ci

# 4. Build asset (WAJIB - nilai VITE di-inline saat build)
npm run build

# 5. Migrasi database
php artisan migrate --force

# 6. Bersihkan cache lalu cache ulang
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 7. Restart daemon
sudo supervisorctl restart melati-worker:*
sudo supervisorctl restart melati-reverb:*

# 8. Verifikasi
php artisan about | grep -A 12 "Drivers"
sudo supervisorctl status
php artisan schedule:list

# 9. Kembali online
php artisan up
```

---

## 14. Ringkasan Perintah Lokal (Laragon / Windows)

```bash
# Semua sekaligus (server + queue + reverb + vite)
composer dev

# Atau manual:
php artisan serve                          # http://127.0.0.1:8000
php artisan reverb:start --debug            # WebSocket :8080
php artisan queue:listen --tries=1          # queue worker
npm run dev                                 # Vite HMR
php artisan schedule:work                   # scheduler (WAJIB)
```

### Urutan Startup yang Benar

```
1. Redis         ->  redis-cli ping  = PONG
2. MySQL         ->  service aktif
3. php artisan serve
4. php artisan reverb:start --debug
5. php artisan queue:listen --tries=1
6. npm run dev
7. php artisan schedule:work                (terminal terpisah)
```

> **Jika queue worker atau Reverb tidak jalan**, seluruh fitur realtime (toast "Laporan Masuk Baru", badge sidebar otomatis, angka tab, Paksa Logout realtime, session termination) **tidak akan bekerja** - namun aplikasi tetap dapat diakses normal.

---

## 15. Referensi File Kunci

| File | Isi |
|---|---|
| `.env` | Konfigurasi runtime (jangan di-commit) |
| `composer.json:61-64` | Script `dev` (concurrently) |
| `package.json:5-10` | Script npm (`build`, `dev`, `format`, `lint`) |
| `config/reverb.php:29-54` | Konfigurasi server Reverb dan scaling Redis |
| `config/filesystems.php:33-46` | Disk `local` (private) dan `public` |
| `config/session_policy.php:16-41` | Kebijakan satu sesi aktif |
| `config/queue.php:16` | Antrean default |
| `bootstrap/app.php:24-42` | Middleware (`role`, `api.key`, `EnsureSingleSession`) |
| `bootstrap/app.php:43-126` | Exception handler (419, 429, 500, InvalidSignature) |
| `routes/channels.php` | Otorisasi channel broadcast |
| `routes/console.php` | Jadwal `tickets:auto-close`, `sessions:cleanup`, `auth:prune-logs` |
| `resources/js/app.tsx:11-13` | Inisialisasi `configureEcho({ broadcaster: 'reverb' })` |
| `app/Events/*` | Kontrak broadcast (channel dan nama event) |
| `app/Providers/AppServiceProvider.php` | Rate limiter dan invalidasi cache |

---

*Dokumen ini dibuat berdasarkan analisis langsung terhadap kode proyek. Jika ada perubahan konfigurasi (misalnya port Reverb, hostname, atau kebijakan session), perbarui dokumen ini secara bersamaan.*