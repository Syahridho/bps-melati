<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FacebookCommentFetcher implements SocialCommentFetcher
{
    public function platform(): string
    {
        return 'facebook';
    }

    public function fetchNewComments(?Carbon $since): array
    {
        $pageId = (string) config('services.meta.page_id');
        $token = (string) config('services.meta.page_token');

        if ($pageId === '' || $token === '') {
            Log::warning('Impor Facebook dilewati: kredensial belum lengkap.', ['platform' => 'facebook']);
            return [];
        }

        $result = [];

        try {
            $postsResponse = Http::retry(3, 200)->timeout(30)->get(
                "https://graph.facebook.com/v19.0/{$pageId}/posts",
                [
                    'fields' => 'id,permalink_url,created_time',
                    'limit' => 25,
                    'access_token' => $token,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Gagal menghubungi Facebook Graph API.', [
                'platform' => 'facebook',
                'error' => $e->getMessage(),
            ]);
            return [];
        }

        if ($postsResponse->failed()) {
            $this->logGraphError('facebook', $postsResponse);
            return [];
        }

        $posts = $postsResponse->json('data', []);
        if (! is_array($posts)) {
            return [];
        }

        foreach ($posts as $post) {
            $postId = (string) ($post['id'] ?? '');
            if ($postId === '') {
                continue;
            }

            $postPermalink = $post['permalink_url'] ?? null;

            try {
                $commentsResponse = Http::retry(3, 200)->timeout(30)->get(
                    "https://graph.facebook.com/v19.0/{$postId}/comments",
                    [
                        'fields' => 'id,message,from{id,name},created_time,permalink_url',
                        'limit' => 100,
                        'access_token' => $token,
                    ]
                );
            } catch (\Throwable $e) {
                Log::warning('Gagal mengambil komentar Facebook.', [
                    'platform' => 'facebook',
                    'post_id' => $postId,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }

            if ($commentsResponse->failed()) {
                $this->logGraphError('facebook', $commentsResponse);
                continue;
            }

            $comments = $commentsResponse->json('data', []);
            if (! is_array($comments)) {
                continue;
            }

            foreach ($comments as $comment) {
                $text = trim((string) ($comment['message'] ?? ''));
                if ($text === '') {
                    continue;
                }

                $occurredAt = Carbon::parse((string) ($comment['created_time'] ?? now()->toIso8601String()));
                if ($since !== null && $occurredAt->lessThanOrEqualTo($since)) {
                    continue;
                }

                $commentId = (string) ($comment['id'] ?? '');
                if ($commentId === '') {
                    continue;
                }

                $from = is_array($comment['from'] ?? null) ? $comment['from'] : [];

                $result[] = new NormalizedSocialComment(
                    platform: 'facebook',
                    externalId: $commentId,
                    externalParentId: $postId,
                    externalPermalink: $comment['permalink_url'] ?? $postPermalink,
                    externalAuthorHandle: isset($from['id']) ? (string) $from['id'] : null,
                    authorName: $from['name'] ?? null,
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

        Log::warning('Facebook Graph API mengembalikan error.', [
            'platform' => $platform,
            'status' => $response->status(),
            'error_code' => $error['code'] ?? null,
            'error_type' => $error['type'] ?? null,
            'error_message' => isset($error['message']) ? mb_substr((string) $error['message'], 0, 300) : null,
        ]);
    }
}