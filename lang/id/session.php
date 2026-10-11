<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pesan Error Sesi
    |--------------------------------------------------------------------------
    |
    | Semua teks yang dipakai frontend untuk halaman login & Indicator sesi.
    |
    */

    'terminated_title' => 'Sesi Anda berakhir',

    'terminated_reasons' => [
        'taken_over' => 'Akun ini login di perangkat lain.',
        'forced_logout' => 'Administrator mengakhiri sesi Anda.',
        'deactivated' => 'Akun Anda dinonaktifkan.',
        'password_changed' => 'Password Anda baru saja diubah.',
    ],

    'login_notice' => [
        'taken_over' => 'Sesi Anda berakhir karena akun ini login di perangkat lain.',
        'forced_logout' => 'Sesi Anda berakhir karena administrator mengakhiri sesi Anda.',
        'deactivated' => 'Akun Anda dinonaktifkan. Hubungi administrator.',
        'expired' => 'Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali.',
    ],

    'in_use_title' => 'Akun sedang digunakan',

    'in_use_device_label' => 'Perangkat',
    'in_use_last_active_label' => 'Terakhir aktif',
    'in_use_ip_label' => 'Alamat IP',
    'in_use_unknown_device' => 'Perangkat tidak dikenal',
    'in_use_unknown_agent' => 'Tidak diketahui',

    'takeover_heading' => 'Sesi ini sedang digunakan di tempat lain',
    'takeover_notice' => 'Untuk masuk di sini, sesi di perangkat lain akan dikeluarkan dari sistem. Pastikan Anda memang pemilik akun ini.',
    'takeover_cancel' => 'Batal',
    'takeover_confirm' => 'Keluarkan sesi lain & masuk di sini',
    'takeover_processing' => 'Meng keluarkan sesi lain...',
    'takeover_failed' => 'Gagal mengambil alih sesi. Silakan coba lagi.',
    'takeover_not_allowed' => 'Pengambilan alih sesi tidak diizinkan pada sistem ini.',

];
