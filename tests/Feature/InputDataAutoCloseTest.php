<?php

use App\Actions\AutoCloseTickets;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
    $this->operator = User::factory()->create(['role' => UserRole::Operator]);
    $this->operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    Setting::set('auto_close_pengaduan_days', '3');
    Setting::set('auto_close_aspirasi_days', '1');
    Setting::set('auto_close_permintaan_informasi_days', '5');
    Setting::set('kadar_pengawasan_hari', '30');
});

function createInputDataTicketWithStaffReply(string $classification, string $status, Carbon $staffReplyAt, string $suffix = '01'): Ticket
{
    $ticket = Ticket::create([
        'ticket_number' => strtoupper(substr($classification, 0, 1)).'-1400/102026/'.$suffix,
        'period' => '2026-10',
        'sequence' => random_int(1000, 999999),
        'classification' => $classification,
        'title' => 'Tiket Input Data '.$classification,
        'channel_id' => test()->channel->id,
        'content' => 'Isi laporan input data.',
        'status' => $status,
        'source_app' => 'admin',
        'is_read' => true,
    ]);

    $ticket->responses()->create([
        'user_id' => test()->admin->id,
        'type' => $status === 'respon_awal' ? 'respon_awal' : 'respon_substantif',
        'message' => 'Tanggapan petugas untuk input data.',
        'sent_at' => $staffReplyAt,
    ]);

    $ticket->refresh();

    return $ticket;
}

test('tiket Input Data yang sudah direspon dan melewati batas hari tertutup otomatis', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 09:00:00'), 'ID01');

    expect($ticket->source_app)->toBe('admin')
        ->and($ticket->last_staff_response_at)->not->toBeNull();

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(1);

    $ticket->refresh();
    expect($ticket->status)->toBe('selesai')
        ->and($ticket->closed_reason)->toBe('auto_close')
        ->and($ticket->completed_at)->not->toBeNull();

    Carbon::setTestNow();
});

test('tiket Input Data yang belum melewati batas hari tidak tertutup', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 10:00:00'), 'ID02');

    app(AutoCloseTickets::class)->handle();

    expect($ticket->fresh()->status)->toBe('respon_awal');

    Carbon::setTestNow();
});

test('tiket Input Data berstatus Baru tanpa respon tidak tertutup dan auto_close_at null', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/ID03',
        'period' => '2026-10',
        'sequence' => 3,
        'classification' => 'pengaduan',
        'title' => 'Input data baru tanpa respon',
        'channel_id' => $this->channel->id,
        'content' => 'Isi laporan tanpa tanggapan.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_at' => Carbon::parse('2026-09-01 09:00:00'),
    ]);

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(0)
        ->and($ticket->fresh()->status)->toBe('baru')
        ->and($ticket->last_staff_response_at)->toBeNull()
        ->and(AutoCloseTickets::deadlineFor($ticket))->toBeNull();

    Carbon::setTestNow();
});

test('batas hari mengikuti klasifikasi dan berubah saat pengaturan diubah', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    // Aspirasi (1 hari): 2 hari lalu -> tertutup
    $aspirasi = createInputDataTicketWithStaffReply('aspirasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), 'ID04');
    // Permintaan informasi (5 hari): 2 hari lalu -> belum tertutup
    $permintaan = createInputDataTicketWithStaffReply('permintaan_informasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), 'ID05');

    app(AutoCloseTickets::class)->handle();

    expect($aspirasi->fresh()->status)->toBe('selesai')
        ->and($permintaan->fresh()->status)->toBe('respon_awal');

    // Ubah pengaturan permintaan_informasi jadi 2 hari -> sekarang tertutup
    Setting::set('auto_close_permintaan_informasi_days', '2');
    app(AutoCloseTickets::class)->handle();

    expect($permintaan->fresh()->status)->toBe('selesai');

    Carbon::setTestNow();
});

test('tiket Input Data berkadar pengawasan aktif memakai kadar_pengawasan_days', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    // Aspirasi normal auto close 1 hari. Namun jika pengawasan aktif (30 hari), tiket tidak ditutup setelah 2 hari.
    $ticket = createInputDataTicketWithStaffReply('aspirasi', 'respon_awal', Carbon::parse('2026-10-09 09:00:00'), 'ID06');
    $ticket->update([
        'is_pengawasan' => true,
        'pengawasan_at' => Carbon::parse('2026-10-09 09:00:00'),
        'pengawasan_by' => $this->admin->id,
    ]);

    app(AutoCloseTickets::class)->handle();

    expect($ticket->fresh()->status)->toBe('respon_awal');

    // Majukan waktu melewati 30 hari
    Carbon::setTestNow(Carbon::parse('2026-11-10 09:00:00'));

    app(AutoCloseTickets::class)->handle();

    expect($ticket->fresh()->status)->toBe('selesai')
        ->and($ticket->fresh()->closed_reason)->toBe('auto_close');

    Carbon::setTestNow();
});

test('nilai 0 di pengaturan menonaktifkan auto close untuk klasifikasi itu pada Input Data', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    Setting::set('auto_close_pengaduan_days', '0');

    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-01 09:00:00'), 'ID07');

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(0)
        ->and($ticket->fresh()->status)->toBe('respon_awal')
        ->and(AutoCloseTickets::deadlineFor($ticket))->toBeNull();

    Carbon::setTestNow();
});

test('tiket Laporan Masuk tetap berperilaku seperti sebelumnya (regresi)', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-11 09:00:00'));

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/LM01',
        'period' => '2026-10',
        'sequence' => 101,
        'classification' => 'pengaduan',
        'title' => 'Tiket laporan masuk web',
        'channel_id' => $this->channel->id,
        'content' => 'Isi laporan masuk.',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'is_read' => true,
    ]);

    $ticket->responses()->create([
        'user_id' => $this->admin->id,
        'type' => 'respon_awal',
        'message' => 'Tanggapan.',
        'sent_at' => Carbon::parse('2026-10-08 09:00:00'),
    ]);

    $result = app(AutoCloseTickets::class)->handle();

    expect($result->closedCount())->toBe(1)
        ->and($ticket->fresh()->status)->toBe('selesai')
        ->and($ticket->fresh()->closed_reason)->toBe('auto_close');

    Carbon::setTestNow();
});

test('toggle pengawasan pada tiket Input Data berhasil untuk admin dan operator', function () {
    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', now()->subDay(), 'ID08');

    // Admin toggle on
    $this->actingAs($this->admin)
        ->patch(route('dashboard.admin.input-data.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => true,
        ])
        ->assertRedirect();

    expect($ticket->fresh()->is_pengawasan)->toBeTrue();

    // Admin toggle off
    $this->actingAs($this->admin)
        ->patch(route('dashboard.admin.input-data.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => false,
        ])
        ->assertRedirect();

    expect($ticket->fresh()->is_pengawasan)->toBeFalse();

    // Operator toggle on
    $this->actingAs($this->operator)
        ->patch(route('dashboard.operator.input-data.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => true,
        ])
        ->assertRedirect();

    expect($ticket->fresh()->is_pengawasan)->toBeTrue();
});

test('toggle pengawasan tiket Input Data ditolak untuk tiket yang sudah selesai', function () {
    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', now()->subDay(), 'ID09');
    $ticket->update(['status' => 'selesai']);

    $this->actingAs($this->admin)
        ->patch(route('dashboard.admin.input-data.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => true,
        ])
        ->assertSessionHasErrors(['aktif']);

    expect($ticket->fresh()->is_pengawasan)->toBeFalse();
});

test('halaman detail Input Data mengirim props auto close yang benar', function () {
    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 09:00:00'), 'ID10');

    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.input-data.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/input-data/show/index')
            ->has('ticket', fn (Assert $t) => $t
                ->where('ticket_number', $ticket->ticket_number)
                ->where('is_pengawasan', false)
                ->where('kadar_pengawasan_days', 30)
                ->where('classification_default_days', 3)
                ->where('auto_close_at', Carbon::parse('2026-10-11 09:00:00')->toIso8601String())
                ->etc()
            )
        );
});

test('command backfill idempotent dan memiliki mode dry-run', function () {
    $ticket = createInputDataTicketWithStaffReply('pengaduan', 'respon_awal', Carbon::parse('2026-10-08 09:00:00'), 'ID11');

    // Simulasikan data lama yang last_staff_response_at masih null
    Ticket::whereKey($ticket->id)->update(['last_staff_response_at' => null]);
    expect($ticket->fresh()->last_staff_response_at)->toBeNull();

    // Mode dry-run (default tanpa --execute)
    $this->artisan('tickets:backfill-last-staff-response')
        ->expectsOutputToContain('DRY RUN')
        ->assertSuccessful();

    expect($ticket->fresh()->last_staff_response_at)->toBeNull();

    // Mode dry-run eksplisit
    $this->artisan('tickets:backfill-last-staff-response --dry-run')
        ->expectsOutputToContain('DRY RUN')
        ->assertSuccessful();

    expect($ticket->fresh()->last_staff_response_at)->toBeNull();

    // Eksekusi update
    $this->artisan('tickets:backfill-last-staff-response --execute')
        ->expectsOutputToContain('Berhasil memperbarui kolom last_staff_response_at')
        ->assertSuccessful();

    $ticket->refresh();
    expect($ticket->last_staff_response_at)->not->toBeNull()
        ->and($ticket->last_staff_response_at->format('Y-m-d H:i:s'))->toBe('2026-10-08 09:00:00');

    // Jalankan lagi (idempotent)
    $this->artisan('tickets:backfill-last-staff-response --execute')
        ->expectsOutputToContain('Tidak ada tiket yang perlu diperbarui.')
        ->assertSuccessful();
});
