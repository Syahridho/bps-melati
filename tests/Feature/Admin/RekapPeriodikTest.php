<?php

use App\Models\Channel;
use App\Models\ResponseAttachment;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function periodikChannel(): Channel
{
    $parent = Channel::create([
        'name' => 'Sosial Media',
        'slug' => 'sosial-media',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    return Channel::create([
        'name' => 'Instagram',
        'slug' => 'sosial-media-instagram',
        'parent_id' => $parent->id,
        'sort_order' => 1,
        'is_active' => true,
    ]);
}

function periodikTicket(string $period, array $attributes = []): Ticket
{
    static $sequence = 0;

    $sequence++;

    return Ticket::create(array_merge([
        'ticket_number' => sprintf('S-1400/%s/%04d', str_replace('-', '', substr($period, 0, 7)), $sequence),
        'period' => $period,
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
    ], $attributes));
}

function periodikUrl(array $query = []): string
{
    return route('dashboard.admin.rekap-periodik.index', $query, absolute: false);
}

it('renders the periodic recap for an admin', function () {
    actingAs(User::factory()->admin()->create())
        ->get(periodikUrl(['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->has('rows')
            ->has('totals')
            ->has('months', 3)
            ->has('years')
            ->has('monthOptions', 12)
        );
});

it('blocks operators from admin periodic recap', function () {
    actingAs(User::factory()->operator()->create())
        ->get(periodikUrl())
        ->assertForbidden();
});

it('redirects old semesteran and tahunan routes to periodic recap', function () {
    actingAs(User::factory()->admin()->create());

    test()->get('/dashboard/admin/rekap-semesteran')
        ->assertRedirect('/dashboard/admin/rekap-periodik');

    test()->get('/dashboard/admin/rekap-tahunan')
        ->assertRedirect('/dashboard/admin/rekap-periodik');
});

it('exports periodic recap to excel', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.ms-excel; charset=utf-8');
});

it('renders periodic print view', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => '2026', 'months' => '1,2,3'], absolute: false))
        ->assertOk()
        ->assertSee('REKAP LAPORAN PERIODIK BPS PROVINSI RIAU')
        ->assertDontSee('Lampiran: Daftar Percakapan Laporan');
});

it('passes chat prop to periodic recap page', function () {
    $admin = User::factory()->admin()->create();

    // Default chat is '0'
    actingAs($admin)
        ->get(periodikUrl(['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->where('chat', '0')
        );

    // Explicit chat='1'
    actingAs($admin)
        ->get(periodikUrl(['year' => '2026', 'months' => '1,2,3', 'chat' => '1']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->where('chat', '1')
        );

    // Invalid chat falls back to '0'
    actingAs($admin)
        ->get(periodikUrl(['year' => '2026', 'months' => '1,2,3', 'chat' => 'invalid']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/periodik')
            ->where('chat', '0')
        );
});

it('renders chat attachment in print view when chat=1 and shows empty state if no tickets', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => '2026', 'months' => '1,2,3', 'chat' => '1'], absolute: false))
        ->assertOk()
        ->assertSee('Lampiran: Daftar Percakapan Laporan')
        ->assertSee('Tidak ada percakapan pada periode ini.');
});

it('renders full chat thread with responses, attachments, and escapes HTML in print view', function () {
    $admin = User::factory()->admin()->create(['name' => 'Budi Petugas']);
    $channel = periodikChannel();

    $ticket = periodikTicket('2026-02', [
        'channel_id' => $channel->id,
        'title' => 'Judul Laporan Uji <script>alert("xss")</script>',
        'reporter_name' => 'Siti Pelapor',
        'content' => "Pesan awal pelapor baris 1\nPesan awal baris 2 & <tag>",
    ]);

    TicketAttachment::create([
        'ticket_id' => $ticket->id,
        'path' => 'attachments/lampiran-awal.pdf',
        'original_name' => 'dokumen_awal.pdf',
        'mime_type' => 'application/pdf',
        'size' => 12345,
    ]);

    // Respon petugas 1
    $resp1 = TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $admin->id,
        'type' => 'respon_awal',
        'message' => 'Halo Siti, laporan Anda sedang diproses.',
        'sent_at' => now(),
    ]);

    ResponseAttachment::create([
        'ticket_response_id' => $resp1->id,
        'path' => 'attachments/tanggapan-petugas.png',
        'original_name' => 'bukti_petugas.png',
        'mime_type' => 'image/png',
        'size' => 67890,
    ]);

    // Balasan pelapor
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Terima kasih, mohon segera ditindaklanjuti.',
        'sent_at' => now()->addMinutes(10),
    ]);

    // Respon substantif petugas 2
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $admin->id,
        'type' => 'respon_substantif',
        'message' => 'Laporan telah selesai ditindaklanjuti.',
        'sent_at' => now()->addMinutes(30),
    ]);

    $response = actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.print', ['year' => '2026', 'months' => '2', 'chat' => '1'], absolute: false))
        ->assertOk();

    // Pastikan section lampiran muncul
    $response->assertSee('Lampiran: Daftar Percakapan Laporan');
    $response->assertSee($ticket->ticket_number);
    $response->assertSee('Siti Pelapor');

    // Anti XSS: tag HTML harus di-escape
    $response->assertDontSee('<script>alert("xss")</script>', false);
    $response->assertSee('Judul Laporan Uji &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', false);

    // Pesan awal dan rangkaian balasan lengkap tampil
    $response->assertSee('Pesan awal pelapor baris 1');
    $response->assertSee('[Lampiran: dokumen_awal.pdf]');
    $response->assertSee('Budi Petugas');
    $response->assertSee('Halo Siti, laporan Anda sedang diproses.');
    $response->assertSee('[Lampiran: bukti_petugas.png]');
    $response->assertSee('Terima kasih, mohon segera ditindaklanjuti.');
    $response->assertSee('Laporan telah selesai ditindaklanjuti.');
});

it('produces identical excel output regardless of chat param', function () {
    $admin = User::factory()->admin()->create();

    $resWithoutChat = actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => '2026', 'months' => '1,2,3']))
        ->assertOk()
        ->getContent();

    $resWithChat0 = actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => '2026', 'months' => '1,2,3', 'chat' => '0']))
        ->assertOk()
        ->getContent();

    $resWithChat1 = actingAs($admin)
        ->get(route('dashboard.admin.rekap-periodik.excel', ['year' => '2026', 'months' => '1,2,3', 'chat' => '1']))
        ->assertOk()
        ->getContent();

    expect($resWithoutChat)->toBe($resWithChat0)
        ->and($resWithoutChat)->toBe($resWithChat1);
    expect($resWithChat1)->not->toContain('Lampiran: Daftar Percakapan');
});

it('allows operators to view operator periodic recap and print with chat', function () {
    $operator = User::factory()->operator()->create();

    actingAs($operator)
        ->get(route('dashboard.operator.rekap-periodik.index', ['year' => '2026', 'months' => '1,2,3']))
        ->assertOk();

    actingAs($operator)
        ->get(route('dashboard.operator.rekap-periodik.print', ['year' => '2026', 'months' => '1,2,3', 'chat' => '1']))
        ->assertOk()
        ->assertSee('Lampiran: Daftar Percakapan Laporan');
});
