<?php

use App\Enums\UserRole;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
    $this->operator = User::factory()->create(['role' => UserRole::Operator]);
    $this->operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);
    $this->otherOperatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);
});

/**
 * Buat tiket input-data milik user tertentu.
 *
 * @param  array<string, mixed>  $attributes
 */
function makeInputTicket(User $creator, string $status = 'baru', array $attributes = []): Ticket
{
    static $seq = 1;

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/ST'.str_pad((string) $seq++, 3, '0', STR_PAD_LEFT),
        'period' => '2026-11',
        'sequence' => random_int(1000, 999999),
        'classification' => 'pengaduan',
        'title' => 'Tiket test',
        'channel_id' => test()->channel->id,
        'content' => 'Isi tiket test.',
        'status' => $status,
        'source_app' => 'admin',
        'is_read' => true,
        'created_by' => $creator->id,
    ], $attributes));
}

// ─── a) operator_tim hanya melihat tiket selesai miliknya sendiri ────────────

test('tab selesai hanya menampilkan tiket selesai milik operator_tim yang login', function () {
    $mine = makeInputTicket($this->operatorTim, 'selesai');
    $another = makeInputTicket($this->otherOperatorTim, 'selesai');
    $notDone = makeInputTicket($this->operatorTim, 'baru');

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', ['tab' => 'selesai', 'from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $mine->ticket_number)
        );
});

// ─── b) tiket selesai user lain tidak muncul meski query string dimanipulasi ─

test('tiket selesai user lain tidak muncul meskipun query string dimanipulasi', function () {
    // Buat tiket selesai milik user lain
    makeInputTicket($this->otherOperatorTim, 'selesai');

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', [
            'tab' => 'selesai',
            'from' => 'semua',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 0)
        );
});

test('operator_tim tidak bisa melihat tiket selesai milik user lain dengan tab semua', function () {
    // Tiket selesai milik user lain — tab 'semua' menyembunyikan status selesai
    makeInputTicket($this->otherOperatorTim, 'selesai');

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 0)
        );
});

// ─── c) hitungan badge 'selesai' hanya menghitung tiket milik user login ─────

test('counts.selesai hanya menghitung tiket selesai milik operator_tim yang login', function () {
    makeInputTicket($this->operatorTim, 'selesai');
    makeInputTicket($this->operatorTim, 'selesai');
    makeInputTicket($this->otherOperatorTim, 'selesai'); // tidak boleh terhitung

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.selesai', 2)
        );
});

test('counts.selesai adalah 0 untuk admin dan operator (tab tidak tersedia untuk mereka)', function () {
    makeInputTicket($this->operatorTim, 'selesai');

    Cache::flush();

    // Admin
    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.input-data.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.selesai', 0)
        );

    Cache::flush();

    // Operator
    $this->actingAs($this->operator)
        ->get(route('dashboard.operator.input-data.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.selesai', 0)
        );
});

// ─── d) role admin dan operator tidak terpengaruh ────────────────────────────

test('admin yang menggunakan tab=selesai di URL dikembalikan ke tab semua tanpa error', function () {
    makeInputTicket($this->admin, 'baru');

    Cache::flush();

    // Ketika admin mencoba tab=selesai, server harus mengabaikannya (fallback ke 'semua')
    // dan hanya menampilkan tiket belum-selesai seperti biasa.
    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.input-data.index', ['tab' => 'selesai', 'from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.filter', 'semua') // server force ke 'semua'
        );
});

test('operator yang menggunakan tab=selesai di URL dikembalikan ke tab semua tanpa error', function () {
    makeInputTicket($this->operator, 'baru');

    Cache::flush();

    $this->actingAs($this->operator)
        ->get(route('dashboard.operator.input-data.index', ['tab' => 'selesai', 'from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.filter', 'semua')
        );
});

test('tab semua pada operator_tim tidak menyertakan tiket selesai', function () {
    makeInputTicket($this->operatorTim, 'baru');
    makeInputTicket($this->operatorTim, 'selesai');

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', ['from' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.status', 'baru')
        );
});

test('filter tab selesai berfungsi bersama filter rentang tanggal', function () {
    $inRange = makeInputTicket($this->operatorTim, 'selesai');
    $outRange = makeInputTicket($this->operatorTim, 'selesai');

    // Force-set created_at karena Eloquent mengabaikan kolom timestamps saat create
    DB::table('tickets')
        ->where('id', $inRange->id)
        ->update(['created_at' => '2026-11-15 10:00:00']);

    DB::table('tickets')
        ->where('id', $outRange->id)
        ->update(['created_at' => '2026-10-01 10:00:00']);

    Cache::flush();

    $this->actingAs($this->operatorTim)
        ->get(route('dashboard.operator.input-data.index', [
            'tab' => 'selesai',
            'from' => '2026-11-01',
            'to' => '2026-11-30',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $inRange->ticket_number)
        );
});
