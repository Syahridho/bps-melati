<?php

namespace App\Services;

use App\Models\Channel;
use App\Services\Social\SocialCommentImporter;
use Illuminate\Support\Carbon;

class InputDataIngestService
{
    public function __construct(private ?SocialCommentImporter $importer = null)
    {
        $this->importer = $this->importer ?? app(SocialCommentImporter::class);
    }

    public function import(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->importer->import($platform, $channel, $comments, $since);
    }

    public function ingest(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function save(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function process(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function ingestData(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function store(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function create(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    public function handle(string $platform, Channel $channel, array $comments, ?Carbon $since = null): int
    {
        return $this->import($platform, $channel, $comments, $since);
    }

    /**
     * Konfigurasi mapping yang dipakai (untuk debugging/konsumsi frontend).
     */
    public function mapping(): array
    {
        return (array) config('input_data_import', []);
    }
}
