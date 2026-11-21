<?php

return [

    'ip_match_window_minutes' => env('AUDIT_IP_MATCH_WINDOW', 60),

    'flags' => [

        'jaringan_sama' => [
            'enabled' => true,
            'threshold' => 1,
            'window_minutes' => 60,
        ],

        'rating_cepat' => [
            'enabled' => true,
            'threshold' => 2,
            'window_minutes' => 5,
        ],

        'rating_beruntun_ip' => [
            'enabled' => true,
            'threshold' => 3,
            'window_minutes' => 60,
        ],

        'login_gagal_berulang' => [
            'enabled' => true,
            'threshold' => 3,
            'window_minutes' => 15,
        ],

    ],

    'retention_days' => [

        'audit_logs' => env('AUDIT_LOGS_RETENTION_DAYS', 90),
        'audit_flags' => env('AUDIT_FLAGS_RETENTION_DAYS', 365),

    ],

    'export' => [

        'max_rows' => env('AUDIT_EXPORT_MAX_ROWS', 10000),
        'max_rows_per_session' => env('AUDIT_EXPORT_MAX_PER_SESSION', 500),

    ],

    'ignored_networks' => [

    ],

    'ignore_private_ips' => env('AUDIT_IGNORE_PRIVATE_IPS', true),

];