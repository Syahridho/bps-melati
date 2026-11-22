<?php

namespace App\Support;

/**
 * Central registry of cache keys and TTLs used across the application.
 */
final class CacheKeys
{
    public const TICKET_CHECK_PREFIX = 'ticket_check:';

    public const TICKET_DETAIL_PREFIX = 'ticket:';

    public const DASHBOARD_ADMIN_VERSION = 'dashboard:admin:version';

    public const DASHBOARD_ADMIN_STATS = 'dashboard:admin:stats';

    public const DASHBOARD_OPERATOR_STATS = 'dashboard:operator:stats';

    public const CHANNELS_TREE = 'channels:tree';

    public const INBOX_VERSION = 'inbox:version';

    public const WELCOME_STATS_PREFIX = 'welcome:stats:v';

    // TTLs (seconds)
    public const TTL_TICKET_CHECK = 1800;

    public const TTL_DASHBOARD_STATS = 60;

    public const TTL_CHANNELS_TREE = 86400;

    public const TTL_INBOX_COUNTS = 30;

    public const TTL_INBOX_MY_REPORTS = 30;

    public const TTL_INBOX_UNREAD = 15;
}
