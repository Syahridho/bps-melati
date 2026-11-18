<?php

use App\Console\Commands\NormalizeAdminTicketNumbersCommand;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    $this->admin = User::factory()->admin()->create(['name' => 'Administrator']);
});

function newTicketPayload(string $classification): array
{
    return [
        'classification' => $classification,
        'title' => 'Judul uji nomor tiket '.$classification,
        'content' => 'Isi uraian laporan uji yang cukup panjang untuk lolos validasi minimal 10 karakter.',
        'channel_id' => optional(Channel::where('slug', 'website')->first())?->id ?? 1,
        'service_type' => $classification === 'pengaduan' ? 'pst' : null,
        'satuan_tugas' => $classification === 'aspirasi' ? 'Satuan Tugas Uji' : null,
    ];
}

test('generator menghasilkan format baru untuk ketiga jenis klasifikasi', function () {
    $generator = app(TicketNumberGenerator::class);

    foreach (['pengaduan' => 'L', 'aspirasi' => 'A', 'permintaan_informasi' => 'I'] as $classification => $expectedPrefix) {
        $result = $generator->generate($classification);

        expect(preg_match('/^[LAI]-1400\/[0-9]{6}\/[A-Z]{2}[0-9]+$/', $result['ticket_number']))->toBe(1);
        expect($result['ticket_number'])->toStartWith($expectedPrefix.'-1400/');
        expect($result['sequence'])->toBeInt()->toBeGreaterThan(0);
    }
});

test('generator melanjutkan nomor urut terakhir tanpa duplikasi', function () {
    $period = '2026-11';

    Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/AA100',
        'period' => $period,
        'sequence' => 100,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan uji urut 100',
        'status' => 'baru',
    ]));

    $generator = app(TicketNumberGenerator::class);

    $first = $generator->generate('aspirasi', $period);
    $second = $generator->generate('permintaan_informasi', $period);

    expect($first['sequence'])->toBe(101);
    expect($second['sequence'])->toBe(102);
    expect($first['ticket_number'])->not->toBe($second['ticket_number']);
});

test('pembuatan berturut-turut jalur publik dan admin menghasilkan urutan tanpa duplikasi', function () {
    $period = '2026-11';

    $generator = app(TicketNumberGenerator::class);

    $public = $generator->generate('pengaduan', $period);
    $admin = $generator->generate('aspirasi', $period);
    $publicAgain = $generator->generate('permintaan_informasi', $period);

    $sequences = [$public['sequence'], $admin['sequence'], $publicAgain['sequence']];
    expect(array_unique($sequences))->toHaveCount(3);
    expect(max($sequences) - min($sequences))->toBe(2);
});

test('Input Data membuat tiket dengan nomor format baru dan melanjutkan urutan', function () {
    Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/AA2124',
        'period' => '2026-11',
        'sequence' => 2124,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'content' => 'Laporan admin lama untuk menentukan urutan terakhir.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $this->admin->id,
    ]));

    $response = $this->actingAs($this->admin)
        ->post(route('dashboard.admin.input-data.store'), newTicketPayload('aspirasi'))
        ->assertRedirect();

    $ticket = Ticket::where('source_app', 'admin')->latest('id')->first();

    expect($ticket->ticket_number)->toMatch('/^A-1400\/112026\/[A-Z]{2}2125$/');
    expect($ticket->sequence)->toBe(2125);
    expect($ticket->source_app)->toBe('admin');
    expect($ticket->created_by)->toBe($this->admin->id);
});

test('Edit jenis laporan tidak mengubah nomor tiket', function () {
    $ticket = Ticket::create(array_merge([
        'ticket_number' => 'A-1400/112026/AA999',
        'period' => '2026-11',
        'sequence' => 999,
        'classification' => 'aspirasi',
        'channel_id' => $this->channel->id,
        'content' => 'Isi laporan aspirasi untuk pengujian edit.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $this->admin->id,
    ]));

    $this->actingAs($this->admin)
        ->put(route('dashboard.admin.input-data.update', $ticket->ticket_number), [
            'reporter_name' => 'Nama Diubah',
            'reporter_email' => null,
            'reporter_wa' => null,
            'title' => 'Judul Diubah',
            'content' => 'Isi yang telah diperbarui.',
        ])
        ->assertRedirect();

    expect($ticket->fresh()->ticket_number)->toBe('A-1400/112026/AA999');
    expect($ticket->fresh()->classification)->toBe('aspirasi');
});

test('command dry-run tidak mengubah data dan menampilkan pemetaan', function () {
    Carbon::setTestNow(Carbon::create(2026, 11, 13, 10, 0, 0, 'Asia/Jakarta'));

    $adminTicket = Ticket::create(array_merge([
        'ticket_number' => 'Administrator/13112026/2124',
        'period' => '2026-11',
        'sequence' => 2124,
        'classification' => 'aspirasi',
        'channel_id' => $this->channel->id,
        'content' => 'Tiket admin format lama.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $this->admin->id,
    ]));

    // Tiket pelapor aktif harus dilewati, tidak diubah.
    Ticket::create(array_merge([
        'ticket_number' => 'Administrator/14112026/2128',
        'period' => '2026-11',
        'sequence' => 2128,
        'classification' => 'pengaduan',
        'channel_id' => $this->channel->id,
        'reporter_name' => 'Pelapor Aktif',
        'reporter_email' => 'pelapor@example.com',
        'content' => 'Tiket lama dengan pelapor aktif.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $this->admin->id,
    ]));

    Artisan::call(NormalizeAdminTicketNumbersCommand::class, ['--dry-run' => true]);

    $output = Artisan::output();

    expect($output)->toContain('Administrator/13112026/2124');
    expect($output)->toContain('A-1400/112026/');
    expect($output)->toContain('DRY RUN');

    // Data tidak berubah setelah dry-run.
    expect($adminTicket->fresh()->ticket_number)->toBe('Administrator/13112026/2124');
    expect(Ticket::where('ticket_number', 'Administrator/13112026/2124')->count())->toBe(1);

    Carbon::setTestNow(null);
});

test('command mengubah nomor lama ke baru dan menjaga keunikan', function () {
    Carbon::setTestNow(Carbon::create(2026, 11, 13, 10, 0, 0, 'Asia/Jakarta'));

    $ticket = Ticket::create(array_merge([
        'ticket_number' => 'Administrator/13112026/2124',
        'period' => '2026-11',
        'sequence' => 2124,
        'classification' => 'aspirasi',
        'channel_id' => $this->channel->id,
        'content' => 'Tiket admin format lama.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $this->admin->id,
    ]));

    Artisan::call(NormalizeAdminTicketNumbersCommand::class);

    $output = Artisan::output();

    $ticket->refresh();

    expect($ticket->ticket_number)->toMatch('/^A-1400\/112026\/[A-Z]{2}2124$/');
    expect($ticket->sequence)->toBe(2124);
    expect($ticket->period)->toBe('2026-11');
    expect($output)->toContain('dinormalisasi');
    expect(Ticket::where('ticket_number', 'Administrator/13112026/2124')->count())->toBe(0);

    Carbon::setTestNow(null);
});
