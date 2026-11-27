<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Services\AuditFlagDetector;
use App\Support\AuditFlagTimeCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

use function Pest\Laravel\artisan;

uses(RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow();
});

function makeTimeFlagTicket(array $overrides = []): Ticket
{
    static $seq = 1;
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    return Ticket::create(array_merge([
        'ticket_number' => 'TIME-'.sprintf('%04d', $seq++),
        'period' => now()->format('Y-m'),
        'sequence' => 9500 + $seq,
        'classification' => 'pengaduan',
        'title' => 'Tiket uji perhitungan waktu',
        'content' => 'Isi tiket uji perhitungan waktu penanda.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'closed_reason' => 'reporter',
        'source_app' => 'web',
    ], $overrides));
}

test('format durasi Indonesia untuk kurang dari 1 detik, 5 detik, 90 detik, dan 2 jam 3 menit', function () {
    expect(AuditFlagTimeCalculator::formatDuration(0))->toBe('kurang dari 1 detik')
        ->and(AuditFlagTimeCalculator::formatDuration(0.4))->toBe('kurang dari 1 detik')
        ->and(AuditFlagTimeCalculator::formatDuration(5))->toBe('5 detik')
        ->and(AuditFlagTimeCalculator::formatDuration(90))->toBe('1 menit 30 detik')
        ->and(AuditFlagTimeCalculator::formatDuration(7380))->toBe('2 jam 3 menit');
});

test('selisih 5 detik dan 90 detik dicatat akurat beserta ambang batas', function () {
    $now = Carbon::create(2026, 11, 27, 10, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);

    // Kasus 5 detik
    $ticket5 = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket5->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan operator untuk kasus 5 detik.',
        'sent_at' => $now->copy()->subSeconds(5),
    ]);
    $log5 = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket5->id,
        'ip' => '203.0.113.10',
    ]);

    app(AuditFlagDetector::class)->detect($ticket5, $log5, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.10']));

    $selesai5 = AuditFlag::where('ticket_id', $ticket5->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();
    $rating5 = AuditFlag::where('ticket_id', $ticket5->id)->where('type', AuditFlag::TYPE_RATING_CEPAT)->first();

    // Hanya selesai_cepat_setelah_balasan yang dibuat, bukan rating_cepat
    expect($selesai5)->not->toBeNull()
        ->and($selesai5->details['selisih_detik'])->toBe(5)
        ->and($selesai5->details['catatan'])->toContain('5 detik')
        ->and($selesai5->details['catatan'])->toContain('batas wajar: minimal 10 menit')
        ->and($rating5)->toBeNull();

    // Kasus 90 detik
    $ticket90 = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 4,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket90->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan operator untuk kasus 90 detik.',
        'sent_at' => $now->copy()->subSeconds(90),
    ]);
    $log90 = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket90->id,
        'ip' => '203.0.113.11',
    ]);

    app(AuditFlagDetector::class)->detect($ticket90, $log90, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.11']));

    $selesai90 = AuditFlag::where('ticket_id', $ticket90->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();
    expect($selesai90)->not->toBeNull()
        ->and($selesai90->details['selisih_detik'])->toBe(90)
        ->and($selesai90->details['catatan'])->toContain('1 menit 30 detik');
});

test('memakai balasan operator terakhir sebelum aksi (bukan balasan pertama) dan di atas ambang tidak membuat penanda', function () {
    $now = Carbon::create(2026, 11, 27, 11, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);

    // Balasan pertama 1 hari lalu, balasan terakhir 45 detik lalu -> harus pakai 45 detik.
    $ticket = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan pertama.',
        'sent_at' => $now->copy()->subDay(),
    ]);
    $lastReply = TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_substantif',
        'message' => 'Balasan terakhir sebelum ditutup.',
        'sent_at' => $now->copy()->subSeconds(45),
    ]);
    $log = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.12',
    ]);

    app(AuditFlagDetector::class)->detect($ticket, $log, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.12']));

    $flag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();
    expect($flag)->not->toBeNull()
        ->and($flag->details['selisih_detik'])->toBe(45)
        ->and($flag->details['response_id'])->toBe($lastReply->id);

    // Tiket dengan jeda 15 menit (di atas ambang 10 menit dan 5 menit) -> tidak membuat penanda waktu.
    $ticketAbove = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticketAbove->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan 15 menit lalu.',
        'sent_at' => $now->copy()->subMinutes(15),
    ]);
    $logAbove = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticketAbove->id,
        'ip' => '203.0.113.13',
    ]);

    app(AuditFlagDetector::class)->detect($ticketAbove, $logAbove, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.13']));

    expect(AuditFlag::where('ticket_id', $ticketAbove->id)->whereIn('type', [
        AuditFlag::TYPE_RATING_CEPAT,
        AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
    ])->exists())->toBeFalse();
});

test('penanda rating dan penutupan dihitung terpisah sesuai timestamp masing-masing', function () {
    $now = Carbon::create(2026, 11, 27, 12, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);

    // Balasan pada t-400 detik, ditutup pada t-350 detik (selisih 50 detik -> kena selesai_cepat),
    // rating pada t=0 (selisih 400 detik -> di atas ambang 300 detik, tidak kena rating_cepat).
    $ticket = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy()->subSeconds(350),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan operator.',
        'sent_at' => $now->copy()->subSeconds(400),
    ]);
    $log = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.14',
    ]);

    app(AuditFlagDetector::class)->detect($ticket, $log, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.14']));

    $selesaiFlag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();
    $ratingFlag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_RATING_CEPAT)->first();

    expect($selesaiFlag)->not->toBeNull()
        ->and($selesaiFlag->details['selisih_detik'])->toBe(50)
        ->and($ratingFlag)->toBeNull();
});

test('selisih negatif atau tanpa balasan operator tidak membuat penanda waktu, mencatat warning, dan tidak memengaruhi jaringan_sama', function () {
    $now = Carbon::create(2026, 11, 27, 13, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);

    // Tidak ada balasan operator sebelum completed_at, tapi IP sama dengan PIC (jaringan_sama tetap dibuat).
    $ticket = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.20',
    ]);
    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.20',
    ]);

    Log::shouldReceive('warning')->atLeast()->once();
    Log::shouldReceive('info')->zeroOrMoreTimes();
    Log::shouldReceive('error')->zeroOrMoreTimes();

    app(AuditFlagDetector::class)->detect($ticket, $completionLog, Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.20']));

    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_JARINGAN_SAMA)->exists())->toBeTrue()
        ->and(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->exists())->toBeFalse()
        ->and(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_RATING_CEPAT)->exists())->toBeFalse();

    // Uji langsung helper untuk selisih negatif (UTC vs Asia/Jakarta konsisten)
    $replyUtc = Carbon::parse('2026-11-27 06:00:10', 'UTC'); // 13:00:10 WIB
    $actionWib = Carbon::parse('2026-11-27 13:00:00', 'Asia/Jakarta');
    expect(AuditFlagTimeCalculator::elapsedSeconds($replyUtc, $actionWib))->toBeNull();

    $actionAfterWib = Carbon::parse('2026-11-27 13:00:25', 'Asia/Jakarta');
    expect(AuditFlagTimeCalculator::elapsedSeconds($replyUtc, $actionAfterWib))->toBe(15.0);
});

test('command audit:recalculate-flag-times dry-run tidak mengubah data dan force menghitung ulang serta menandai yang melebihi ambang sebagai wajar', function () {
    $now = Carbon::create(2026, 11, 27, 14, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);
    $log = AuditLog::create([
        'event_type' => 'ticket.rated',
        'category' => 'ticket',
        'severity' => 'notice',
    ]);

    // Flag valid (selisih nyata 12 detik, sebelumnya tercatat 0 detik)
    $ticketFast = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'completed_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticketFast->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan cepat.',
        'sent_at' => $now->copy()->subSeconds(12),
    ]);
    $fastFlag = AuditFlag::create([
        'type' => AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketFast->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => ['selisih_detik' => 0, 'catatan' => 'Tiket ditutup 0 detik setelah balasan operator.'],
    ]);

    // Flag palsu (selisih nyata 20 menit, sebelumnya tercatat 0 detik)
    $ticketSlow = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticketSlow->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan 20 menit lalu.',
        'sent_at' => $now->copy()->subMinutes(20),
    ]);
    $slowFlag = AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketSlow->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => ['selisih_detik' => 0, 'catatan' => 'Rating diberikan 0 detik setelah balasan operator.'],
    ]);

    // Dry-run default: tidak mengubah data
    artisan('audit:recalculate-flag-times')->assertSuccessful();
    expect($fastFlag->fresh()->details['selisih_detik'])->toBe(0)
        ->and($slowFlag->fresh()->status)->toBe(AuditFlag::STATUS_BARU);

    // Force: perbarui alasan dan tandai slowFlag sebagai wajar (selisih 1200s >= ambang 600s)
    artisan('audit:recalculate-flag-times --force')->assertSuccessful();
    expect($fastFlag->fresh()->details['selisih_detik'])->toBe(12)
        ->and($fastFlag->fresh()->details['catatan'])->toContain('12 detik')
        ->and($fastFlag->fresh()->status)->toBe(AuditFlag::STATUS_BARU)
        ->and($slowFlag->fresh()->details['selisih_detik'])->toBe(1200)
        ->and($slowFlag->fresh()->status)->toBe(AuditFlag::STATUS_WAJAR)
        ->and($slowFlag->fresh()->review_note)->toBe('Auto: dihitung ulang, tidak memenuhi ambang');
});

test('tutup cepat dengan atau tanpa rating bersamaan membuat tepat satu penanda selesai_cepat_setelah_balasan dan idempoten', function () {
    $now = Carbon::create(2026, 11, 27, 15, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);

    // Penutupan + rating bersamaan (rated_at === completed_at)
    $ticket = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan operator sebelum penutupan.',
        'sent_at' => $now->copy()->subSeconds(30),
    ]);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.30',
    ]);

    $detector = app(AuditFlagDetector::class);
    $req = Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.30']);
    $detector->detect($ticket, $log, $req);
    $detector->detect($ticket, $log, $req); // Event ganda

    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_RATING_CEPAT)->count())->toBe(0)
        ->and(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->count())->toBe(1);

    $selesaiFlag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();
    expect($selesaiFlag->details['selisih_detik'])->toBe(30)
        ->and($selesaiFlag->details['catatan'])->toBe('Tiket ditutup 30 detik setelah balasan operator (batas wajar: minimal 10 menit).');
});

test('jaringan_sama tetap dapat digabung dengan selesai_cepat_setelah_balasan dan tingkat/severity sesuai aturan', function () {
    $now = Carbon::create(2026, 11, 27, 16, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $operator = User::factory()->create(['role' => 'operator']);
    $ticket = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'rating' => 5,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan singkat operator.',
        'sent_at' => $now->copy()->subSeconds(180), // 3 menit -> dasar sedang, naik menjadi tinggi karena IP sama + rating 5
    ]);
    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.55',
    ]);
    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'notice',
        'ticket_id' => $ticket->id,
        'ip' => '203.0.113.55',
    ]);

    app(AuditFlagDetector::class)->detect(
        $ticket,
        $completionLog,
        Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '203.0.113.55']),
    );

    $jaringanFlag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_JARINGAN_SAMA)->first();
    $selesaiFlag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)->first();

    expect($jaringanFlag)->not->toBeNull()
        ->and($jaringanFlag->severity)->toBe(AuditFlag::SEVERITY_WARNING)
        ->and($selesaiFlag)->not->toBeNull()
        ->and($selesaiFlag->details['tingkat'])->toBe('tinggi')
        ->and($selesaiFlag->severity)->toBe(AuditFlag::SEVERITY_WARNING)
        ->and($selesaiFlag->details['same_ip'])->toBeTrue();
});

test('command audit:merge-quick-flags dry-run aman, force menggabungkan tanpa menimpa status/catatan admin, dan idempoten', function () {
    $now = Carbon::create(2026, 11, 27, 17, 0, 0, 'Asia/Jakarta');
    Carbon::setTestNow($now);

    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'notice',
    ]);

    // 1. Tiket dengan 2 penanda (rating_cepat + selesai_cepat), salah satunya sudah ditinjau admin
    $ticketBoth = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    $selesaiBoth = AuditFlag::create([
        'type' => AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketBoth->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_TINDAK_LANJUT,
        'reviewed_by' => $admin->id,
        'review_note' => 'Sudah dicek admin',
        'details' => ['selisih_detik' => 20, 'catatan' => 'Tiket ditutup 20 detik setelah balasan operator (batas wajar: minimal 10 menit). Rating juga diberikan bersamaan.', 'rated_at' => $now->toIso8601String()],
    ]);
    $ratingBoth = AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketBoth->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => ['selisih_detik' => 20, 'catatan' => 'Rating diberikan 20 detik setelah balasan operator.'],
    ]);

    // 2. Tiket tertutup yang hanya punya rating_cepat (harus dikonversi ke selesai_cepat)
    $ticketRatingOnly = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'status' => 'selesai',
        'completed_at' => $now->copy(),
        'rated_at' => $now->copy(),
    ]);
    TicketResponse::create([
        'ticket_id' => $ticketRatingOnly->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan operator.',
        'sent_at' => $now->copy()->subSeconds(15),
    ]);
    $ratingOnly = AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticketRatingOnly->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => ['selisih_detik' => 15, 'catatan' => 'Rating diberikan 15 detik setelah balasan operator.'],
    ]);

    // 3. Tiket belum selesai yang punya rating_cepat (harus dilewati)
    $ticketOpen = makeTimeFlagTicket([
        'assigned_to' => $operator->id,
        'status' => 'proses',
        'completed_at' => null,
        'rated_at' => null,
    ]);
    $ratingOpen = AuditFlag::create([
        'type' => AuditFlag::TYPE_RATING_CEPAT,
        'severity' => AuditFlag::SEVERITY_NOTICE,
        'ticket_id' => $ticketOpen->id,
        'audit_log_id' => $log->id,
        'status' => AuditFlag::STATUS_BARU,
        'details' => ['selisih_detik' => 10],
    ]);

    // Dry-run: tidak mengubah data
    artisan('audit:merge-quick-flags')->assertSuccessful();
    expect(AuditFlag::find($ratingBoth->id))->not->toBeNull()
        ->and($ratingOnly->fresh()->type)->toBe(AuditFlag::TYPE_RATING_CEPAT)
        ->and($ratingOpen->fresh()->type)->toBe(AuditFlag::TYPE_RATING_CEPAT);

    // Force: gabungkan dan konversi
    artisan('audit:merge-quick-flags --force')->assertSuccessful();
    expect(AuditFlag::find($ratingBoth->id))->toBeNull()
        ->and($selesaiBoth->fresh()->status)->toBe(AuditFlag::STATUS_TINDAK_LANJUT)
        ->and($selesaiBoth->fresh()->review_note)->toBe('Sudah dicek admin')
        ->and($selesaiBoth->fresh()->details['catatan'])->not->toContain('Rating juga diberikan bersamaan')
        ->and(array_key_exists('rated_at', $selesaiBoth->fresh()->details))->toBeFalse()
        ->and($ratingOnly->fresh()->type)->toBe(AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)
        ->and($ratingOnly->fresh()->details['catatan'])->toContain('Tiket ditutup 15 detik setelah balasan operator')
        ->and($ratingOpen->fresh()->type)->toBe(AuditFlag::TYPE_RATING_CEPAT);

    // Jalankan ulang: aman / idempoten
    artisan('audit:merge-quick-flags --force')->assertSuccessful();
    expect($selesaiBoth->fresh()->review_note)->toBe('Sudah dicek admin')
        ->and($ratingOnly->fresh()->type)->toBe(AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN);

    // Badge konsisten untuk admin: 2 tiket baru (ticketRatingOnly + ticketOpen), ticketBoth tidak dihitung karena tindak_lanjut
    $this->actingAs($admin)
        ->get(route('audit-log.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('audit_log_badge', 2));
});
