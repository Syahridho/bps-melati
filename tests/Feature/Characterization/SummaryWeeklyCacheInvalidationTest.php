<?php

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('audit flag creation and review invalidate summary-weekly cache', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $auditLog = AuditLog::create([
        'event_type' => 'test',
        'category' => 'test',
        'severity' => 'info',
    ]);

    $this->actingAs($admin)
        ->getJson(route('audit-log.summary-weekly'))
        ->assertOk()
        ->assertJsonPath('new_flags_this_week', 0);

    $versionBeforeCreate = AuditFlag::cacheVersion();

    $flag = AuditFlag::create([
        'type' => 'jaringan_sama',
        'severity' => 'warning',
        'status' => 'baru',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'tinggi'],
    ]);

    expect(AuditFlag::cacheVersion())->not->toBe($versionBeforeCreate);

    $this->actingAs($admin)
        ->getJson(route('audit-log.summary-weekly'))
        ->assertOk()
        ->assertJsonPath('new_flags_this_week', 1);

    $versionBeforeReview = AuditFlag::cacheVersion();

    $this->actingAs($admin)
        ->patchJson(route('audit-flag.update', ['flag' => $flag->id]), [
            'status' => 'wajar',
            'note' => 'ok',
        ])
        ->assertOk();

    expect(AuditFlag::cacheVersion())->not->toBe($versionBeforeReview);

    $this->actingAs($admin)
        ->getJson(route('audit-log.summary-weekly'))
        ->assertOk()
        ->assertJsonPath('new_flags_this_week', 0);
});
