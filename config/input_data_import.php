<?php

return [
    /*
    |----------------------------------------------------------------------
    | Model "Input Data" yang sudah ada
    |----------------------------------------------------------------------
    | Tidak membuat migration baru; data disimpan ke tabel/model yang sudah ada.
    */
    'model' => \App\Models\Ticket::class,

    /*
    |----------------------------------------------------------------------
    | Kolom untuk menyimpan kunci sumber (format "platform:external_id")
    |----------------------------------------------------------------------
    */
    'source_column' => 'external_id',

    /*
    |----------------------------------------------------------------------
    | Pemetaan field seragam -> kolom model
    |----------------------------------------------------------------------
    */
    'map' => [
        'external_id' => 'external_id',
        'text' => 'content',
        'author' => 'reporter_name',
        'url' => 'external_permalink',
        'published_at' => 'external_occurred_at',
    ],

    /*
    |----------------------------------------------------------------------
    | Nilai default saat menyimpan
    |----------------------------------------------------------------------
    */
    'defaults' => [
        'classification' => env('SOCIAL_IMPORT_DEFAULT_CLASSIFICATION', 'pengaduan'),
        'status' => 'baru',
        'source_app' => 'admin',
        'is_read' => false,
    ],

    /*
    |----------------------------------------------------------------------
    | Kolom tambahan yang diisi dari data sosmed
    |----------------------------------------------------------------------
    */
    'extra_map' => [
        'platform' => 'external_author_handle', // placeholder, diisi manual di ingest
    ],
];
