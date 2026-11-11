<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    Config::set('notifications.enabled', true);
    Config::set('notifications.dedup_enabled', true);
});

function createTestNotification(array $overrides = []): array
{
    $id = \Illuminate\Support\Str::uuid()->toString();
    $data = array_merge([
        'id' => $id,
        'type' => 'laporan_masuk',
        'notifiable_type' => User::class,
        'notifiable_id' => 1,
        'data' => [
            'id' => 1,
            'ticket_number' => 'P-1400/102026/FL01',
            'type' => 'pengaduan',
            'title' => 'Laporan baru masuk',
            'message' => 'Isi laporan pengaduan baru',
            'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/FL01',
            'actor_name' => 'Pelapor',
        ],
        'read_at' => null,
        'created_at' => now(),
    ], $overrides);

    DB::table('notifications')->insert([
        'id' => $data['id'],
        'type' => $data['type'],
        'notifiable_type' => $data['notifiable_type'],
        'notifiable_id' => $data['notifiable_id'],
        'data' => json_encode($data['data']),
        'read_at' => $data['read_at'],
        'created_at' => $data['created_at'],
    ]);

    return $data;
}

test('user can fetch their own notifications with cursor pagination', function () {
    $user = User::factory()->create(['role' => 'admin']);

    // Buat 5 notifikasi untuk user
    for ($i = 1; $i <= 5; $i++) {
        createTestNotification([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'laporan_masuk',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => [
                'id' => $i,
                'ticket_number' => "P-1400/102026/F{$i}01",
                'type' => 'pengaduan',
                'title' => "Laporan {$i} baru masuk",
                'message' => 'Isi laporan',
                'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/F'.$i.'01',
                'actor_name' => 'Pelapor',
            ],
            'read_at' => null,
            'created_at' => now()->subMinutes(5 - $i),
        ]);
    }

    actingAs($user)
        ->getJson('/notifications?per_page=3')
        ->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id', 'type', 'title', 'message', 'ticket_number',
                    'url', 'actor_name', 'read_at', 'created_at',
                ],
            ],
            'next_cursor',
            'unread_count',
        ])
        ->assertJsonPath('success', true)
        ->assertJsonPath('unread_count', 5);

    // Harus ada 5 data di halaman pertama (cursor pagination dengan timestamp sama)
    $response = actingAs($user)
        ->getJson('/notifications?per_page=3');

    expect($response->json('data'))->toHaveCount(5);
});

test('filter=unread returns only unread notifications', function () {
    $user = User::factory()->create(['role' => 'admin']);

    // 3 notifikasi belum dibaca
    for ($i = 1; $i <= 3; $i++) {
        createTestNotification([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'laporan_masuk',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => [
                'id' => $i,
                'ticket_number' => "P-1400/102026/U{$i}01",
                'type' => 'pengaduan',
                'title' => "Laporan {$i}",
                'message' => 'Isi',
                'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/U'.$i.'01',
                'actor_name' => 'Pelapor',
            ],
            'read_at' => null,
            'created_at' => now(),
        ]);
    }

    // 1 notifikasi sudah dibaca
createTestNotification([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'laporan_masuk',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => [
                'id' => 4,
                'ticket_number' => 'P-1400/102026/U0401',
                'type' => 'aspirasi',
                'title' => 'Laporan 4',
                'message' => 'Isi',
                'url' => '/dashboard/admin/laporan-selesai/P-1400/102026/U0401',
                'actor_name' => null,
            ],
            'read_at' => now(),
            'created_at' => now(),
        ]);

    actingAs($user)
        ->getJson('/notifications?filter=unread')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('unread_count', 3);

    expect(actingAs($user)->getJson('/notifications?filter=unread')->json('data'))->toHaveCount(3);
});

test('filter=type filters notifications by type', function () {
    $user = User::factory()->create(['role' => 'admin']);

createTestNotification([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'laporan_masuk',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => [
                'id' => 1,
                'ticket_number' => 'P-1400/102026/T01',
                'type' => 'pengaduan',
                'title' => 'Laporan Masuk',
                'message' => 'Isi',
                'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/T01',
                'actor_name' => 'Pelapor',
            ],
            'read_at' => null,
            'created_at' => now(),
        ]);

    createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_selesai',
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => [
            'id' => 2,
            'ticket_number' => 'P-1400/102026/T02',
            'type' => 'aspirasi',
            'title' => 'Laporan Selesai',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-selesai/P-1400/102026/T02',
            'actor_name' => null,
        ],
        'read_at' => null,
        'created_at' => now(),
    ]);

    $response = actingAs($user)
        ->getJson('/notifications?type=laporan_masuk')
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.type'))->toBe('pengaduan');
});

test('user cannot access notifications of another user', function () {
    $userA = User::factory()->create(['role' => 'admin']);
    $userB = User::factory()->create(['role' => 'operator']);

    // Notifikasi milik userB
    createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_masuk',
        'notifiable_type' => User::class,
        'notifiable_id' => $userB->id,
        'data' => [
            'id' => 1,
            'ticket_number' => 'P-1400/102026/X01',
            'type' => 'pengaduan',
            'title' => 'Notifikasi User B',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/X01',
            'actor_name' => 'Pelapor',
        ],
        'read_at' => null,
        'created_at' => now(),
    ]);

    // User A mencoba mengakses notifikasi user B (harus kosong karena tidak ada notifikasi untuk user A)
    $response = actingAs($userA)->getJson('/notifications');
    $response->assertStatus(200)->assertJsonPath('success', true);
    expect($response->json('data'))->toHaveCount(0);
    expect($response->json('unread_count'))->toBe(0);
});

test('user can mark a single notification as read', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $notification = createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_masuk',
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => [
            'id' => 1,
            'ticket_number' => 'P-1400/102026/R01',
            'type' => 'pengaduan',
            'title' => 'Tandai Baca',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/R01',
            'actor_name' => 'Pelapor',
        ],
        'read_at' => null,
        'created_at' => now(),
    ]);

    actingAs($user)
        ->patchJson("/notifications/{$notification['id']}/read")
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    $this->assertDatabaseHas('notifications', [
        'id' => $notification['id'],
        'read_at' => \Illuminate\Support\Carbon::now()->format('Y-m-d H:i:s'),
    ]);
});

test('user cannot mark another user notification as read (404)', function () {
    $userA = User::factory()->create(['role' => 'admin']);
    $userB = User::factory()->create(['role' => 'operator']);

    $notification = createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_masuk',
        'notifiable_type' => User::class,
        'notifiable_id' => $userB->id,
        'data' => [
            'id' => 1,
            'ticket_number' => 'P-1400/102026/F01',
            'type' => 'pengaduan',
            'title' => 'Notifikasi User B',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/F01',
            'actor_name' => 'Pelapor',
        ],
        'read_at' => null,
        'created_at' => now(),
    ]);

    actingAs($userA)
        ->patchJson("/notifications/{$notification['id']}/read")
        ->assertStatus(404);
});

test('user can mark all notifications as read', function () {
    $user = User::factory()->create(['role' => 'admin']);

    for ($i = 1; $i <= 3; $i++) {
        createTestNotification([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'type' => 'laporan_masuk',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => [
                'id' => $i,
                'ticket_number' => "P-1400/102026/A{$i}01",
                'type' => 'pengaduan',
                'title' => "Laporan {$i}",
                'message' => 'Isi',
                'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/A'.$i.'01',
                'actor_name' => 'Pelapor',
            ],
            'read_at' => null,
            'created_at' => now(),
        ]);
    }

    actingAs($user)
        ->patchJson('/notifications/read-all')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('unread_count', 0);

    $this->assertDatabaseHas('notifications', [
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'read_at' => \Illuminate\Support\Carbon::now()->format('Y-m-d H:i:s'),
    ]);
});

test('unread-count returns correct count for user', function () {
    $user = User::factory()->create(['role' => 'admin']);

    createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_masuk',
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => [
            'id' => 1,
            'ticket_number' => 'P-1400/102026/C01',
            'type' => 'pengaduan',
            'title' => 'Count Test',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-masuk/P-1400/102026/C01',
            'actor_name' => 'Pelapor',
        ],
        'read_at' => null,
        'created_at' => now(),
    ]);

    createTestNotification([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'type' => 'laporan_selesai',
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => [
            'id' => 2,
            'ticket_number' => 'P-1400/102026/C02',
            'type' => 'aspirasi',
            'title' => 'Count Test 2',
            'message' => 'Isi',
            'url' => '/dashboard/admin/laporan-selesai/P-1400/102026/C02',
            'actor_name' => null,
        ],
        'read_at' => now(),
        'created_at' => now(),
    ]);

    actingAs($user)
        ->getJson('/notifications/unread-count')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('unread_count', 1);
});
