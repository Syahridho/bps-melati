<?php

use App\Actions\AutoCloseTickets;
use App\Events\InboxChanged;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $this->admin = User::factory()->create(['role' => 'admin']);

    Setting::set('auto_close_pengaduan_days', '3');
    Setting::set('auto_close_aspirasi_days', '1');
    Setting::set('auto_close_permintaan_informasi_days', '5');
});

/**
 * Buat tiket + balasan petugas pada waktu tertentu (menjadi titik awal hitungan).
 */
function ticketWithStaffReply(string $classification, string $status, Carbon $staffReplyAt, string $suffix = '01'): Ticket
{
    $ticket = Ticket::create([
        'ticket_number' => strtoupper(substr($classification, 0, 1)).'-1400/102026/'.$suffix,
        'period' => '2026-10',
        'sequence' => random_int(1000, 999999),
        'classification' => $classification,
        'title' => 'Tiket uji '.$classification,
        'channel_id' => test()->channel->id,
        'content' => 'Isi laporan uji.',
        'status' => $status,
        'source_app' => 'web',
        'is_read' => true,
    ]);

    $ticket->responses()->create([
        'user_id' => test()->admin->id,
        'type' => $status === 'respon_awal' ? 'respon_awal' : 'respon_substantif',
        'message' => 'Tanggapan petugas.',
        'sent_at' => $staffReplyAt,
    ]);

    $ticket->refresh();

    return $ticket;
}

test('pengaduan ditutup setelah 3 hari tanpa balasan pelapor', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 09:00:00'));

    expect($ticket->last_staff_response_at)->not->toBeNull();

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(1);

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai')
        ->and($ticket->closed_reason)->toBe('auto_close')
        ->and($ticket->completed_at)->not->toBeNull();

    Carbon::setTestNow();
});

test('pengaduan yang baru 2 hari 23 jam lalu belum ditutup', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 10:00:00'), '02');

    app(AutoCloseTickets::class)->handle();

    expect($ticket->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('setiap klasifikasi memakai batas hari masing-masing', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    // Aspirasi (1 hari): 2 hari lalu -> ditutup.
    ticketWithStaffReply('aspirasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), '03');

    // Permintaan informasi (5 hari): 2 hari lalu -> belum ditutup.
    $permintaan = ticketWithStaffReply('permintaan_informasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), '04');

    // Pengaduan (3 hari): 2 hari lalu -> belum ditutup.
    $pengaduan = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), '05');

    app(AutoCloseTickets::class)->handle();

    expect(Ticket::where('ticket_number', 'A-1400/102026/03')->first()->status)->toBe('selesai')
        ->and($permintaan->fresh()->status)->toBe('respon_awal')
        ->and($pengaduan->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('tiket tanpa tanggapan petugas tidak pernah ditutup otomatis', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/06',
        'period' => '2026-10',
        'sequence' => 6,
        'classification' => 'pengaduan',
        'title' => 'Belum ditanggapi',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan tanpa tanggapan.',
        'status' => 'baru',
        'source_app' => 'web',
        'created_at' => Carbon::parse('2026-09-01 09:00:00'),
    ]);

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(0)
        ->and($ticket->fresh()->status)->toBe('baru');

    Carbon::setTestNow();
});

test('balasan pelapor menghentikan hitungan sampai petugas men intervenções lagi', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '07');

    // Pelapor membalas -> hitungan berhenti.
    $ticket->responses()->create([
        'user_id' => null,
        'type' => 'balasan_pelapor',
        'message' => 'Masih ada yang saya tanyakan.',
        'sent_at' => Carbon::parse('2026-10-09 09:00:00'),
    ]);

    app(AutoCloseTickets::class)->handle();
    expect($ticket->fresh()->status)->toBe('respon_awal');

    // Petugas menanggapi lagi -> hitungan mulai dari waktu baru.
    $ticket->responses()->create([
        'user_id' => $this->admin->id,
        'type' => 'respon_substantif',
        'message' => 'Tanggapan lanjutan.',
        'sent_at' => Carbon::parse('2026-10-10 09:00:00'),
    ]);

    app(AutoCloseTickets::class)->handle();
    expect($ticket->fresh()->status)->toBe('respon_awal');

    // Lewat 3 hari sejak tanggapan terakhir -> ditutup.
    Carbon::setTestNow(Carbon::parse('2026-10-13 10:00:00'));
    app(AutoCloseTickets::class)->handle();
    expect($ticket->fresh()->status)->toBe('selesai');

    Carbon::setTestNow();
});

test('nilai pengaturan 0 menonaktifkan auto close untuk klasifikasi itu', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    Setting::set('auto_close_aspirasi_days', '0');

    $ticket = ticketWithStaffReply('aspirasi', 'respon_awal', Carbon::parse('2026-01-01 09:00:00'), '08');

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(0)
        ->and($ticket->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('pengaturan tidak valid membuat klasifikasi dilewati tanpa error', function () {
    Setting::set('auto_close_aspirasi_days', '-3');
    Setting::set('auto_close_pengaduan_days', 'bukan-angka');

    $windows = app(AutoCloseTickets::class)->resolveWindows();

    expect($windows)->toBe(['permintaan_informasi' => 5]);
});

test('menjalankan command dua kali tidak menduplikasi entri sistem', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '09');

    $this->artisan('tickets:auto-close')->assertSuccessful();
    $this->artisan('tickets:auto-close')->assertSuccessful();

    $systemEntries = TicketResponse::where('ticket_id', $ticket->id)->where('is_system', true)->count();

    expect($systemEntries)->toBe(1)
        ->and($ticket->fresh()->status)->toBe('selesai');

    Carbon::setTestNow();
});

test('penutupan membuat entri sistem berbahasa indonesia yang benar', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('aspirasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), '10');

    app(AutoCloseTickets::class)->handle();

    $system = TicketResponse::where('ticket_id', $ticket->id)->where('is_system', true)->first();

    expect($system)->not->toBeNull()
        ->and($system->user_id)->toBeNull()
        ->and($system->message)->toBe('Laporan ditutup otomatis karena tidak ada balasan dari pelapor selama 1 hari.');

    Carbon::setTestNow();
});

test('tiket hasil auto close pindah ke laporan selesai dan hilang dari laporan masuk', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '11');

    actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertInertia(fn (Assert $page) => $page->where('counts.semua', 1));

    app(AutoCloseTickets::class)->handle();

    actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 0)
            ->where('inbox_open_count', 0)
        );

    actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-selesai.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->where('tickets.data.0.ticket_number', $ticket->ticket_number)
            ->where('tickets.data.0.closed_reason', 'auto_close')
        );

    Carbon::setTestNow();
});

test('opsi dry run menampilkan kandidat tanpa mengubah data', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '12');

    $this->artisan('tickets:auto-close --dry-run')
        ->expectsOutputToContain('DRY RUN')
        ->assertSuccessful();

    expect($ticket->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('opsi limit membatasi jumlah tiket yang ditutup', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '13');
    ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '14');

    $result = app(AutoCloseTickets::class)->handle(limit: 1);

    expect($result->closedCount())->toBe(1)
        ->and(Ticket::where('status', 'selesai')->count())->toBe(1);

    Carbon::setTestNow();
});

test('satu batch auto close hanya mengirim satu event inbox changed', function () {
    Event::fake([InboxChanged::class]);

    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '15');
    ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '16');

    $this->artisan('tickets:auto-close')->assertSuccessful();

    Event::assertDispatchedTimes(InboxChanged::class, 1);
    Event::assertDispatched(InboxChanged::class, function (InboxChanged $event) {
        return $event->reason === 'auto_closed' && $event->closedCount === 2;
    });

    Carbon::setTestNow();
});

test('kegagalan satu tiket tidak menghentikan tiket lain', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $first = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '17');
    $second = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-05 09:00:00'), '18');

    // Paksa tiket pertama gagal saat closure dijalankan.
    $failingTicketId = $first->id;
    $actionPartial = new class extends AutoCloseTickets
    {
        public int $failingTicketId = 0;

        public function closeOne(int $ticketId, int $days): bool
        {
            if ($ticketId === $this->failingTicketId) {
                throw new RuntimeException('Kegagalan buatan untuk pengujian.');
            }

            return parent::closeOne($ticketId, $days);
        }
    };

    $actionPartial->failingTicketId = $failingTicketId;

    $result = $actionPartial->handle();

    expect($result->closedCount())->toBeGreaterThanOrEqual(1)
        ->and($second->fresh()->status)->toBe('selesai')
        ->and($first->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('deadline auto close dihitung di server dan null bila fitur nonaktif', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = ticketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 09:00:00'), '19');

    $deadline = AutoCloseTickets::deadlineFor($ticket);

    expect($deadline?->toIso8601String())->toBe(Carbon::parse('2026-10-11 09:00:00')->toIso8601String());

    Setting::set('auto_close_pengaduan_days', '0');
    expect(AutoCloseTickets::deadlineFor($ticket->fresh()))->toBeNull();

    Carbon::setTestNow();
});
