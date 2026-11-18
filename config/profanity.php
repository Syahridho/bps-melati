<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Daftar kata kasar yang akan disamarkan (huruf kecil, tanpa imbuhan,
    | tanpa angka pengganti).
    |--------------------------------------------------------------------------
    |
    | Isi starter list kata kasar bahasa Indonesia yang umum. Bentuk
    | berimbuhan yang sering muncul dimasukkan sebagai entri terpisah, karena
    | regex di ProfanityFilter hanya mencocokkan kata utuh (dengan batas kata).
    | Pemilik sistem dapat menambah atau mengurangi daftar ini sendiri, baik
    | langsung di berkas ini maupun (nanti) melalui menu Pengaturan.
    |
    */

    'words' => [
        'anjing', 'anjinglah', 'anjinya', 'anjingan', 'anjingannya',
        'bangsat', 'bangsatnya',
        'bajingan', 'bajingannya',
        'kontol', 'kontolnya',
        'memek', 'memeknya',
        'pepek', 'pepeknya',
        'titi', 'titinya',
        'brengsek', 'brengseknya',
        'bajul', 'bajulnya',
        'sialan', 'sialannya',
        'puki', 'pukinya',
        'anco', 'ancunya',
        'cuk', 'cuknya',
        'kastro',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pengecualian: kata yang cocok tidak akan ikut disensor (huruf kecil).
    |--------------------------------------------------------------------------
    |
    | Isi dengan kata biasa yang mirip kasar tapi sebenarnya aman, sehingga
    | tidak ikut terjangkap batas kata regex.
    |
    */

    'allowlist' => [],

    /*
    |--------------------------------------------------------------------------
    | Karakter pengganti per huruf yang ditemukan dalam kata kasar.
    |--------------------------------------------------------------------------
    */

    'mask_char' => '*',

];
