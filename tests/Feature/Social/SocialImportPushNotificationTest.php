<?php

use App\Enums\AssignmentMode;
use App\Enums\UserRole;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\LaporanNotification;
use App\Services\Social\NormalizedSocialComment;
use App\Services\Social\SocialCommentImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function makePushSocialComment(string $id, string $content = 'Mohon info data inflasi BPS Riau terbaru ya admin.'): NormalizedSocialComment
{
    return new NormalizedSocialComment(
        platform: 'youtube',
        externalId: $id,
        externalParentId: null,
        externalPermalink: 'https://youtube.com/watch?v=test&lc='.$id,
        externalAuthorHandle: '@wargariau',
        authorName: 'Warga Riau',
        content: $content,
        occurredAt: now()->subMinutes(2),
    );
}

test('social import creates incoming report ticket and sends queued LaporanNotification once, idempotently', function () {
    Notification::fake();
    Cache::flush();

    Setting::set('assignment_mode', AssignmentMode::Free->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);

    $channel = Channel::create([
        'name' => 'YouTube',
        'slug' => 'sosial-media-youtube',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $importer = app(SocialCommentImporter::class);
    $comments = [makePushSocialComment('yt-comment-001')];

    $created = $importer->import('youtube', $channel, $comments);
    expect($created)->toBe(1);

    $ticket = Ticket::where('external_id', 'yt-comment-001')->firstOrFail();
    expect($ticket->source_app)->toBe('social_youtube');

    Notification::assertSentToTimes($admin, LaporanNotification::class, 1);
    Notification::assertSentToTimes($operator, LaporanNotification::class, 1);
    Notification::assertNotSentTo($operatorTim, LaporanNotification::class);

    Notification::assertSentTo($admin, LaporanNotification::class, function (LaporanNotification $n): bool {
        return $n->type === 'laporan_masuk'
            && ($n->data['title'] ?? '') === 'Laporan baru masuk'
            && $n instanceof ShouldQueue;
    });

    // Import ulang komentar yang sama: idempoten, tidak mengirim ulang
    Notification::fake();
    $createdAgain = $importer->import('youtube', $channel, $comments);
    expect($createdAgain)->toBe(0);
    Notification::assertNothingSent();
});

test('social import respects round robin PIC recipient rule', function () {
    Notification::fake();
    Cache::flush();

    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $op1 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $op2 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    $channel = Channel::create([
        'name' => 'YouTube',
        'slug' => 'sosial-media-youtube-rr',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $importer = app(SocialCommentImporter::class);
    $created = $importer->import('youtube', $channel, [makePushSocialComment('yt-rr-001')]);
    expect($created)->toBe(1);

    $ticket = Ticket::where('external_id', 'yt-rr-001')->firstOrFail();
    $picId = (int) $ticket->assigned_to;
    expect($picId)->toBeIn([$op1->id, $op2->id]);

    $pic = $picId === $op1->id ? $op1 : $op2;
    $nonPic = $picId === $op1->id ? $op2 : $op1;

    Notification::assertSentToTimes($admin, LaporanNotification::class, 1);
    Notification::assertSentToTimes($pic, LaporanNotification::class, 1);
    Notification::assertNotSentTo($nonPic, LaporanNotification::class);
});

test('social import summarizes batch notifications when more than 5 tickets are created', function () {
    Notification::fake();
    Cache::flush();

    Setting::set('assignment_mode', AssignmentMode::Claim->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);

    $channel = Channel::create([
        'name' => 'YouTube',
        'slug' => 'sosial-media-youtube-batch',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $comments = [];
    for ($i = 1; $i <= 7; $i++) {
        $comments[] = makePushSocialComment("yt-batch-{$i}", "Mohon info statistik kemiskinan Riau ke-{$i} ya min.");
    }

    $created = app(SocialCommentImporter::class)->import('youtube', $channel, $comments);
    expect($created)->toBe(7);

    // Harus diringkas menjadi 1 notifikasi per penerima, bukan 7
    Notification::assertSentToTimes($admin, LaporanNotification::class, 1);
    Notification::assertSentToTimes($operator, LaporanNotification::class, 1);

    Notification::assertSentTo($admin, LaporanNotification::class, function (LaporanNotification $n): bool {
        return $n->type === 'laporan_masuk'
            && ($n->data['title'] ?? '') === '7 laporan baru masuk dari YouTube';
    });
});

test('website and android api ticket creation send LaporanNotification once without duplicates', function () {
    Notification::fake();
    Cache::flush();

    Setting::set('assignment_mode', AssignmentMode::Free->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true],
    );

    $this->post(route('tickets.store'), [
        'classification' => 'pengaduan',
        'title' => 'Pengaduan Website',
        'content' => 'Isi pengaduan dari website resmi.',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor Web',
    ])->assertRedirect();

    Notification::assertSentToTimes($admin, LaporanNotification::class, 1);
    Notification::assertSentToTimes($operator, LaporanNotification::class, 1);

    Notification::fake();

    config(['app.api_key' => 'test-api-key']);

    $this->withHeader('X-API-KEY', 'test-api-key')->postJson('/api/tickets', [
        'classification' => 'aspirasi',
        'title' => 'Aspirasi Android',
        'content' => 'Isi aspirasi dari aplikasi Android.',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor Android',
    ])->assertCreated();

    Notification::assertSentToTimes($admin, LaporanNotification::class, 1);
    Notification::assertSentToTimes($operator, LaporanNotification::class, 1);
});
