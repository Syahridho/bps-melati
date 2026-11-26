<?php

use App\Jobs\ImportSocialComments;
use App\Models\Channel;
use App\Models\Ticket;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosial-media',
        'is_active' => true,
    ]);

    foreach ([
        'youtube' => 'YouTube',
        'facebook' => 'Facebook',
        'instagram' => 'Instagram',
    ] as $slug => $name) {
        Channel::create([
            'name' => $name,
            'slug' => "sosial-media-{$slug}",
            'parent_id' => $parent->id,
            'is_active' => true,
        ]);
    }

    config(['services.youtube.api_key' => 'TEST-YOUTUBE-KEY']);
    config(['services.youtube.channel_id' => 'UC-SELF']);
    config(['services.meta.page_id' => 'PAGE-SELF']);
    config(['services.meta.page_token' => 'TEST-META-TOKEN']);
    config(['services.meta.ig_user_id' => 'IG-SELF']);
    config(['services.meta.ig_username' => 'bpsriau']);
});

test('youtube comment baru menjadi tiket dengan channel dan field external', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'items' => [
                [
                    'id' => 'thread-1',
                    'snippet' => [
                        'videoId' => 'video-123',
                        'topLevelComment' => [
                            'id' => 'comment-1',
                            'snippet' => [
                                'textOriginal' => 'Pelayanan sangat lambat',
                                'authorDisplayName' => 'Warga',
                                'authorChannelId' => ['value' => 'UC-OTHER'],
                                'publishedAt' => now()->toIso8601String(),
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('youtube');

    $ticket = Ticket::where('external_id', 'comment-1')->first();

    expect($ticket)->not->toBeNull();
    expect($ticket->channel->slug)->toBe('sosial-media-youtube');
    expect($ticket->external_parent_id)->toBe('video-123');
    expect($ticket->external_author_handle)->toBe('UC-OTHER');
    expect($ticket->reporter_name)->toBe('Warga');
    expect($ticket->source_app)->toBe('social_youtube');
    expect($ticket->reporter_email)->toBeNull();
    expect($ticket->ticket_number)->not->toBeEmpty();
});

test('menjalankan impor dua kali tidak membuat duplikat', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'items' => [
                [
                    'id' => 'thread-2',
                    'snippet' => [
                        'videoId' => 'video-999',
                        'topLevelComment' => [
                            'id' => 'comment-2',
                            'snippet' => [
                                'textOriginal' => 'Aspirasi warga',
                                'authorDisplayName' => 'Warga 2',
                                'authorChannelId' => ['value' => 'UC-OTHER2'],
                                'publishedAt' => now()->toIso8601String(),
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('youtube');
    ImportSocialComments::dispatchSync('youtube');

    expect(Ticket::where('external_id', 'comment-2')->count())->toBe(1);
});

test('komentar akun sendiri diabaikan', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'items' => [
                [
                    'id' => 'thread-3',
                    'snippet' => [
                        'videoId' => 'video-3',
                        'topLevelComment' => [
                            'id' => 'comment-self',
                            'snippet' => [
                                'textOriginal' => 'Balasan admin',
                                'authorDisplayName' => 'BPS Riau',
                                'authorChannelId' => ['value' => 'UC-SELF'],
                                'publishedAt' => now()->toIso8601String(),
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('youtube');

    expect(Ticket::where('external_id', 'comment-self')->count())->toBe(0);
});

test('token invalid youtube ditangani tanpa exception', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'error' => [
                'code' => 401,
                'message' => 'API key not valid.',
                'errors' => [['reason' => 'keyInvalid']],
            ],
        ], 401),
    ]);

    ImportSocialComments::dispatchSync('youtube');

    expect(Ticket::count())->toBe(0);
});

test('kuota youtube habis ditangani tanpa exception', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'error' => [
                'code' => 403,
                'message' => 'Quota exceeded.',
                'errors' => [['reason' => 'quotaExceeded']],
            ],
        ], 403),
    ]);

    ImportSocialComments::dispatchSync('youtube');

    expect(Ticket::count())->toBe(0);
});

test('facebook comment baru menjadi tiket', function () {
    Http::fake([
        'graph.facebook.com/v19.0/PAGE-SELF/posts*' => Http::response([
            'data' => [
                ['id' => 'post-1', 'permalink_url' => 'https://facebook.com/post-1'],
            ],
        ], 200),
        'graph.facebook.com/v19.0/post-1/comments*' => Http::response([
            'data' => [
                [
                    'id' => 'fb-comment-1',
                    'message' => 'Informasi dong',
                    'from' => ['id' => 'USER-OTHER', 'name' => 'Warga FB'],
                    'created_time' => now()->toIso8601String(),
                    'permalink_url' => 'https://facebook.com/comment-1',
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('facebook');

    $ticket = Ticket::where('external_id', 'fb-comment-1')->first();
    expect($ticket)->not->toBeNull();
    expect($ticket->channel->slug)->toBe('sosial-media-facebook');
    expect($ticket->external_parent_id)->toBe('post-1');
});

test('facebook token invalid (code 190) ditangani tanpa exception', function () {
    Http::fake([
        'graph.facebook.com/v19.0/PAGE-SELF/posts*' => Http::response([
            'error' => [
                'code' => 190,
                'type' => 'OAuthException',
                'message' => 'Invalid OAuth access token.',
            ],
        ], 400),
    ]);

    ImportSocialComments::dispatchSync('facebook');

    expect(Ticket::count())->toBe(0);
});

test('instagram comment baru menjadi tiket', function () {
    config(['services.meta.ig_user_id' => 'IG-SELF']);

    Http::fake([
        'graph.facebook.com/v19.0/IG-SELF/media*' => Http::response([
            'data' => [
                ['id' => 'media-1', 'permalink' => 'https://instagram.com/p/1'],
            ],
        ], 200),
        'graph.facebook.com/v19.0/media-1/comments*' => Http::response([
            'data' => [
                [
                    'id' => 'ig-comment-1',
                    'text' => 'Apa syarat mengajukan konsultasi statistik?',
                    'username' => 'warga_ig',
                    'timestamp' => now()->toIso8601String(),
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('instagram');

    $ticket = Ticket::where('external_id', 'ig-comment-1')->first();
    expect($ticket)->not->toBeNull();
    expect($ticket->channel->slug)->toBe('sosial-media-instagram');
    expect($ticket->external_parent_id)->toBe('media-1');
    expect($ticket->external_author_handle)->toBe('warga_ig');
});

test('instagram komentar akun sendiri diabaikan', function () {
    config(['services.meta.ig_user_id' => 'IG-SELF']);

    Http::fake([
        'graph.facebook.com/v19.0/IG-SELF/media*' => Http::response([
            'data' => [
                ['id' => 'media-2', 'permalink' => 'https://instagram.com/p/2'],
            ],
        ], 200),
        'graph.facebook.com/v19.0/media-2/comments*' => Http::response([
            'data' => [
                [
                    'id' => 'ig-self-comment',
                    'text' => 'Balasan admin',
                    'username' => 'bpsriau',
                    'timestamp' => now()->toIso8601String(),
                ],
            ],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('instagram');

    expect(Ticket::where('external_id', 'ig-self-comment')->count())->toBe(0);
});
