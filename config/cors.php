<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Aturan ini menentukan asal mana yang boleh mengakses endpoint API
    | dari luar domain aplikasi. Jangan pernah menggunakan '*' untuk
    | allowed_origins di produksi kecuali sengaja membuka API ke umum.
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
    | Daftar asal yang diizinkan. Diisi dari CORS_ALLOWED_ORIGINS di .env,
    | dipisah koma. Kosong = tidak ada asal yang diizinkan (fail closed).
    */
    'allowed_origins' => env('CORS_ALLOWED_ORIGINS')
        ? array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS')))
        : [],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
