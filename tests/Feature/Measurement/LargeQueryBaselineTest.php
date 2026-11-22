<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Model::preventLazyLoading();
});

function seedLargeDataset(int $ticketCount): array
{
    $admin = User::factory()->create(['role' => 'admin']);
    $operators = User::factory()->count(5)->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $statuses = ['baru', 'respon_awal', 'respon_substantif', 'selesai'];
    $classifications = ['pengaduan', 'aspirasi', 'permintaan_informasi'];

    for ($i = 1; $i <= $ticketCount; $i++) {
        $status = $statuses[$i % count($statuses)];
        $ticket = Ticket::create([
            'ticket_number' => 'T-'.str_pad((string) $i, 5, '0', STR_PAD_LEFT).'-'.$ticketCount,
            'period' => now()->format('mY'),
            'sequence' => $i,
            'classification' => $classifications[$i % count($classifications)],
            'title' => 'Ticket title '.$i,
            'content' => 'Ticket content '.$i,
            'channel_id' => $channel->id,
            'reporter_name' => 'Reporter '.$i,
            'reporter_email' => 'reporter'.$i.'@example.com',
            'status' => $status,
            'is_read' => (bool) ($i % 2),
            'source_app' => 'web',
            'assigned_to' => $operators[$i % 5]->id,
            'assigned_at' => now(),
            'created_at' => now()->subDays($i % 30),
            'updated_at' => now()->subDays($i % 30),
        ]);

        if ($i % 3 === 0) {
            TicketResponse::create([
                'ticket_id' => $ticket->id,
                'user_id' => $operators[$i % 5]->id,
                'type' => 'response',
                'message' => 'Response '.$i,
            ]);
        }

        if ($i % 5 === 0) {
            $log = AuditLog::create([
                'event_type' => 'ticket.status_changed',
                'category' => 'ticket',
                'severity' => 'info',
                'ticket_id' => $ticket->id,
            ]);
            AuditFlag::create([
                'type' => 'jaringan_sama',
                'severity' => 'warning',
                'status' => 'baru',
                'audit_log_id' => $log->id,
                'ticket_id' => $ticket->id,
                'details' => ['tingkat' => 'tinggi'],
            ]);
        }
    }

    return [$admin, $operators[0]];
}

function runMeasurements($admin, $operator): array
{
    $GLOBALS['qcount'] = 0;
    DB::listen(function () {
        $GLOBALS['qcount']++;
    });

    $endpoints = [
        ['admin', 'dashboard.admin.index'],
        ['admin', 'dashboard.admin.incoming-reports.index'],
        ['admin', 'dashboard.admin.completed-reports.index'],
        ['admin', 'dashboard.admin.input-data.index'],
        ['admin', 'dashboard.admin.periodic-recap.index'],
        ['admin', 'audit-log.index'],
        ['admin', 'audit-flag.index'],
        ['admin', 'audit-log.flags-summary'],
        ['admin', 'audit-log.summary-weekly'],
        ['operator', 'dashboard.operator.incoming-reports.index'],
        ['operator', 'dashboard.operator.my-reports.index'],
    ];

    $results = [];
    foreach ($endpoints as [$role, $name]) {
        $user = $role === 'admin' ? $admin : $operator;
        $counts = [];
        $times = [];
        for ($run = 0; $run < 5; $run++) {
            Cache::flush();
            $GLOBALS['qcount'] = 0;
            $start = microtime(true);
            try {
                $response = test()->actingAs($user)->get(route($name));
                $status = $response->getStatusCode();
            } catch (Throwable $e) {
                $status = 'EXC';
            }
            $counts[] = $GLOBALS['qcount'];
            $times[] = round((microtime(true) - $start) * 1000, 2);
        }
        sort($counts);
        sort($times);
        $results[] = sprintf('%s | %s | q_med=%d (min=%d max=%d) | ms_med=%s',
            $role, $name, $counts[2], $counts[0], $counts[4], $times[2]);
    }

    $firstTicket = Ticket::query()->first();
    $counts = [];
    $times = [];
    for ($run = 0; $run < 5; $run++) {
        Cache::flush();
        $GLOBALS['qcount'] = 0;
        $start = microtime(true);
        try {
            $response = test()->get(route('tickets.check').'?ticket_number='.urlencode($firstTicket->ticket_number));
            $status = $response->getStatusCode();
        } catch (Throwable $e) {
            $status = 'EXC';
        }
        $counts[] = $GLOBALS['qcount'];
        $times[] = round((microtime(true) - $start) * 1000, 2);
    }
    sort($counts);
    sort($times);
    $results[] = sprintf('public | tickets.check | q_med=%d (min=%d max=%d) | ms_med=%s',
        $counts[2], $counts[0], $counts[4], $times[2]);

    return $results;
}

test('large query baseline 200', function () {
    [$admin, $operator] = seedLargeDataset(200);
    $results = runMeasurements($admin, $operator);
    file_put_contents(base_path('docs/query-baseline.txt'), "=== 200 tickets ===\n".implode("\n", $results)."\n");
    expect(true)->toBeTrue();
})->group('measurement');

test('large query baseline 400', function () {
    [$admin, $operator] = seedLargeDataset(400);
    $results = runMeasurements($admin, $operator);
    file_put_contents(base_path('docs/query-baseline.txt'), file_get_contents(base_path('docs/query-baseline.txt'))."\n=== 400 tickets ===\n".implode("\n", $results)."\n");
    expect(true)->toBeTrue();
})->group('measurement');
