<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;

interface SocialCommentFetcher
{
    public function platform(): string;

    /**
     * @return list<NormalizedSocialComment>
     */
    public function fetchNewComments(?Carbon $since): array;
}