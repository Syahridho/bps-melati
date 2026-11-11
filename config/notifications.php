<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notifikasi Realtime
    |--------------------------------------------------------------------------
    |
    | Opsi ini mengontrol apakah notifikasi realtime (database + broadcast)
    | dikirim saat tiket dibuat, diubah, diselesaikan, atau dibalas pelapor.
    | Nonaktifkan saat menjalankan seeder/import massal untuk menghindari
    | ribuan notifikasi dobel yang membanjiri antrean broadcasts.
    */

    'enabled' => env('NOTIFICATIONS_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Deduplikasi Notifikasi
    |--------------------------------------------------------------------------
    |
    | Jika true, notifikasi dengan kombinasi (tipe, ticket_number, penerima)
    | yang sama hanya akan dikirim sekali dalam jendela waktu yang ditentukan
    | di bawah ini. Digunakan untuk mencegah notifikasi dobel saat event
    | yang sama terpicu beberapa kali.
    */

    'dedup_enabled' => env('NOTIFICATION_DEDUP_ENABLED', true),

    /*
    | Jendela waktu (detik) untuk dedup. Notifikasi yang sama dalam jendela
    | ini akan dianggap duplikat dan tidak dikirim ulang.
    */

    'dedup_ttl_seconds' => (int) env('NOTIFICATION_DEDUP_TTL_SECONDS', 300),

];
