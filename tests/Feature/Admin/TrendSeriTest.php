<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Support\DashboardStats;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'color' => '#0ea5e9', 'sort_order' => 6, 'is_active' => true]
    );
});

test('trend returns per-day per-classification with zero fill', function () {
    $today = now()->startOfMonth()->setTime(12, 0, 0);
    $mk = function (string $num, string $classification, int $seq, $at) {
        $t = Ticket::forceCreate(['ticket_number' => $num, 'period' => $at->format('Y-m'), 'sequence' => $seq, 'classification' => $classification, 'title' => 'T', 'content' => 'Isi laporan test ', 'channel_id' => $this->channel->id, 'status' => 'baru', 'created_at' => $at, 'updated_at' => $at]);
        $t->save();

        return $t;
    };
    $mk('L-1', 'pengaduan', 1, $today);
    $mk('L-2', 'aspirasi', 2, $today);
    $mk('L-3', 'permintaan_informasi', 3, $today->copy()->addDay());

    $built = DashboardStats::build();
    $trend = $built['trend'];
    $first = $trend[0];

    expect($first['label'])->toBe($today->format('d M'))
        ->and($first['pengaduan'])->toBe(1)
        ->and($first['aspirasi'])->toBe(1)
        ->and($first['permintaan_informasi'])->toBe(0)
        ->and($first['total'])->toBe(2)
        ->and($trend[1]['total'])->toBe(1)
        ->and(collect($trend)->sum('pengaduan'))->toBe($built['stats']['pengaduan'])
        ->and(collect($trend)->sum('aspirasi'))->toBe($built['stats']['aspirasi'])
        ->and(collect($trend)->sum('permintaan_informasi'))->toBe($built['stats']['permintaan_informasi'])
        ->and(collect($trend)->sum('total'))->toBe($built['stats']['total']);
});

test('today without tickets shows zero row', function () {
    $built = DashboardStats::build();
    $today = now();
    $row = collect($built['trend'])->firstWhere('label', $today->format('d M'));

    expect($row)->not->toBeNull()
        ->and($row['pengaduan'] + $row['aspirasi'] + $row['permintaan_informasi'])->toBe($row['total']);
});
