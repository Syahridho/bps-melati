<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InstagramCommentFetcher implements SocialCommentFetcher
{
    public function platform(): string
    {
        return 'instagram';
    }

    public function fetchNewComments(?Carbon $since): array
    {
        $igUserId = (string) config('services.meta.ig_user_id');
        $token = (string) config('services.meta.page_token');

        if ($igUserId === '' || $token === '') {
            Log::warning('Impor Instagram dilewati: kredensial belum lengkap.', ['platform' => 'instagram']);
            return [];
        }

        $result = [];

        try {
            $mediaResponse = Http::retry(3, 200)->timeout(30)->get(
                "https://graph.facebook.com/v19.0/{$igUserId}/media",
                [
                    'fields' => 'id,caption,timestamp,permalink',
                    'limit' => 25,
                    'access_token' => $token,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Gagal menghubungi Instagram Graph API.', [
                'platform' => 'instagram',
                'error' => $e->getMessage(),
            ]);
            return [];
        }

        if ($mediaResponse->failed()) {
            $this->logGraphError('instagram', $mediaResponse);
            return [];
        }

        $mediaItems = $mediaResponse->json('data', []);
        if (! is_array($mediaItems)) {
            return [];
        }

        foreach ($mediaItems as $media) {
            $mediaId = (string) ($media['id'] ?? '');
            if ($mediaId === '') {
                continue;
            }

            $mediaPermalink = $media['permalink'] ?? null;

            try {
                $commentsResponse = Http::retry(3, 200)->timeout(30)->get(
                    "https://graph.facebook.com/v19.0/{$mediaId}/comments",
                    [
                        'fields' => 'id,text,username,timestamp',
                        'limit' => 100,
                        'access_token' => $token,
                    ]
                );
            } catch (\Throwable $e) {
                Log::warning('Gagal mengambil komentar Instagram.', [
                    'platform' => 'instagram',
                    'media_id' => $mediaId,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }

            if ($commentsResponse->failed()) {
                $this->logGraphError('instagram', $commentsResponse);
                continue;
            }

            $comments = $commentsResponse->json('data', []);
            if (! is_array($comments)) {
                continue;
            }

            foreach ($comments as $comment) {
                $text = trim((string) ($comment['text'] ?? ''));
                if ($text === '') {
                    continue;
                }

                $occurredAt = Carbon::parse((string) ($comment['timestamp'] ?? now()->toIso8601String()));
                if ($since !== null && $occurredAt->lessThanOrEqualTo($since)) {
                    continue;
                }

                $commentId = (string) ($comment['id'] ?? '');
                if ($commentId === '') {
                    continue;
                }

                $username = $comment['username'] ?? null;

                $result[] = new NormalizedSocialComment(
                    platform: 'instagram',
                    externalId: $commentId,
                    externalParentId: $mediaId,
                    externalPermalink: $mediaPermalink,
                    externalAuthorHandle: $username !== null ? (string) $username : null,
                    authorName: $username !== null ? (string) $username : null,
                    content: $text,
                    occurredAt: $occurredAt,
                );
            }
        }

        return $result;
    }

    private function logGraphError(string $platform, \Illuminate\Http\Client\Response $response): void
    {
        $json = $response->json();
        $error = is_array($json) && isset($json['error']) && is_array($json['error']) ? $json['error'] : [];

        Log::warning('Instagram Graph API mengembalikan error.', [
            'platform' => $platform,
            'status' => $response->status(),
            'error_code' => $error['code'] ?? null,
            'error_type' => $error['type'] ?? null,
            'error_message' => isset($error['message']) ? mb_substr((string) $error['message'], 0, 300) : null,
        ]);
    }
}