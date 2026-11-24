<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'youtube' => [
        'api_key' => env('YOUTUBE_API_KEY'),
        'channel_id' => env('YOUTUBE_CHANNEL_ID'),
    ],

    'meta' => [
        'page_id' => env('META_PAGE_ID'),
        'ig_user_id' => env('META_IG_USER_ID'),
        'page_token' => env('META_PAGE_TOKEN'),
        'ig_username' => env('META_IG_USERNAME'),
    ],

    'social_import' => [
        'enabled' => env('SOCIAL_IMPORT_ENABLED', true),
        'default_classification' => env('SOCIAL_IMPORT_DEFAULT_CLASSIFICATION', 'pengaduan'),
    ],

];
