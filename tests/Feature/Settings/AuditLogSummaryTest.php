<?php

use App\Models\AuditFlag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

test('guest cannot access audit log flags summary', function () {
    getJson(route('audit-log.flags-summary'))->assertUnauthorized();
});

test('operator cannot access audit log flags summary', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->getJson(route('audit-log.flags-summary'))
        ->assertForbidden();
});

test('admin receives audit log flags summary json', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->getJson(route('audit-log.flags-summary'))
        ->assertOk()
        ->assertJsonStructure(['total', 'new_count', 'reviewed_count', 'by_type', 'by_severity'])
        ->assertJsonPath('total', 0)
        ->assertJsonPath('new_count', 0);
});

test('audit log flags summary counts new flags correctly', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $auditLog = \App\Models\AuditLog::create([
        'event_type' => 'test',
        'category' => 'test',
        'severity' => 'info',
    ]);

    AuditFlag::create([
        'type' => 'jaringan_sama',
        'severity' => 'warning',
        'status' => 'baru',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'tinggi'],
    ]);
    AuditFlag::create([
        'type' => 'jaringan_sama',
        'severity' => 'notice',
        'status' => 'baru',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'sedang'],
    ]);
    AuditFlag::create([
        'type' => 'rating_cepat',
        'severity' => 'info',
        'status' => 'ditinjau',
        'audit_log_id' => $auditLog->id,
        'details' => ['tingkat' => 'rendah'],
    ]);

    $response = actingAs($admin)
        ->getJson(route('audit-log.flags-summary'))
        ->assertOk();

    expect($response->json('total'))->toBe(3);
    expect($response->json('new_count'))->toBe(2);
    expect($response->json('reviewed_count'))->toBe(1);
});