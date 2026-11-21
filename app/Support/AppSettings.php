<?php

namespace App\Support;

use App\Models\User;
use App\Services\RatingSettingService;

final class AppSettings
{
    public static function ratingEnabled(): bool
    {
        return RatingSettingService::ratingEnabled();
    }

    public static function setRatingEnabled(bool $enabled, ?User $actor = null): bool
    {
        return RatingSettingService::setRatingEnabled($enabled, $actor);
    }
}