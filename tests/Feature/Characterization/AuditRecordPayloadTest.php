<?php

use App\Actions\RecordAuditFlagReviewAudit;
use App\Actions\RecordAuditLogExportAudit;
use App\Actions\RecordReporterCompletionAudit;
use App\Actions\RecordSettingUpdateAudit;
use App\Models\AuditLog;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

test('audit: reporter completion locks event_type, category, severity, payload keys', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'T-9001',
        'period' => now()->format('mY'),
        'sequence' => 9001,
        'channel_id' => Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1])->id,
        'reporter_name' => 'Pelapor',
        'classification' => 'pengaduan',
        'title' => 'Judul',
        'content' => 'Isi',
        'status' => 'selesai',
        'rating' => 5,
        'rating_comment' => 'ok',
    ]);

    $request = Request::create('/x', 'POST');

    app(RecordReporterCompletionAudit::class)->handle($ticket, $request, true);

    $log = AuditLog::latest('id')->first();
    expect($log->event_type)->toBe('ticket.rated');
    expect($log->category)->toBe('ticket');
    expect($log->severity)->toBe('notice');
    expect(array_keys($log->meta ?? []))->toContain('rating', 'has_comment');
});

test('audit: setting update locks event_type, category, severity, payload keys', function () {
    $actor = User::factory()->create();
    $request = Request::create('/x', 'POST');

    app(RecordSettingUpdateAudit::class)->handle($actor, $request, ['foo', 'bar']);

    $log = AuditLog::latest('id')->first();
    expect($log->event_type)->toBe('setting.updated');
    expect($log->category)->toBe('setting');
    expect($log->severity)->toBe('notice');
    expect(array_keys($log->meta ?? []))->toContain('keys');
});

test('audit: flag review locks event_type, category, severity, payload keys', function () {
    $actor = User::factory()->create();
    $ticket = Ticket::create([
        'ticket_number' => 'T-9002',
        'period' => now()->format('mY'),
        'sequence' => 9002,
        'channel_id' => Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true, 'sort_order' => 1])->id,
        'reporter_name' => 'Pelapor',
        'classification' => 'pengaduan',
        'title' => 'Judul',
        'content' => 'Isi',
        'status' => 'baru',
    ]);

    app(RecordAuditFlagReviewAudit::class)->handle($actor, $ticket, 'flag-1', 'wajar');

    $log = AuditLog::latest('id')->first();
    expect($log->event_type)->toBe('audit.flag_reviewed');
    expect($log->category)->toBe('audit');
    expect($log->severity)->toBe('info');
    expect(array_keys($log->meta ?? []))->toContain('flag_id', 'new_status');
});

test('audit: export locks event_type, category, severity, payload keys', function () {
    $actor = User::factory()->create();
    $request = Request::create('/x', 'GET', ['status' => 'baru']);

    app(RecordAuditLogExportAudit::class)->handle($actor, $request, 3, ['status' => 'baru']);

    $log = AuditLog::latest('id')->first();
    expect($log->event_type)->toBe('export.audit_logs');
    expect($log->category)->toBe('export');
    expect($log->severity)->toBe('notice');
    expect(array_keys($log->meta ?? []))->toContain('count', 'filters');
});
