<?php

use App\Enums\AssignmentMode;
use App\Enums\UserRole;
use App\Events\LaporanChanged;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\TicketAssignmentLog;
use App\Models\User;
use App\Services\AssignmentModeService;
use App\Services\Social\NormalizedSocialComment;
use App\Services\Social\SocialCommentImporter;
use App\Services\TicketAssignmentService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;

function socialTestChannel(string $platform = 'instagram'): Channel
{
    $parent = Channel::firstOrCreate(
        ['slug' => 'sosial-media'],
        ['name' => 'Sosial Media', 'is_active' => true]
    );

    $name = match ($platform) {
        'youtube' => 'YouTube',
        'facebook' => 'Facebook',
        default => 'Instagram',
    };

    return Channel::firstOrCreate(
        ['slug' => "sosial-media-{$platform}"],
        ['name' => $name, 'parent_id' => $parent->id, 'is_active' => true]
    );
}

function makeSocialComment(string $platform, string $externalId, string $content = 'Pelayanan sangat lambat dan perlu perbaikan'): NormalizedSocialComment
{
    return new NormalizedSocialComment(
        platform: $platform,
        externalId: $externalId,
        externalParentId: null,
        externalPermalink: null,
        externalAuthorHandle: 'warga_riau_'.$externalId,
        authorName: 'Warga Riau',
        content: $content,
        occurredAt: Carbon::now(),
    );
}

test('tiket import sosmed masuk ke Laporan Masuk dan tidak tampil di Input Data', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $channel = socialTestChannel('instagram');

    $created = app(SocialCommentImporter::class)->import('instagram', $channel, [
        makeSocialComment('instagram', 'ig-masuk-1'),
    ]);

    expect($created)->toBe(1);

    $ticket = Ticket::where('external_id', 'ig-masuk-1')->firstOrFail();
    expect($ticket->source_app)->toBe('social_instagram');

    actingAs($admin)
        ->get(route('dashboard.admin.incoming-reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tickets.data.0.ticket_number', $ticket->ticket_number)
        );

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('tickets.data', 0)
        );
});

test('import sosmed pada mode Claim dan Free membuat tiket tanpa PIC', function () {
    $channel = socialTestChannel('facebook');
    User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    Setting::set('assignment_mode', AssignmentMode::Claim->value);
    app(SocialCommentImporter::class)->import('facebook', $channel, [
        makeSocialComment('facebook', 'fb-claim-1'),
    ]);

    $claimTicket = Ticket::where('external_id', 'fb-claim-1')->firstOrFail();
    expect($claimTicket->assigned_to)->toBeNull()
        ->and($claimTicket->assignment_mode)->toBe(AssignmentMode::Claim->value);

    Setting::set('assignment_mode', AssignmentMode::Free->value);
    app(SocialCommentImporter::class)->import('facebook', $channel, [
        makeSocialComment('facebook', 'fb-free-1'),
    ]);

    $freeTicket = Ticket::where('external_id', 'fb-free-1')->firstOrFail();
    expect($freeTicket->assigned_to)->toBeNull()
        ->and($freeTicket->assignment_mode)->toBe(AssignmentMode::Free->value);
});

test('import sosmed pada mode Round Robin membagi PIC secara adil, melewatkan user tidak valid, mencatat riwayat, dan dispatch event sekali per tiket', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    Setting::set(TicketAssignmentService::SETTING_RR_LAST_USER, null);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveOp = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false, 'is_available' => true]);
    $unavailableOp = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => false]);
    $op1 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $op2 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);

    $channel = socialTestChannel('youtube');

    Event::fake([LaporanChanged::class]);

    $comments = [];
    for ($i = 1; $i <= 5; $i++) {
        $comments[] = makeSocialComment('youtube', "yt-rr-{$i}");
    }

    $created = app(SocialCommentImporter::class)->import('youtube', $channel, $comments);
    expect($created)->toBe(5);

    $tickets = Ticket::where('source_app', 'social_youtube')->orderBy('id')->get();
    expect($tickets)->toHaveCount(5);

    $assignedIds = $tickets->pluck('assigned_to')->all();
    expect($assignedIds)->toBe([$op1->id, $op2->id, $op1->id, $op2->id, $op1->id])
        ->and($assignedIds)->not->toContain($admin->id)
        ->and($assignedIds)->not->toContain($operatorTim->id)
        ->and($assignedIds)->not->toContain($inactiveOp->id)
        ->and($assignedIds)->not->toContain($unavailableOp->id);

    expect((int) Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBe($op1->id);

    $firstLog = TicketAssignmentLog::where('ticket_id', $tickets->first()->id)->firstOrFail();
    expect($firstLog->action)->toBe(TicketAssignmentLog::ACTION_AUTO_ASSIGNED)
        ->and($firstLog->note)->toContain('Round Robin')
        ->and($firstLog->note)->toContain('YouTube');

    Event::assertDispatchedTimes(LaporanChanged::class, 5);
});

test('import sosmed pada mode Round Robin tanpa operator valid tidak error, tetap tanpa PIC, dan mencatat log', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    User::factory()->create(['role' => UserRole::Operator, 'is_active' => false, 'is_available' => true]);

    $channel = socialTestChannel('instagram');

    Log::shouldReceive('warning')
        ->once()
        ->withArgs(fn (string $message) => str_contains($message, 'Tidak ada operator valid untuk giliran Round Robin'));
    Log::shouldReceive('info')->zeroOrMoreTimes();
    Log::shouldReceive('error')->zeroOrMoreTimes();

    $created = app(SocialCommentImporter::class)->import('instagram', $channel, [
        makeSocialComment('instagram', 'ig-no-op-1'),
    ]);

    expect($created)->toBe(1);

    $ticket = Ticket::where('external_id', 'ig-no-op-1')->firstOrFail();
    expect($ticket->assigned_to)->toBeNull()
        ->and($ticket->assignment_mode)->toBe(AssignmentMode::RoundRobin->value);
});

test('import ulang komentar yang sama bersifat idempoten dan tidak menggeser counter Round Robin', function () {
    Setting::set('assignment_mode', AssignmentMode::RoundRobin->value);
    Setting::set(TicketAssignmentService::SETTING_RR_LAST_USER, null);

    $op1 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $op2 = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $channel = socialTestChannel('instagram');

    $comment = makeSocialComment('instagram', 'ig-idem-1');

    expect(app(SocialCommentImporter::class)->import('instagram', $channel, [$comment]))->toBe(1);
    expect((int) Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBe($op1->id);

    // Import ulang komentar yang sama
    expect(app(SocialCommentImporter::class)->import('instagram', $channel, [$comment]))->toBe(0);
    expect((int) Setting::get(TicketAssignmentService::SETTING_RR_LAST_USER))->toBe($op1->id)
        ->and(Ticket::where('external_id', 'ig-idem-1')->count())->toBe(1);

    // Tiket baru berikutnya tetap jatuh ke op2 (counter tidak tergeser oleh duplikat)
    expect(app(SocialCommentImporter::class)->import('instagram', $channel, [
        makeSocialComment('instagram', 'ig-idem-2'),
    ]))->toBe(1);

    $second = Ticket::where('external_id', 'ig-idem-2')->firstOrFail();
    expect($second->assigned_to)->toBe($op2->id);
});

test('mode terjadwal yang diterapkan settings:apply-assignment-mode langsung berlaku pada import berikutnya', function () {
    Setting::set('assignment_mode', AssignmentMode::Free->value);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $op = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true, 'is_available' => true]);
    $channel = socialTestChannel('instagram');

    $log = app(AssignmentModeService::class)->schedule(
        AssignmentMode::RoundRobin,
        $admin,
        now()->subMinute()
    );

    expect($log->applied_at)->toBeNull();

    artisan('settings:apply-assignment-mode')->assertSuccessful();

    app(SocialCommentImporter::class)->import('instagram', $channel, [
        makeSocialComment('instagram', 'ig-sched-1'),
    ]);

    $ticket = Ticket::where('external_id', 'ig-sched-1')->firstOrFail();
    expect($ticket->assignment_mode)->toBe(AssignmentMode::RoundRobin->value)
        ->and($ticket->assigned_to)->toBe($op->id);
});

test('artisan command social:move-to-incoming memindahkan tiket import lama dengan dry-run default dan force idempoten', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $igChannel = socialTestChannel('instagram');

    // Tiket import lama yang salah tempat (source_app = admin, created_by = null, external_id != null)
    $legacyImport = Ticket::create([
        'ticket_number' => 'L-1400/112026/OLD001',
        'period' => now()->format('Y-m'),
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Tiket import lama',
        'channel_id' => $igChannel->id,
        'content' => 'Isi komentar lama dari instagram.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => null,
        'external_id' => 'legacy-ig-1',
    ]);

    // Tiket Input Data asli buatan admin pada channel Instagram (tidak boleh ikut dipindah)
    $manualInputData = Ticket::create([
        'ticket_number' => 'L-1400/112026/MAN001',
        'period' => now()->format('Y-m'),
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Input data manual',
        'channel_id' => $igChannel->id,
        'content' => 'Isi input data manual.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    // Default (tanpa --force) adalah dry-run: tidak mengubah DB
    artisan('social:move-to-incoming')->assertSuccessful();
    expect($legacyImport->fresh()->source_app)->toBe('admin')
        ->and($manualInputData->fresh()->source_app)->toBe('admin');

    // Dengan --force: hanya tiket import lama yang dipindah ke social_instagram
    artisan('social:move-to-incoming --force')->assertSuccessful();
    expect($legacyImport->fresh()->source_app)->toBe('social_instagram')
        ->and($manualInputData->fresh()->source_app)->toBe('admin');

    // Idempoten saat dijalankan ulang
    artisan('social:move-to-incoming --force')->assertSuccessful();
    expect($legacyImport->fresh()->source_app)->toBe('social_instagram');
});
