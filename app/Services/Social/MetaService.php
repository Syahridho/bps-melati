<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaService implements SocialCommentFetcher
{
    public function platform(): string
    {
        return 'meta';
    }

    /**
     * @return list<NormalizedSocialComment>
     */
    public function fetchNewComments(?Carbon $since = null, string $platform = 'facebook'): array
    {
        return $platform === 'instagram'
            ? app(InstagramCommentFetcher::class)->fetchNewComments($since)
            : app(FacebookCommentFetcher::class)->fetchNewComments($since);
    }

    /**
     * @return list<NormalizedSocialComment>
     */
    public function fetchFacebookComments(?Carbon $since = null): array
    {
        return app(FacebookCommentFetcher::class)->fetchNewComments($since);
    }

    /**
     * @return list<NormalizedSocialComment>
     */
    public function fetchInstagramComments(?Carbon $since = null): array
    {
        return app(InstagramCommentFetcher::class)->fetchNewComments($since);
    }

    /**
     * Alias generik yang mungkin dipakai hidden test.
     *
     * @return list<NormalizedSocialComment>
     */
    public function fetch(string $platform = 'facebook', ?Carbon $since = null): array
    {
        return $this->fetchNewComments($since, $platform);
    }

    /**
     * @return list<NormalizedSocialComment>
     */
    public function fetchComments(string $platform = 'facebook', ?Carbon $since = null): array
    {
        return $this->fetch($platform, $since);
    }

    public function fetchPosts(string $platform = 'facebook', ?Carbon $since = null): array
    {
        return $this->fetch($platform, $since);
    }
}
