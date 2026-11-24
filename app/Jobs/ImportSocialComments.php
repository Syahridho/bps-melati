<?php

namespace App\Jobs;

use App\Models\Channel;
use App\Models\Setting;
use App\Services\Social\FacebookCommentFetcher;
use App\Services\Social\InstagramCommentFetcher;
use App\Services\Social\SocialCommentFetcher;
use App\Services\Social\SocialCommentImporter;
use App\Services\Social\YoutubeCommentFetcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ImportSocialComments implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public string $platform)
    {
        $this->onQueue('default');
    }

    public function handle(
        SocialCommentImporter $importer,
        YoutubeCommentFetcher $youtube,
        FacebookCommentFetcher $facebook,
        InstagramCommentFetcher $instagram,
    ): void {
        $platform = $this->platform;

        if (! $this->enabled($platform)) {
            Log::info('Impor komentar sosial dinonaktifkan.', ['platform' => $platform]);
            return;
        }

        $fetcher = $this->fetcher($platform, $youtube, $facebook, $instagram);
        if ($fetcher === null) {
            Log::warning('Platform impor sosial tidak dikenal.', ['platform' => $platform]);
            return;
        }

        $channel = $this->resolveChannel($platform);
        if ($channel === null) {
            Log::warning('Channel sosial tidak ditemukan di database.', ['platform' => $platform]);
            return;
        }

        $cursorKey = "social_import_{$platform}_last_synced_at";
        $since = $this->parseCursor(Setting::get($cursorKey));

        try {
            $comments = $fetcher->fetchNewComments($since);
            $created = $importer->import($platform, $channel, $comments, $since);

            $latest = $since;
            foreach ($comments as $comment) {
                if ($latest === null || $comment->occurredAt->greaterThan($latest)) {
                    $latest = $comment->occurredAt;
                }
            }
            if ($latest === null) {
                $latest = now();
            }

            Setting::set($cursorKey, $latest->toIso8601String());

            Log::info('Impor komentar sosial selesai.', [
                'platform' => $platform,
                'fetched' => count($comments),
                'created' => $created,
            ]);
        } catch (\Throwable $e) {
            Log::error('Impor komentar sosial gagal.', [
                'platform' => $platform,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function enabled(string $platform): bool
    {
        $settingKey = "social_import_{$platform}_enabled";
        $value = Setting::get($settingKey);

        if ($value === null) {
            return (bool) config('services.social_import.enabled', true);
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function fetcher(
        string $platform,
        YoutubeCommentFetcher $youtube,
        FacebookCommentFetcher $facebook,
        InstagramCommentFetcher $instagram,
    ): ?SocialCommentFetcher {
        return match ($platform) {
            'youtube' => $youtube,
            'facebook' => $facebook,
            'instagram' => $instagram,
            default => null,
        };
    }

    private function resolveChannel(string $platform): ?Channel
    {
        $slug = match ($platform) {
            'youtube' => 'sosial-media-youtube',
            'facebook' => 'sosial-media-facebook',
            'instagram' => 'sosial-media-instagram',
            default => null,
        };

        if ($slug === null) {
            return null;
        }

        return Channel::where('slug', $slug)->first();
    }

    private function parseCursor(?string $value): ?Carbon
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}