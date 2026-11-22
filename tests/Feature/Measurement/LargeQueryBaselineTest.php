<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Model::preventLazyLoading();
});

test('large query baseline', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operators = User::factory()->count(5)->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1]);

    $statuses = ['baru', 'respon_awal', 'respon_substantif', 'selesai'];
    $classifications = ['pengaduan', 'aspirasi', 'permintaan_informasi'];

    $ticketCount = 200;
    $tickets = [];
    for ($i = 1; $i <= $ticketCount; $i++) {
        $status = $statuses[$i % count($statuses)];
        $ticket = Ticket::create([
            'ticket_number' => 'T-'.str_pad((string) $i, 5, '0', STR_PAD_LEFT),
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
        $tickets[] = $ticket;

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

    $operator = $operators[0];

    $endpoints = [
        ['admin', 'GET', 'dashboard.admin.incoming-reports.index', []],
        ['admin', 'GET', 'dashboard.admin.completed-reports.index', []],
        ['admin', 'GET', 'dashboard.admin.input-data.index', []],
        ['admin', 'GET', 'dashboard.admin.periodic-recap.index', []],
        ['admin', 'GET', 'audit-log.index', []],
        ['admin', 'GET', 'audit-flag.index', []],
        ['admin', 'GET', 'audit-log.flags-summary', []],
        ['admin', 'GET', 'audit-log.summary-weekly', []],
        ['operator', 'GET', 'dashboard.operator.incoming-reports.index', []],
        ['operator', 'GET', 'dashboard.operator.my-reports.index', []],
    ];

    $lines = [];
    $lines[] = 'Large query baseline (preventLazyLoading enabled)';
    $lines[] = 'Rows: tickets='.$ticketCount.', operators=5, audit_flags='.AuditFlag::count().', audit_logs='.AuditLog::count();
    $lines[] = str_repeat('-', 80);

    foreach ($endpoints as [$role, $method, $name, $params]) {
        $user = $role === 'admin' ? $admin : $operator;
        $count = 0;
        $start = microtime(true);
        DB::listen(function () use (&$count) {
            $count++;
        });
        try {
            $response = $this->actingAs($user)->get(route($name, $params));
            $status = $response->getStatusCode();
        } catch (Throwable $e) {
            $status = 'EXC: '.get_class($e).' '.$e->getMessage();
        }
        $ms = round((microtime(true) - $start) * 1000, 2);
        $lines[] = sprintf('%s | %s | queries=%d | %sms | status=%s', $role, $name, $count, $ms, $status);
    }

    // cek tiket (public check endpoint)
    $checkTicket = $tickets[0];
    $count = 0;
    $start = microtime(true);
    DB::listen(function () use (&$count) {
        $count++;
    });
    try {
        $response = $this->get(route('tickets.check').'?ticket_number='.urlencode($checkTicket->ticket_number));
        $status = $response->getStatusCode();
    } catch (Throwable $e) {
        $status = 'EXC: '.get_class($e);
    }
    $ms = round((microtime(true) - $start) * 1000, 2);
    $lines[] = sprintf('public | tickets.check | queries=%d | %sms | status=%s', $count, $ms, $status);

    // API tiket store not measured (write)

    file_put_contents(base_path('docs/query-baseline.txt'), implode("\n", $lines)."\n");
    expect(true)->toBeTrue();
});
