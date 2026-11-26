<?php

namespace App\Services\Social;

use Illuminate\Support\Carbon;

final class NormalizedSocialComment implements \ArrayAccess, \JsonSerializable
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

    /**
     * Format seragam yang diminta spec: external_id, text, author, url, published_at.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'external_id' => $this->externalId,
            'text' => $this->content,
            'author' => $this->authorName ?: $this->externalAuthorHandle,
            'url' => $this->externalPermalink,
            'published_at' => $this->occurredAt->toIso8601String(),
            // alias lama tetap tersedia
            'platform' => $this->platform,
            'external_parent_id' => $this->externalParentId,
            'external_author_handle' => $this->externalAuthorHandle,
            'content' => $this->content,
            'occurred_at' => $this->occurredAt,
        ];
    }

    public function jsonSerialize(): mixed
    {
        return $this->toArray();
    }

    public function offsetExists(mixed $offset): bool
    {
        return array_key_exists((string) $offset, $this->toArray());
    }

    public function offsetGet(mixed $offset): mixed
    {
        return $this->toArray()[(string) $offset] ?? null;
    }

    public function offsetSet(mixed $offset, mixed $value): void
    {
        // immutable: abaikan
    }

    public function offsetUnset(mixed $offset): void
    {
        // immutable: abaikan
    }
}