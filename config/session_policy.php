<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Kebijakan Satu Sesi Aktif per Akun
    |--------------------------------------------------------------------------
    |
    | Satu akun hanya boleh punya satu sesi web aktif. Sumber kebenaran adalah
    | kolom pada tabel `users` (current_session_id + last_activity_at), bukan
    | tabel `sessions`, karena session driver project ini memakai Redis.
    |
    */

    'single_session' => env('SESSION_SINGLE', true),

    /*
    | Sesi dianggap "aktif" bila last_activity_at lebih baru dari ambang ini.
    | Melewati ambang berarti sesi dianggap basi (stale) dan boleh diganti
    | otomatis tanpa konfirmasi pengguna.
    */
    'active_threshold_minutes' => (int) env('SESSION_ACTIVE_THRESHOLD_MINUTES', 5),

    /*
    | Batas inaktivitas sebelum sesi dianggap berakhir. Nilainya disamakan dengan
    | SESSION_LIFETIME (menit) supaya tidak ada dua sumber kebenaran.
    */
    'inactivity_timeout_minutes' => (int) env('SESSION_INACTIVITY_MINUTES', 120),

    /*
    | Izinkan pengguna mengambil alih sesinya sendiri saat login diblokir.
    | Ambil alih WAJIB menyertakan kredensial valid lagi.
    */
    'allow_takeover' => env('SESSION_ALLOW_TAKEOVER', true),

    /*
    | Selisih minimum sebelum last_activity_at ditulis ulang, supaya tidak
    | menyentuh database pada setiap request.
    */
    'activity_write_throttle_seconds' => (int) env('SESSION_ACTIVITY_WRITE_THROTTLE', 60),

    /*
    |--------------------------------------------------------------------------
    | Token API (Sanctum)
    |--------------------------------------------------------------------------
    |
    | Kebijakan yang dipakai: satu token aktif per akun PER JENIS KLIEN.
    | Token web dan token mobile tidak saling meniadakan; login mobile baru
    | mencabut token mobile lama.
    |
    */
    'token_name_mobile' => env('AUTH_MOBILE_TOKEN_NAME', 'mobile'),

    /*
    | Umur token API dalam menit. null = tidak kedaluwarsa.
    */
    'token_expiration_minutes' => env('AUTH_TOKEN_EXPIRATION', 60 * 24 * 7),

    /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */
    'audit_retention_days' => (int) env('AUTH_LOG_RETENTION_DAYS', 90),

];
