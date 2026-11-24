<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;

final class NormalizedSocialComment
{
    public function __construct(
        public readonly string $platform,
        public readonly string $externalId,
        public readonly ?string $externalParentId,
        public readonly ?string $externalPermalink,
        public readonly ?string $externalAuthorHandle,
        public readonly ?string $authorName,
        public readonly string $content,
        public readonly Carbon $occurredAt,
    ) {
    }
}