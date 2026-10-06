<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function createTestTicket(array $overrides = []): Ticket
{
    static $seq = 1;
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    return Ticket::create(array_merge([
        'ticket_number' => 'TEST-'.sprintf('%04d', $seq++),
        'period' => now()->format('Y-m'),
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'title' => 'Test Ticket Title',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan tiket test',
        'status' => 'baru',
        'source_app' => 'admin',
    ], $overrides));
}

test('admin can access input-data page with filtered tabs and search counts', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    createTestTicket([
        'classification' => 'pengaduan',
        'title' => 'Laporan Pengaduan A',
        'content' => 'Isi laporan pengaduan A',
    ]);
    createTestTicket([
        'classification' => 'aspirasi',
        'title' => 'Aspirasi B',
        'content' => 'Isi aspirasi B',
    ]);
    createTestTicket([
        'classification' => 'permintaan_informasi',
        'title' => 'Permintaan C',
        'content' => 'Isi permintaan C',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['filter' => 'pengaduan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/input-data')
            ->where('filters.filter', 'pengaduan')
            ->where('counts.semua', 3)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->where('counts.permintaan', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Laporan Pengaduan A')
        );
});

test('counts follow search query but not active tab filter', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    createTestTicket([
        'classification' => 'pengaduan',
        'title' => 'Koneksi Internet Lambat',
        'content' => 'Laporan masalah internet',
    ]);
    createTestTicket([
        'classification' => 'aspirasi',
        'title' => 'Usulan Internet Cepat',
        'content' => 'Saran kecepatan internet',
    ]);
    createTestTicket([
        'classification' => 'permintaan_informasi',
        'title' => 'Permintaan Jadwal',
        'content' => 'Tanya jadwal kegiatan',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['search' => 'Internet', 'filter' => 'pengaduan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/input-data')
            ->where('filters.search', 'Internet')
            ->where('filters.filter', 'pengaduan')
            ->where('counts.semua', 2)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->where('counts.permintaan', 0)
            ->has('tickets.data', 1)
        );
});

test('invalid filter defaults to semua', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    createTestTicket(['classification' => 'pengaduan']);
    createTestTicket(['classification' => 'pengaduan']);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['filter' => 'invalid_filter']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/input-data')
            ->where('filters.filter', 'semua')
            ->has('tickets.data', 2)
        );
});

test('admin can store ticket via input-data and unique constraint is preserved', function () {
    $admin = User::factory()->create(['name' => 'Administrator', 'role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    // Pre-create a ticket with sequence 1 for current period to test duplicate key prevention
    createTestTicket([
        'sequence' => 1,
        'period' => now()->format('Y-m'),
    ]);

    actingAs($admin)
        ->post(route('dashboard.admin.input-data.store'), [
            'classification' => 'pengaduan',
            'title' => 'Input Manual Oleh Admin',
            'channel_id' => $channel->id,
            'content' => 'Isi pengaduan manual dari admin yang panjang',
            'service_type' => 'pst',
            'tanggal_kejadian' => now()->format('Y-m-d'),
        ])
        ->assertRedirect();

    $todayStr = now()->format('dmY');
    $this->assertDatabaseHas('tickets', [
        'title' => 'Input Manual Oleh Admin',
        'ticket_number' => "Administrator/{$todayStr}/02",
        'created_by' => $admin->id,
    ]);
});

test('admin can store ticket with direct response and response attachments', function () {
    Storage::fake('public');
    $admin = User::factory()->create(['name' => 'Administrator', 'role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $file = UploadedFile::fake()->create('response_doc.pdf', 500, 'application/pdf');

    actingAs($admin)
        ->post(route('dashboard.admin.input-data.store'), [
            'classification' => 'pengaduan',
            'title' => 'Input Tiket dengan Tanggapan',
            'channel_id' => $channel->id,
            'content' => 'Isi laporan pengaduan beserta tanggapan',
            'service_type' => 'pst',
            'tanggal_kejadian' => now()->format('Y-m-d'),
            'response_type' => 'respon_substantif',
            'response_message' => 'Laporan telah ditindaklanjuti secara substantif.',
            'response_attachments' => [$file],
        ])
        ->assertRedirect();

    $ticket = Ticket::where('title', 'Input Tiket dengan Tanggapan')->first();
    expect($ticket)->not->toBeNull()
        ->and($ticket->status)->toBe('selesai');

    $response = $ticket->responses()->first();
    expect($response)->not->toBeNull()
        ->and($response->message)->toBe('Laporan telah ditindaklanjuti secara substantif.')
        ->and($response->attachments)->toHaveCount(1);
});
