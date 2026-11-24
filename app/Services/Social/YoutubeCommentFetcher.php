<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YoutubeCommentFetcher implements SocialCommentFetcher
{
    public function platform(): string
    {
        return 'youtube';
    }

    public function fetchNewComments(?Carbon $since): array
    {
        $apiKey = (string) config('services.youtube.api_key');
        $channelId = (string) config('services.youtube.channel_id');

        if ($apiKey === '' || $channelId === '') {
            Log::warning('Impor YouTube dilewati: kredensial belum lengkap.', ['platform' => 'youtube']);
            return [];
        }

        $result = [];
        $pageToken = null;

        for ($page = 0; $page < 5; $page++) {
            $params = [
                'part' => 'snippet',
                'allThreadsRelatedToChannelId' => $channelId,
                'order' => 'time',
                'maxResults' => 100,
                'key' => $apiKey,
            ];

            if ($pageToken !== null) {
                $params['pageToken'] = $pageToken;
            }

            try {
                $response = Http::retry(3, 200)->timeout(30)->get(
                    'https://www.googleapis.com/youtube/v3/commentThreads',
                    $params
                );
            } catch (\Throwable $e) {
                Log::warning('Gagal menghubungi YouTube Data API.', [
                    'platform' => 'youtube',
                    'error' => $e->getMessage(),
                ]);
                return $result;
            }

            if ($response->failed()) {
                $this->logHttpError('youtube', $response);
                return $result;
            }

            $items = $response->json('items', []);
            if (! is_array($items)) {
                return $result;
            }

            foreach ($items as $item) {
                $comment = $item['snippet']['topLevelComment'] ?? null;
                $snippet = is_array($comment) ? ($comment['snippet'] ?? []) : [];
                $text = trim((string) ($snippet['textOriginal'] ?? $snippet['textDisplay'] ?? ''));
                if ($text === '') {
                    continue;
                }

                $publishedAt = Carbon::parse((string) ($snippet['publishedAt'] ?? now()->toIso8601String()));
                if ($since !== null && $publishedAt->lessThanOrEqualTo($since)) {
                    continue;
                }

                $commentId = (string) ($comment['id'] ?? $item['id'] ?? '');
                if ($commentId === '') {
                    continue;
                }

                $videoId = (string) ($item['snippet']['videoId'] ?? '');
                $authorChannelId = $snippet['authorChannelId']['value'] ?? null;

                $result[] = new NormalizedSocialComment(
                    platform: 'youtube',
                    externalId: $commentId,
                    externalParentId: $videoId !== '' ? $videoId : null,
                    externalPermalink: $videoId !== ''
                        ? "https://www.youtube.com/watch?v={$videoId}&lc={$commentId}"
                        : null,
                    externalAuthorHandle: $authorChannelId !== null ? (string) $authorChannelId : ($snippet['authorDisplayName'] ?? null),
                    authorName: $snippet['authorDisplayName'] ?? null,
                    content: $text,
                    occurredAt: $publishedAt,
                );
            }

            $pageToken = $response->json('nextPageToken');
            if (! is_string($pageToken) || $pageToken === '') {
                break;
            }
        }

        return $result;
    }

    private function logHttpError(string $platform, \Illuminate\Http\Client\Response $response): void
    {
        $json = $response->json();
        $code = is_array($json) ? ($json['error']['code'] ?? null) : null;
        $message = is_array($json) ? ($json['error']['message'] ?? null) : null;
        $reason = is_array($json) ? ($json['error']['errors'][0]['reason'] ?? null) : null;

        Log::warning('YouTube Data API mengembalikan error.', [
            'platform' => $platform,
            'status' => $response->status(),
            'error_code' => $code,
            'error_reason' => $reason,
            'error_message' => $message !== null ? mb_substr((string) $message, 0, 300) : null,
        ]);
    }
}