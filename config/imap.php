<?php

return [
    'default' => 'default',

    'accounts' => [
        'default' => [
            'host'           => env('IMAP_HOST', 'imap.gmail.com'),
            'port'           => env('IMAP_PORT', 993),
            'encryption'     => env('IMAP_ENCRYPTION', 'ssl'),
            'validate_cert'  => env('IMAP_VALIDATE_CERT', true),
            'username'       => env('IMAP_USERNAME'),
            'password'       => env('IMAP_PASSWORD'),
            'protocol'       => 'imap',
        ],
    ],

    'options' => [
        'delimiter' => '/',
        'fetch' => 1,
        'sequence' => 1,
        'fetch_body' => true,
        'fetch_flags' => true,
        'soft_fail' => false,
        'rfc822' => true,
    ],
];