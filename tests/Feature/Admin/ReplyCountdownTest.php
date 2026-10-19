<?php

use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Support\ReplyDeadline;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('reply deadline service calculates correctly based on classification settings', function () {
    Setting::set('auto_close_pengaduan_days', '3');
    Setting::set('auto_close_aspirasi_days', '1');
    Setting::set('auto_close_permintaan_informasi_days', '5');

    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);

    Carbon::setTestNow('2026-10-19 10:00:00');

    $ticketPengaduan = Ticket::create([
        'ticket_number' => 'L-1400/102026/0001',
        'channel_id' => $channel->id,
        'period' => '2026-10',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengaduan minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ]);

    $deadline = ReplyDeadline::for($ticketPengaduan);
    expect($deadline->toDateTimeString())->toBe('2026-10-22 10:00:00');

    $ticketAspirasi = Ticket::create([
        'ticket_number' => 'A-1400/102026/0002',
        'channel_id' => $channel->id,
        'period' => '2026-10',
        'sequence' => 2,
        'classification' => 'aspirasi',
        'content' => 'Isi aspirasi minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ]);

    expect(ReplyDeadline::for($ticketAspirasi)->toDateTimeString())->toBe('2026-10-20 10:00:00');
});

test('staff response clears reply deadline and reporter reply restarts it', function () {
    Setting::set('auto_close_pengaduan_days', '3');
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);
    $admin = User::factory()->admin()->create();

    Carbon::setTestNow('2026-10-19 10:00:00');

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/0003',
        'channel_id' => $channel->id,
        'period' => '2026-10',
        'sequence' => 3,
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengaduan minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ]);

    expect(ReplyDeadline::for($ticket))->not->toBeNull();

    Carbon::setTestNow('2026-10-19 11:00:00');
    $ticket->responses()->create([
        'user_id' => $admin->id,
        'type' => 'respon_awal',
        'message' => 'Respon awal petugas',
    ]);
    $ticket->update(['status' => 'respon_awal', 'last_staff_response_at' => now()]);

    expect(ReplyDeadline::for($ticket))->toBeNull();

    Carbon::setTestNow('2026-10-20 09:00:00');
    $ticket->responses()->create([
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Balasan dari pelapor',
    ]);

    expect(ReplyDeadline::for($ticket)->toDateTimeString())->toBe('2026-10-23 09:00:00');
});

test('laporan masuk index and show expose reply_deadline_at and server_now for admin and operator', function () {
    Setting::set('auto_close_pengaduan_days', '3');
    $admin = User::factory()->admin()->create();
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/0004',
        'channel_id' => $channel->id,
        'period' => '2026-10',
        'sequence' => 4,
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengaduan minimal sepuluh karakter.',
        'status' => 'baru',
        'reporter_name' => 'Pelapor',
        'source_app' => 'web',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->has('server_now')
            ->has('tickets.data.0', fn (Assert $item) => $item->has('reply_deadline_at')->etc())
        );

    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk/show')
            ->has('server_now')
            ->has('ticket', fn (Assert $t) => $t->has('reply_deadline_at')->etc())
        );
});
