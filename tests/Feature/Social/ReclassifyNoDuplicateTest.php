<?php

use App\Jobs\ImportSocialComments;
use App\Models\Channel;
use App\Models\Ticket;
use App\Services\Social\RuleRepository;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $parent = Channel::create(['name' => 'Sosial Media', 'slug' => 'sosial-media', 'is_active' => true]);
    Channel::create(['name' => 'YouTube', 'slug' => 'sosial-media-youtube', 'parent_id' => $parent->id, 'is_active' => true]);
    config(['services.youtube.api_key' => 'TEST-YOUTUBE-KEY']);
    config(['services.youtube.channel_id' => 'UC-SELF']);
});

test('komentar dinilai ulang setelah version naik tidak duplikat', function () {
    Http::fake([
        'www.googleapis.com/youtube/v3/commentThreads*' => Http::response([
            'items' => [[
                'id' => 'thread-x',
                'snippet' => [
                    'videoId' => 'video-x',
                    'topLevelComment' => [
                        'id' => 'comment-x',
                        'snippet' => [
                            'textOriginal' => 'Pelayanan lambat sekali',
                            'authorDisplayName' => 'Warga',
                            'authorChannelId' => ['value' => 'UC-OTHER'],
                            'publishedAt' => now()->toIso8601String(),
                        ],
                    ],
                ],
            ]],
        ], 200),
    ]);

    ImportSocialComments::dispatchSync('youtube');
    expect(Ticket::where('external_id', 'comment-x')->count())->toBe(1);

    // Naikkan version aturan.
    app(RuleRepository::class)->save(app(RuleRepository::class)->rules());

    ImportSocialComments::dispatchSync('youtube');
    expect(Ticket::where('external_id', 'comment-x')->count())->toBe(1);
});