<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use App\Services\AuditFlagDetector;
use App\Services\AuditLogger;
use App\Support\ClientIpResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\artisan;

test('ClientIpResolver membaca IP asli dari X-Forwarded-For ketika berasal dari proxy tepercaya', function () {
    config(['trustedproxy.proxies' => '127.0.0.1,::1']);

    $request = Request::create('/', 'GET', [], [], [], [
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_X_FORWARDED_FOR' => '203.0.113.45',
    ]);
    $request->setTrustedProxies(['127.0.0.1', '::1'], Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO);

    expect(ClientIpResolver::resolve($request))->toBe('203.0.113.45');
});

test('ClientIpResolver mengabaikan header X-Forwarded-For dan CF-Connecting-IP dari sumber tidak tepercaya', function () {
    config(['trustedproxy.proxies' => '127.0.0.1,::1']);

    $request = Request::create('/', 'GET', [], [], [], [
        'REMOTE_ADDR' => '198.51.100.20',
        'HTTP_X_FORWARDED_FOR' => '203.0.113.99',
        'HTTP_CF_CONNECTING_IP' => '203.0.113.88',
    ]);
    $request->setTrustedProxies(['127.0.0.1', '::1'], Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO);

    expect(ClientIpResolver::resolve($request))->toBe('198.51.100.20');
});

test('ClientIpResolver membaca CF-Connecting-IP ketika REMOTE_ADDR adalah proxy tepercaya', function () {
    config(['trustedproxy.proxies' => '127.0.0.1,::1']);

    $request = Request::create('/', 'GET', [], [], [], [
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_CF_CONNECTING_IP' => '203.0.113.77',
    ]);

    expect(ClientIpResolver::resolve($request))->toBe('203.0.113.77');
});

test('ClientIpResolver menormalisasi IPv4-mapped IPv6, daftar koma, IPv6, dan menolak IP tidak valid', function () {
    expect(ClientIpResolver::normalize('::ffff:1.2.3.4'))->toBe('1.2.3.4')
        ->and(ClientIpResolver::equals('::ffff:1.2.3.4', '1.2.3.4'))->toBeTrue()
        ->and(ClientIpResolver::normalize(' 203.0.113.10 , 10.0.0.1 '))->toBe('203.0.113.10')
        ->and(ClientIpResolver::normalize('2001:0DB8:0000:0000:0000:0000:0000:0001'))->toBe('2001:db8::1')
        ->and(ClientIpResolver::normalize('bukan-ip'))->toBeNull()
        ->and(ClientIpResolver::normalize(''))->toBeNull()
        ->and(ClientIpResolver::normalize(null))->toBeNull()
        ->and(ClientIpResolver::isLoopback('127.0.0.1'))->toBeTrue()
        ->and(ClientIpResolver::isLoopback('::1'))->toBeTrue()
        ->and(ClientIpResolver::isLoopback('::ffff:127.0.0.1'))->toBeTrue()
        ->and(ClientIpResolver::isLoopback('192.168.1.10'))->toBeFalse();
});

test('AuditFlagDetector tidak membuat jaringan_sama untuk IP loopback dan mencatat warning', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-IP-LOOP-1',
        'period' => now()->format('Y-m'),
        'sequence' => 9101,
        'classification' => 'pengaduan',
        'title' => 'Test loopback',
        'content' => 'Isi tiket test loopback.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'completed_at' => now(),
        'assigned_to' => $operator->id,
        'source_app' => 'web',
    ]);

    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan cukup panjang untuk test.',
        'sent_at' => now()->subMinutes(20),
    ]);

    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '127.0.0.1',
        'created_at' => now()->subMinutes(20),
    ]);

    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '127.0.0.1',
    ]);

    $request = Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '127.0.0.1']);

    Log::shouldReceive('warning')
        ->once()
        ->withArgs(fn (string $message) => str_contains($message, 'Deteksi jaringan_sama dilewati karena IP loopback'));
    Log::shouldReceive('info')->zeroOrMoreTimes();
    Log::shouldReceive('error')->zeroOrMoreTimes();

    app(AuditFlagDetector::class)->detect($ticket, $completionLog, $request);

    expect(AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_JARINGAN_SAMA)->exists())->toBeFalse();
});

test('AuditFlagDetector tetap membuat jaringan_sama untuk IP sama non-loopback termasuk LAN dan IPv4-mapped IPv6', function () {
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-IP-LAN-1',
        'period' => now()->format('Y-m'),
        'sequence' => 9102,
        'classification' => 'pengaduan',
        'title' => 'Test IP LAN sama',
        'content' => 'Isi tiket test IP LAN.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'completed_at' => now(),
        'assigned_to' => $operator->id,
        'source_app' => 'web',
    ]);

    TicketResponse::create([
        'ticket_id' => $ticket->id,
        'user_id' => $operator->id,
        'type' => 'respon_awal',
        'message' => 'Balasan cukup panjang untuk test.',
        'sent_at' => now()->subMinutes(20),
    ]);

    AuditLog::create([
        'event_type' => 'ticket.replied',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '::ffff:192.168.1.55',
        'created_at' => now()->subMinutes(20),
    ]);

    $completionLog = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '192.168.1.55',
    ]);

    $request = Request::create('/', 'POST', [], [], [], ['REMOTE_ADDR' => '192.168.1.55']);

    app(AuditFlagDetector::class)->detect($ticket, $completionLog, $request);

    $flag = AuditFlag::where('ticket_id', $ticket->id)->where('type', AuditFlag::TYPE_JARINGAN_SAMA)->first();
    expect($flag)->not->toBeNull()
        ->and($flag->details['reporter_ip'])->toBe('192.168.1.55')
        ->and($flag->details['pic_ip'])->toBe('192.168.1.55');
});

test('AuditLogger dan jalur balasan/penutupan memakai ClientIpResolver dari trusted proxy', function () {
    config(['trustedproxy.proxies' => '127.0.0.1,::1']);

    $operator = User::factory()->create(['role' => 'operator', 'is_active' => true]);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $ticket = Ticket::create([
        'ticket_number' => 'T-IP-PROXY-1',
        'period' => now()->format('Y-m'),
        'sequence' => 9103,
        'classification' => 'pengaduan',
        'title' => 'Test proxy IP',
        'content' => 'Isi tiket test proxy.',
        'channel_id' => $channel->id,
        'status' => 'baru',
        'assigned_to' => $operator->id,
        'source_app' => 'web',
    ]);

    // Balasan PIC lewat proxy (IP PIC: 203.0.113.10)
    actingAs($operator)
        ->withServerVariables([
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.10',
        ])
        ->post(route('dashboard.operator.incoming-reports.responses.store', $ticket), [
            'response_type' => 'respon_awal',
            'response_message' => 'Balasan resmi dari jaringan kantor operator.',
        ])
        ->assertRedirect();

    $replyLog = AuditLog::where('ticket_id', $ticket->id)->where('event_type', 'ticket.replied')->latest('id')->first();
    expect($replyLog)->not->toBeNull()
        ->and($replyLog->ip)->toBe('203.0.113.10');

    // AuditLogger::log dengan CF-Connecting-IP dari proxy tepercaya
    $cfRequest = Request::create('/', 'POST', [], [], [], [
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_CF_CONNECTING_IP' => '198.51.100.77',
    ]);
    $customLog = AuditLogger::log('ticket.completed_by_reporter', 'ticket', ticket: $ticket, request: $cfRequest);
    expect($customLog?->ip)->toBe('198.51.100.77');
});

test('command audit:fix-loopback-flags dry-run tidak mengubah data dan force menandai penanda loopback sebagai wajar', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $ticket = Ticket::create([
        'ticket_number' => 'T-FIX-LOOP-1',
        'period' => now()->format('Y-m'),
        'sequence' => 9104,
        'classification' => 'pengaduan',
        'title' => 'Test fix loopback',
        'content' => 'Isi tiket test fix loopback.',
        'channel_id' => $channel->id,
        'status' => 'selesai',
        'source_app' => 'web',
    ]);
    $log = AuditLog::create([
        'event_type' => 'ticket.completed_by_reporter',
        'category' => 'ticket',
        'severity' => 'info',
        'ticket_id' => $ticket->id,
        'ip' => '127.0.0.1',
    ]);

    $loopbackFlag = AuditFlag::create([
        'type' => AuditFlag::TYPE_JARINGAN_SAMA,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticket->id,
        'audit_log_id' => $log->id,
        'details' => ['reporter_ip' => '127.0.0.1', 'pic_ip' => '127.0.0.1'],
        'status' => AuditFlag::STATUS_BARU,
    ]);

    $realFlag = AuditFlag::create([
        'type' => AuditFlag::TYPE_JARINGAN_SAMA,
        'severity' => AuditFlag::SEVERITY_WARNING,
        'ticket_id' => $ticket->id,
        'audit_log_id' => $log->id,
        'details' => ['reporter_ip' => '203.0.113.5', 'pic_ip' => '203.0.113.5'],
        'status' => AuditFlag::STATUS_BARU,
    ]);

    // Default (dry-run): tidak mengubah data
    artisan('audit:fix-loopback-flags')->assertSuccessful();
    expect($loopbackFlag->fresh()->status)->toBe(AuditFlag::STATUS_BARU)
        ->and($realFlag->fresh()->status)->toBe(AuditFlag::STATUS_BARU);

    // Force: hanya loopbackFlag yang diubah ke wajar
    artisan('audit:fix-loopback-flags --force')->assertSuccessful();
    expect($loopbackFlag->fresh()->status)->toBe(AuditFlag::STATUS_WAJAR)
        ->and($loopbackFlag->fresh()->review_note)->toBe('Auto: IP loopback (salah konfigurasi proxy)')
        ->and($realFlag->fresh()->status)->toBe(AuditFlag::STATUS_BARU);
});

test('command ip:diagnose berjalan sukses', function () {
    artisan('ip:diagnose')->assertSuccessful();
});
