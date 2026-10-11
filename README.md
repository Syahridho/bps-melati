# Melati

Aplikasi penanganan konsultasi dan pengaduan untuk Badan Pusat Statistik
Provinsi Riau. Pelapor mengirim laporan secara publik, petugas
memprosesnya di dashboard, dan statusnya bisa dilacak dengan nomor tiket.
Dibangun dengan Laravel dan Inertia, memakai Reverb untuk pembaruan realtime.

## Fitur

- Formulir publik untuk pengaduan, aspirasi, dan permintaan informasi.
- Nomor tiket otomatis dengan pemeriksaan status tanpa perlu login.
- Balasan pelapor dan balasan petugas pada halaman status tiket.
- Penutupan otomatis tiket yang sudah dijawab dan tidak dilanjutkan.
- Dashboard admin dan operator dengan data bulan berjalan.
- Laporan Masuk dan Laporan Selesai dengan pembaruan realtime.
- Input Data untuk petugas mengetikkan tiket secara langsung.
- Rekap bulanan, semesteran, dan tahunan dengan cetak PDF dan ekspor Excel.
- Pengelolaan operator dan pengaturan aplikasi.
- Kebijakan satu sesi aktif per akun.
- API JSON dengan autentikasi API key.

## Teknologi

| Komponen | Versi |
| --- | --- |
| PHP | ^8.2 |
| Laravel | ^12.0 |
| Inertia (server) | ^2.0 |
| Inertia (React) | ^2.0 |
| React | ^19.0 |
| TypeScript | ^5.7 |
| Vite | ^6.0 |
| Tailwind CSS | ^4.0 |
| shadcn/ui | berbasis Radix UI |
| Reverb | ^1.0 |
| Predis | ^3.6 |
| MySQL | 8.0 atau lebih baru |
| Sanctum | ^4.0 |
| Pest | ^3.8 |

## Peran pengguna

Admin dan operator memakai halaman yang sama dengan hak akses berbeda.
Tidak ada pendaftaran mandiri; akun dibuat oleh admin.

| Kemampuan | Admin | Operator |
| --- | --- | --- |
| Dashboard, Input Data, Laporan Masuk, Laporan Selesai, rekap | Ya | Ya |
| Balas tiket dan ubah status | Ya | Ya |
| Kelola operator (tambah, ubah, hapus) | Ya | Tidak |
| Paksa logout akun lain | Ya | Tidak |
| Ubah dan hapus tiket | Ya | Tidak |
| Pengaturan aplikasi | Ya | Tidak |

Otorisasi diterapkan pada route middleware `role:admin` dan
`role:operator`, pada Form Request, dan sebagian pada pemeriksaan langsung di
controller.

## Prasyarat

| Kebutuhan | Versi atau catatan |
| --- | --- |
| PHP | 8.2 atau lebih baru |
| Ekstensi PHP | ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, pdo, pdo_mysql, session, tokenizer, xml |
| Composer | 2.x |
| Node.js | 20 atau lebih baru |
| npm | 10 atau lebih baru |
| MySQL | 8.0 atau lebih baru |
| Redis | 6 atau lebih baru |
| Git | versi terbaru |

Tambahan untuk VPS:

| Kebutuhan | Catatan |
| --- | --- |
| Nginx | reverse proxy untuk HTTP dan WebSocket |
| PHP-FPM | versi sama dengan PHP yang dipakai lokal |
| Supervisor | menjalankan worker antrean dan server Reverb |
| Certbot | issued sertifikat TLS |

## Instalasi lokal (Windows dan Laragon)

1. Siapkan Laragon dengan Apache atau Nginx, PHP 8.2 atau lebih baru, MySQL,
   dan Redis. Aktifkan ekstensi PHP yang dipakai aplikasi dari menu
   `php.ini`.

2. Klon repositori ke direktori web Laragon.

   ```bash
   git clone <url_repositori> C:\laragon\www\melati
   cd C:\laragon\www\melati
   ```

3. Pasang dependensi PHP dan JavaScript.

   ```bash
   composer install
   npm install
   ```

4. Salin berkas contoh lalu ganti nilainya. Nilai bawaan `.env.example`
   memakai SQLite dan driver broadcast `log`, keduanya perlu diganti untuk
   instalasi sebenarnya.

   ```powershell
   Copy-Item .env.example .env
   ```

5. Buat application key.

   ```bash
   php artisan key:generate
   ```

6. Buat basis data melalui phpMyAdmin atau perintah MySQL.

   ```sql
   CREATE DATABASE melati_bps CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

7. Isi bagian `DB_*`, `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION`, dan
   `BROADCAST_CONNECTION` pada `.env`. Rinciannya ada di bagian Konfigurasi
   `.env`.

8. Jalankan migrasi dan seeder. Seeder membuat kanal, pengaturan, serta satu
   akun admin dan satu akun operator. Nilai email dan sandi akun tersebut
   dibaca dari `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPERATOR_EMAIL`, dan
   `OPERATOR_PASSWORD`.

   ```bash
   php artisan migrate --seed
   ```

9. Buat symlink penyimpanan publik.

   ```bash
   php artisan storage:link
   ```

10. Atur Redis lokal agar melaporkan keyspace event, agar fitur realtime
    bekerja.

    ```redis
    notify-keyspace-events K$
    ```

11. Isi `REVERB_APP_KEY`, `REVERB_APP_SECRET`, dan `REVERB_APP_ID` pada `.env`.
    Server lokal memakai `REVERB_SCHEME=http` dan `REVERB_HOST=localhost`.

### Menjalankan aplikasi

Jalankan satu perintah untuk menyalakan web server, worker antrean, server
Reverb, dan Vite sekaligus.

```bash
composer dev
```

Jika dijalankan terpisah, buka empat terminal dan jalankan sesuai urutan
berikut: aplikasi harus siap menerima request HTTP, lalu worker dan Reverb
dinyalakan, lalu Vite.

```bash
php artisan serve
php artisan reverb:start
php artisan queue:listen --queue=broadcasts,default --tries=1
npm run dev
```

Scheduler dijalankan terpisah karena dipakai untuk penutupan otomatis tiket
dan pembersihan sesi.

```bash
php artisan schedule:work
```

Catatan: tanpa worker antrean dan tanpa server Reverb, fitur realtime tidak
berjalan. Notifikasi email dan pemangkasan log autentikasi juga dijalankan
worker.

## Instalasi di VPS (Ubuntu 22.04 atau 24.04)

1. Pasang paket sistem.

   ```bash
   sudo apt update
   sudo apt install -y git unzip curl redis-server supervisor nginx \
     php8.2-fpm php8.2-cli php8.2-mysql php8.2-mbstring php8.2-xml \
     php8.2-curl php8.2-zip php8.2-bcmath php8.2-intl
   ```

2. Buat grup dan pengguna khusus aplikasi, lalu beri izin folder.

   ```bash
   sudo addgroup --system app
   sudo adduser --system --group --home /var/www/melati app
   sudo chown -R app:app /var/www/melati
   ```

3. Klon repositori sebagai pengguna `app`.

   ```bash
   sudo -u app git clone <url_repositori> /var/www/melati
   cd /var/www/melati
   ```

4. Pasang dependensi produksi.

   ```bash
   sudo -u app composer install --no-dev --optimize-autoloader
   sudo -u app npm ci
   sudo -u app npm run build
   ```

5. Buat `.env` produksi. Salin dari `.env.example` lalu ganti nilainya.

   ```dotenv
   APP_NAME=Melati
   APP_ENV=production
   APP_KEY=<hasil_php_artisan_key_generate>
   APP_DEBUG=false
   APP_URL=https://melati.example.id
   API_KEY=<api_key_acak_panjang>

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=melati_bps
   DB_USERNAME=melati
   DB_PASSWORD=<db_password>

   CACHE_STORE=redis
   SESSION_DRIVER=redis
   QUEUE_CONNECTION=redis
   BROADCAST_CONNECTION=reverb
   REDIS_CLIENT=predis
   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379

   REVERB_APP_ID=<reverb_app_id>
   REVERB_APP_KEY=<reverb_app_key>
   REVERB_APP_SECRET=<reverb_app_secret>
   REVERB_HOST=melati.example.id
   REVERB_PORT=443
   REVERB_SCHEME=https
   REVERB_SERVER_HOST=127.0.0.1
   REVERB_SERVER_PORT=8080
   REVERB_SCALING_ENABLED=true

   VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
   VITE_REVERB_HOST="${REVERB_HOST}"
   VITE_REVERB_PORT="${REVERB_PORT}"
   VITE_REVERB_SCHEME="${REVERB_SCHEME}"

   MAIL_MAILER=smtp
   MAIL_HOST=<host_smtp>
   MAIL_PORT=587
   MAIL_USERNAME=<user_smtp>
   MAIL_PASSWORD=<password_smtp>
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS="contoh@gmail.com"
   MAIL_FROM_NAME="${APP_NAME}"
   ```

6. Buat application key, jalankan migrasi, dan buat symlink penyimpanan.

   ```bash
   sudo -u app php artisan key:generate --force
   sudo -u app php artisan migrate --force
   sudo -u app php artisan db:seed --force
   sudo -u app php artisan storage:link
   ```

7. Perbaiki izin folder yang ditulis runtime.

   ```bash
   sudo chown -R app:app /var/www/melati/storage /var/www/melati/bootstrap/cache
   sudo chmod -R 775 /var/www/melati/storage /var/www/melati/bootstrap/cache
   ```

8. Konfigurasi Redis agar melaporkan keyspace event.

   ```bash
   echo 'notify-keyspace-events K$' | sudo tee /etc/redis/redis.conf.d/melati.conf
   sudo systemctl restart redis-server
   ```

9. Buat blok server Nginx. Dua location untuk WebSocket diperlukan agar
   Reverb dapat dipakai melalui HTTPS.

   ```nginx
   server {
       listen 80;
       server_name melati.example.id;
       root /var/www/melati/public;
       index index.php;

       client_max_body_size 20M;

       location / {
           try_files $uri $uri/ /index.php?$query_string;
       }

       location ~ \.php$ {
           fastcgi_pass unix:/run/php/php8.2-fpm.sock;
           fastcgi_index index.php;
           fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
           fastcgi_param DOCUMENT_ROOT $realpath_root;

           # Header Inertia yang besar memicu "upstream sent too big header".
           fastcgi_buffer_size 32k;
           fastcgi_buffers 16 32k;
           fastcgi_busy_buffers_size 64k;

           include fastcgi_params;
       }

       # WebSocket Reverb: kanal privat dan presence.
       location /app {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_read_timeout 60s;
       }

       # Endpoint auth broadcast Reverb.
       location /apps {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location ~ /\.(?!well-known).* {
           deny all;
       }
   }
   ```

   Aktifkan konfigurasi lalu muat ulang Nginx.

   ```bash
   sudo ln -s /etc/nginx/sites-available/melati /etc/nginx/sites-enabled/melati
   sudo nginx -t
   sudo systemctl reload nginx
   ```

10. Sesuaikan PHP-FPM agar lampiran pada tiket dapat diterima.

    ```ini
    memory_limit = 256M
    upload_max_filesize = 8M
    post_max_size = 20M
    ```

    Terapkan dengan menyunting berkas pool, lalu muat ulang PHP-FPM.

    ```bash
    sudo systemctl reload php8.2-fpm
    ```

11. Jalankan worker antrean dan server Reverb dengan Supervisor. Antrean
    `broadcasts` wajib ikut diproses; tanpa itu realtime tidak berjalan.

    ```ini
    [program:melati-worker]
    process_name=%(program_name)s_%(process_num)02d
    command=php /var/www/melati/artisan queue:work --queue=broadcasts,default --sleep=1 --tries=3 --backoff=5 --max-time=3600
    directory=/var/www/melati
    user=app
    numprocs=2
    autostart=true
    autorestart=true
    stopasgroup=true
    stopwaitsecs=3660
    redirect_stderr=true
    stdout_logfile=/var/www/melati/storage/logs/worker.log

    [program:melati-reverb]
    command=php /var/www/melati/artisan reverb:start
    directory=/var/www/melati
    user=app
    numprocs=1
    autostart=true
    autorestart=true
    stopasgroup=true
    stopwaitsecs=3660
    redirect_stderr=true
    stdout_logfile=/var/www/melati/storage/logs/reverb.log
    ```

    ```bash
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl status
    ```

12. Pasang cron untuk scheduler. Scheduler dijalankan cron, bukan Supervisor.

    ```bash
    sudo crontab -u app -e
    ```

    ```cron
    * * * * * cd /var/www/melati && php artisan schedule:run >> /dev/null 2>&1
    ```

13. Tambahkan sertifikat TLS.

    ```bash
    sudo certbot --nginx -d melati.example.id
    sudo systemctl reload nginx
    ```

14. Bangun cache produksi. Jalankan ulang langkah ini setiap kali `.env`,
    controller, route, view, atau event berubah.

    ```bash
    sudo -u app php artisan config:cache
    sudo -u app php artisan route:cache
    sudo -u app php artisan view:cache
    sudo -u app php artisan event:cache
    ```

## Konfigurasi `.env`

| Variabel | Fungsi | Contoh |
| --- | --- | --- |
| `APP_NAME` | Nama aplikasi yang tampil | `Melati` |
| `APP_ENV` | Mode lingkungan | `production` |
| `APP_KEY` | Kunci enkripsi aplikasi | `<hasil_php_artisan_key_generate>` |
| `APP_DEBUG` | Tampilkan detail exception | `false` di produksi |
| `APP_TIMEZONE` | Zona waktu aplikasi | `Asia/Jakarta` |
| `APP_URL` | Alamat dasar aplikasi | `https://melati.example.id` |
| `API_KEY` | Kunci untuk endpoint `/api` | `<api_key_acak_panjang>` |
| `DB_CONNECTION` | Koneksi basis data | `mysql` |
| `DB_DATABASE` | Nama basis data | `melati_bps` |
| `DB_USERNAME` | Pengguna basis data | `melati` |
| `DB_PASSWORD` | Sandi basis data | `<db_password>` |
| `CACHE_STORE` | Penyimpan cache | `redis` |
| `SESSION_DRIVER` | Penyimpan sesi | `redis` |
| `SESSION_LIFETIME` | Umur sesi dalam menit | `120` |
| `SESSION_SINGLE` | Satu sesi aktif per akun | `true` |
| `SESSION_ACTIVE_THRESHOLD_MINUTES` | Ambang sesi dianggap aktif | `5` |
| `SESSION_INACTIVITY_MINUTES` | Batas inaktivasi, samakan dengan `SESSION_LIFETIME` | `120` |
| `SESSION_ALLOW_TAKEOVER` | Izinkan ambil alih sesi dengan sandi ulang | `true` |
| `QUEUE_CONNECTION` | Koneksi antrean | `redis` |
| `BROADCAST_CONNECTION` | Driver broadcast | `reverb` |
| `REDIS_CLIENT` | Driver Redis | `predis` |
| `REDIS_HOST` | Host Redis | `127.0.0.1` |
| `REVERB_APP_ID` | ID aplikasi Reverb | `<reverb_app_id>` |
| `REVERB_APP_KEY` | Kunci aplikasi Reverb | `<reverb_app_key>` |
| `REVERB_APP_SECRET` | Rahasia aplikasi Reverb | `<reverb_app_secret>` |
| `REVERB_HOST` | Host yang dilihat peramban | `melati.example.id` |
| `REVERB_PORT` | Port WebSocket yang dilihat peramban | `443` |
| `REVERB_SCHEME` | Skema WebSocket | `https` di produksi |
| `REVERB_SERVER_HOST` | Host tempat Reverb dijalankan | `127.0.0.1` |
| `REVERB_SERVER_PORT` | Port tempat Reverb dijalankan | `8080` |
| `VITE_REVERB_APP_KEY` | Harus sama dengan `REVERB_APP_KEY` | `${REVERB_APP_KEY}` |
| `VITE_REVERB_HOST` | Harus sama dengan `REVERB_HOST` | `${REVERB_HOST}` |
| `VITE_REVERB_PORT` | Harus sama dengan `REVERB_PORT` | `${REVERB_PORT}` |
| `VITE_REVERB_SCHEME` | Harus sama dengan `REVERB_SCHEME` | `${REVERB_SCHEME}` |
| `MAIL_MAILER` | Driver email | `smtp` |
| `MAIL_FROM_ADDRESS` | Alamat pengirim | `contoh@gmail.com` |
| `ADMIN_EMAIL` | Email akun admin saat seeder | `<email_admin>` |
| `ADMIN_PASSWORD` | Sandi akun admin saat seeder | `<password_admin>` |
| `OPERATOR_EMAIL` | Email akun operator saat seeder | `<email_operator>` |
| `OPERATOR_PASSWORD` | Sandi akun operator saat seeder | `<password_operator>` |

Nilai `VITE_REVERB_*` dibaca Vite saat build, bukan saat runtime. Bila
`REVERB_APP_KEY`, `REVERB_HOST`, `REVERB_PORT`, atau `REVERB_SCHEME` diubah,
jalankan `npm run build` ulang di server.

Catatan: `APP_TIMEZONE` harus konsisten pada satu instalasi. Nilai bawaan
`.env.example` adalah `Asia/Jakarta`; barcode waktu pada basis data ikut
memakai nilai ini.

## Pembaruan rilis

Jalankan dari direktori aplikasi sebagai pengguna `app`.

```bash
php artisan down
git pull origin <branch>
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo supervisorctl restart melati-worker:*
sudo supervisorctl restart melati-reverb:*
php artisan up
```

Bila `package-lock.json` ikut berubah, gunakan `npm ci` agar versi terkunci
terpasang sesuai berkas tersebut.

## Struktur folder

| Folder | Isi |
| --- | --- |
| `app/` | Controller, model, action, event, job, middleware, dan helper di `Support` |
| `routes/` | Definisi route web, API, console, dan kanal broadcast |
| `database/` | Migrasi, seeder, dan factory |
| `config/` | Konfigurasi framework dan aplikasi |
| `resources/js/components/` | Komponen UI yang dipakai bersama |
| `resources/js/hooks/` | React hooks, termasuk hook realtime |
| `resources/js/lib/` | Konstanta dan fungsi utilitas |
| `resources/js/types/` | Deklarasi tipe TypeScript |
| `resources/js/layouts/` | Layout aplikasi |
| `resources/js/pages/` | Halaman Inertia |

Aturan: `resources/js/pages/` hanya berisi berkas halaman yang dirender Inertia.
Komponen, hook, dan utilitas diletakkan di foldernya masing-masing. Halaman
yang perlu dipecah memakai folder fitur di dalam `pages/`, dan berkas halaman
lama menjadi pembuka yang meng-export komponen di dalamnya.

## Perintah berguna

| Tujuan | Perintah |
| --- | --- |
| Format kode PHP | `vendor/bin/pint` |
| Format kode frontend | `npm run format` |
| Periksa format frontend | `npm run format:check` |
| Lint frontend | `npm run lint` |
| Periksa tipe TypeScript | `npx tsc --noEmit` |
| Jalankan seluruh test | `php artisan test` |
| Jalankan satu berkas test | `php artisan test tests/Feature/CheckTicketTest.php` |
| Lihat jadwal tugas | `php artisan schedule:list` |
| Simulasi penutupan otomatis | `php artisan tickets:auto-close --dry-run` |
| Bersihkan sesi basi | `php artisan sessions:cleanup` |
| Pangkas log autentikasi | `php artisan auth:prune-logs` |
| Status Supervisor | `sudo supervisorctl status` |

Test memakai Pest dan memerlukan basis data MySQL terpisah dengan data awal
sudah tersedia. Jalankan `php artisan test` sebelum menentukan kode siap.

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| 502 dengan log `upstream sent too big header` | Buffer FastCGI terlalu kecil untuk header Inertia | Naikkan `fastcgi_buffer_size` dan `fastcgi_buffers` pada blok PHP-FPM di Nginx, lalu `sudo nginx -t && sudo systemctl reload nginx` |
| Realtime tidak berjalan, badge dan baris tidak berubah | Worker antrean tidak memproses `broadcasts`, atau Reverb mati, atau `VITE_REVERB_*` berbeda dari `REVERB_*` | Periksa `sudo supervisorctl status`, pastikan worker memakai `--queue=broadcasts,default`, pastikan URL WebSocket pada peramban sesuai `VITE_REVERB_*`, lalu `npm run build` ulang bila nilai Reverb berubah |
| 403 saat membuka lampiran | Symlink `public/storage` tidak ada | Jalankan `php artisan storage:link` |
| 419 Halaman kedaluwarsa | Token CSRF tidak lagi valid, sering setelah lama menganggur | Muat ulang halaman lalu ulangi aksi |
| 500 tanpa detail | `APP_DEBUG=false` menyembunyikan pesan exception | Isi log di `storage/logs/laravel.log`, atau aktifkan `APP_DEBUG=true` sementara di lingkungan lokal |
| Kesalahan Redis keyspace notification | `notify-keyspace-events` belum diatur | Tambahkan `notify-keyspace-events K$` ke konfigurasi Redis lalu muat ulang Redis |
| Port 8080 sudah dipakai | Port default Reverb bentrok dengan proses lain | Ubah `REVERB_SERVER_PORT` dan sesuaikan `proxy_pass` pada Nginx |
| Perubahan `.env` tidak terbaca | Cache konfigurasi masih menyimpan nilai lama | Jalankan `php artisan config:clear` lalu `php artisan config:cache` di produksi |

## Keamanan

- Jangan pernah melakukan commit berkas `.env`.
- Gunakan `APP_DEBUG=false` di produksi agar detail exception tidak tampil ke
  pengguna.
- Masuk ke server dengan kunci SSH, bukan sandi.
- Jangan membuka port MySQL dan Redis ke internet. Kedua layanan hanya perlu
 hanya perlu mendengarkan pada `127.0.0.1`.
- Bila `APP_KEY`, `API_KEY`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, atau
  sandi basis data pernah terekspos, ganti seluruhnya sekaligus.
- Cadangkan basis data secara berkala.
- Batasi ukuran unggahan pada Nginx dan PHP-FPM sesuai berkas di bagian
  Instalasi di VPS.

## Lisensi

Hak cipta dilindungi.