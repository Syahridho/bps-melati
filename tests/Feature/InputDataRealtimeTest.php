<?php

use App\Enums\UserRole;
use App\Events\DashboardUpdated;
use App\Events\LaporanChanged;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Social\NormalizedSocialComment;
use App\Services\Social\SocialCommentImporter;
use App\Services\TicketAssignmentService;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;

function realtimeWebsiteChannel(): Channel
{
    return Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'is_active' => true]
    );
}

function realtimeTicket(array $overrides = []): Ticket
{
    static $sequence = 1;

    return Ticket::create(array_merge([
        'ticket_number' => 'RT-'.sprintf('%04d', $sequence++),
        'period' => now()->format('Y-m'),
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'title' => 'Tiket realtime',
        'channel_id' => realtimeWebsiteChannel()->id,
        'content' => 'Isi tiket realtime untuk pengujian.',
        'status' => 'baru',
        'source_app' => 'admin',
    ], $overrides));
}

test('tiket baru dari input data disiarkan ke admin dan seluruh operator aktif', function () {
    Event::fake([LaporanChanged::class]);

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operatorA = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorB = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $inactiveOperator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);

    actingAs($admin)->post(route('dashboard.admin.input-data.store'), [
        'classification' => 'aspirasi',
        'title' => 'Aspirasi baru dari input data',
        'content' => 'Isi aspirasi baru yang cukup panjang untuk lolos validasi.',
        'channel_id' => realtimeWebsiteChannel()->id,
    ])->assertRedirect();

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($admin, $operatorA, $operatorB, $inactiveOperator, $operatorTim) {
        return $event->action === 'created'
            && $event->actorId === $admin->id
            && in_array($operatorA->id, $event->operatorUserIds, true)
            && in_array($operatorB->id, $event->operatorUserIds, true)
            && ! in_array($inactiveOperator->id, $event->operatorUserIds, true)
            && ! in_array($operatorTim->id, $event->operatorUserIds, true);
    });
});

test('tiket dari API Android memicu siaran realtime', function () {
    Event::fake([LaporanChanged::class]);

    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);

    $this->withHeader('X-API-KEY', config('app.api_key'))
        ->postJson('/api/tickets', [
            'classification' => 'pengaduan',
            'title' => 'Pengaduan dari aplikasi Android',
            'content' => 'Isi pengaduan yang dikirim melalui API aplikasi Android.',
            'reporter_name' => 'Budi',
        ])
        ->assertStatus(201);

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($operator) {
        return $event->action === 'created'
            && $event->isInputData === false
            && in_array($operator->id, $event->operatorUserIds, true);
    });
});

test('import sosial media memicu siaran realtime setelah tiket tersimpan', function () {
    Event::fake([LaporanChanged::class]);

    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);

    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosial-media',
        'is_active' => true,
    ]);

    $channel = Channel::create([
        'name' => 'Instagram',
        'slug' => 'sosial-media-instagram',
        'parent_id' => $parent->id,
        'is_active' => true,
    ]);

    config([
        'services.meta.ig_username' => 'bpsriau',
        'services.meta.page_id' => 'PAGE-SELF',
    ]);

    $created = app(SocialCommentImporter::class)->import('instagram', $channel, [
        new NormalizedSocialComment(
            platform: 'instagram',
            externalId: 'ig-realtime-1',
            externalParentId: null,
            externalPermalink: null,
            externalAuthorHandle: 'warga_riau',
            authorName: 'Warga Riau',
            content: 'Pelayanan sangat lambat dan tidak jelas',
            occurredAt: Carbon::now(),
        ),
    ]);

    expect($created)->toBe(1);

    $ticket = Ticket::where('external_id', 'ig-realtime-1')->firstOrFail();

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($operator, $ticket) {
        return $event->action === 'created'
            && $event->ticketId === $ticket->id
            && in_array($operator->id, $event->operatorUserIds, true);
    });
});

test('perubahan status, tandai, ubah data, dan hapus memicu aksi siaran yang benar', function () {
    $ticket = realtimeTicket();

    Event::fake([LaporanChanged::class]);

    $ticket->update(['status' => 'respon_awal']);
    $ticket->update(['is_flagged' => true]);
    $ticket->update(['title' => 'Judul tiket diperbarui']);
    $ticket->delete();

    Event::assertDispatched(LaporanChanged::class, fn (LaporanChanged $event) => $event->action === 'status_changed' && $event->ticketId === $ticket->id);
    Event::assertDispatched(LaporanChanged::class, fn (LaporanChanged $event) => $event->action === 'flagged' && $event->ticketId === $ticket->id);
    Event::assertDispatched(LaporanChanged::class, fn (LaporanChanged $event) => $event->action === 'updated' && $event->ticketId === $ticket->id);
    Event::assertDispatched(LaporanChanged::class, fn (LaporanChanged $event) => $event->action === 'deleted' && $event->ticketId === $ticket->id);
});

test('perubahan penugasan operator ikut disiarkan', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $ticket = realtimeTicket();

    Event::fake([LaporanChanged::class]);

    actingAs($admin);
    app(TicketAssignmentService::class)->reassign($ticket, $operator, $admin);

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($ticket, $operator) {
        return $event->action === 'updated'
            && $event->ticketId === $ticket->id
            && in_array($operator->id, $event->operatorUserIds, true);
    });
});

test('operator tim hanya menerima siaran untuk tiket miliknya', function () {
    Event::fake([LaporanChanged::class]);

    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);

    $ownTicket = realtimeTicket(['created_by' => $operatorTim->id]);
    $otherTicket = realtimeTicket(['created_by' => null]);

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($ownTicket, $operatorTim) {
        return $event->ticketId === $ownTicket->id
            && in_array($operatorTim->id, $event->operatorUserIds, true);
    });

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($otherTicket, $operatorTim) {
        return $event->ticketId === $otherTicket->id
            && ! in_array($operatorTim->id, $event->operatorUserIds, true);
    });
});

test('payload siaran minimal dan tidak memuat data pelapor', function () {
    Event::fake([LaporanChanged::class]);

    $ticket = realtimeTicket([
        'reporter_name' => 'Nama Rahasia Pelapor',
        'reporter_email' => 'rahasia@example.com',
        'reporter_wa' => '081234567890',
        'content' => 'Isi laporan rahasia yang tidak boleh tersiar.',
    ]);

    expect(is_subclass_of(LaporanChanged::class, ShouldDispatchAfterCommit::class))->toBeTrue();

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($ticket) {
        $payload = $event->broadcastWith();

        expect(array_keys($payload))->toBe([
            'action',
            'id',
            'ticket_number',
            'type',
            'status',
            'actor_id',
            'occurred_at',
            'is_input_data',
            'channel_name',
        ]);

        expect($payload['is_input_data'])->toBeTrue();
        expect($payload['channel_name'])->toBe('Website');

        $encoded = json_encode($payload);
        expect($encoded)
            ->not->toContain('Nama Rahasia Pelapor')
            ->not->toContain('rahasia@example.com')
            ->not->toContain('081234567890')
            ->not->toContain('Isi laporan rahasia');

        return $event->ticketId === $ticket->id;
    });
});

test('input data tetap menyiarkan LaporanChanged dan tidak bergantung pengaturan saat live dashboard dimatikan', function () {
    Event::fake([LaporanChanged::class, DashboardUpdated::class]);

    Setting::set('dashboard_live_enabled', '0');

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);

    actingAs($admin)->post(route('dashboard.admin.input-data.store'), [
        'classification' => 'pengaduan',
        'title' => 'Tiket saat live dashboard mati',
        'content' => 'Isi tiket yang tetap harus menyiarkan LaporanChanged.',
        'channel_id' => realtimeWebsiteChannel()->id,
    ])->assertRedirect();

    Event::assertDispatched(LaporanChanged::class, function (LaporanChanged $event) use ($operator) {
        return $event->action === 'created'
            && in_array($operator->id, $event->operatorUserIds, true);
    });

    Event::assertNotDispatched(DashboardUpdated::class);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->missing('isLiveEnabled'));

    actingAs($operator)
        ->get(route('dashboard.operator.input-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->missing('isLiveEnabled'));
});

test('dashboard mengikuti pengaturan dashboard_live_enabled termasuk saat bernilai lama atau belum diset', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);

    Setting::set('dashboard_live_enabled', '0');

    actingAs($admin)
        ->get(route('dashboard.admin.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('isLiveEnabled', false));

    actingAs($operator)
        ->get(route('dashboard.operator.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('isLiveEnabled', false));

    Setting::set('dashboard_live_enabled', '1');

    actingAs($admin)
        ->get(route('dashboard.admin.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('isLiveEnabled', true));
});
