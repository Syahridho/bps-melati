<?php

namespace App\Console\Commands;

use App\Jobs\ImportSocialComments;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Services\Social\FacebookCommentFetcher;
use App\Services\Social\InstagramCommentFetcher;
use App\Services\Social\SocialCommentFetcher;
use App\Services\Social\YoutubeCommentFetcher;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ImportSocialCommentsCommand extends Command
{
    protected $signature = 'social:import
        {platform? : youtube|facebook|instagram}
        {--dry-run : Tampilkan komentar yang akan diimpor tanpa mengubah data}
        {--force : Jalankan meskipun impor platform dinonaktifkan}';

    protected $description = 'Impor komentar dari media sosial resmi BPS Riau menjadi tiket Input Data.';

    public function handle(
        YoutubeCommentFetcher $youtube,
        FacebookCommentFetcher $facebook,
        InstagramCommentFetcher $instagram,
    ): int {
        $platforms = $this->argument('platform')
            ? [(string) $this->argument('platform')]
            : ['youtube', 'facebook', 'instagram'];

        foreach ($platforms as $platform) {
            if (! in_array($platform, ['youtube', 'facebook', 'instagram'], true)) {
                $this->error("Platform tidak dikenal: {$platform}");

                return self::FAILURE;
            }

            if (! $this->option('force') && ! $this->enabled($platform)) {
                $this->warn("Impor {$platform} dinonaktifkan. Gunakan --force untuk memaksa.");

                continue;
            }

            $fetcher = $this->fetcher($platform, $youtube, $facebook, $instagram);
            $channel = $this->resolveChannel($platform);

            if ($channel === null) {
                $this->error("Channel sosial untuk {$platform} tidak ditemukan. Jalankan seeder channel.");

                return self::FAILURE;
            }

            $cursorKey = "social_import_{$platform}_last_synced_at";
            $since = $this->parseCursor(Setting::get($cursorKey));

            if ($this->option('dry-run')) {
                $comments = $fetcher->fetchNewComments($since);
                $existingIds = Ticket::query()
                    ->where('channel_id', $channel->id)
                    ->whereIn('external_id', array_map(fn ($c) => $c->externalId, $comments))
                    ->pluck('external_id')
                    ->all();

                $rows = [];
                foreach ($comments as $comment) {
                    $rows[] = [
                        $comment->externalId,
                        $comment->authorName ?: $comment->externalAuthorHandle,
                        $comment->occurredAt->format('Y-m-d H:i'),
                        in_array($comment->externalId, $existingIds, true) ? 'sudah ada' : 'baru',
                        Str::limit($comment->content, 60),
                    ];
                }

                $this->info("Dry run {$platform}: ".count($comments).' komentar ditemukan.');
                $this->table(['External ID', 'Author', 'Waktu', 'Status', 'Konten'], $rows);

                continue;
            }

            $this->info("Mengambil impor {$platform}...");
            ImportSocialComments::dispatchSync($platform);
            $this->info("Impor {$platform} selesai.");
        }

        return self::SUCCESS;
    }

    private function enabled(string $platform): bool
    {
        $value = Setting::get("social_import_{$platform}_enabled");

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
    ): SocialCommentFetcher {
        return match ($platform) {
            'youtube' => $youtube,
            'facebook' => $facebook,
            'instagram' => $instagram,
        };
    }

    private function resolveChannel(string $platform): ?Channel
    {
        $slug = match ($platform) {
            'youtube' => 'sosial-media-youtube',
            'facebook' => 'sosial-media-facebook',
            'instagram' => 'sosial-media-instagram',
        };

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