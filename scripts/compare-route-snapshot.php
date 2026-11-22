<?php

$snapshotPath = __DIR__.'/../docs/route-snapshot.json';
if (! file_exists($snapshotPath)) {
    fwrite(STDERR, "Snapshot not found: {$snapshotPath}\n");
    exit(2);
}

$raw = shell_exec('php artisan route:list --json');
if ($raw === null) {
    fwrite(STDERR, "Failed to run php artisan route:list --json\n");
    exit(2);
}

$current = json_decode($raw, true);
$snapshot = json_decode(file_get_contents($snapshotPath), true);

if (! is_array($current) || ! is_array($snapshot)) {
    fwrite(STDERR, "Invalid JSON\n");
    exit(2);
}

$normalize = static function (array $routes): array {
    $out = [];
    foreach ($routes as $r) {
        $out[] = [
            'method' => $r['method'] ?? '',
            'uri' => $r['uri'] ?? '',
            'name' => $r['name'] ?? null,
            'middleware' => $r['middleware'] ?? [],
            'action' => $r['action'] ?? '',
        ];
    }
    usort($out, static function ($a, $b) {
        return [$a['method'], $a['uri'], (string) $a['name']] <=> [$b['method'], $b['uri'], (string) $b['name']];
    });

    return $out;
};

$a = $normalize($snapshot);
$b = $normalize($current);

if ($a === $b) {
    echo "OK: route list matches snapshot ({$snapshotPath})\n";
    exit(0);
}

// Diff by key
$map = static function (array $routes): array {
    $m = [];
    foreach ($routes as $r) {
        $m[$r['method'].' '.$r['uri'].' '.(string) $r['name']] = $r;
    }

    return $m;
};
$ma = $map($a);
$mb = $map($b);

$added = array_diff_key($mb, $ma);
$removed = array_diff_key($ma, $mb);
$changed = [];
foreach ($ma as $k => $r) {
    if (isset($mb[$k]) && $mb[$k] !== $r) {
        $changed[$k] = ['old' => $r, 'new' => $mb[$k]];
    }
}

echo "DIFF DETECTED\n";
if ($removed) {
    echo 'Removed ('.count($removed)."):\n";
    foreach (array_keys($removed) as $k) {
        echo "  - {$k}\n";
    }
}
if ($added) {
    echo 'Added ('.count($added)."):\n";
    foreach (array_keys($added) as $k) {
        echo "  + {$k}\n";
    }
}
if ($changed) {
    echo 'Changed ('.count($changed)."):\n";
    foreach ($changed as $k => $v) {
        echo "  ~ {$k}\n";
        echo '      old: '.json_encode($v['old'])."\n";
        echo '      new: '.json_encode($v['new'])."\n";
    }
}
exit(1);
