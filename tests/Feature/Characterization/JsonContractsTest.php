<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('audit flag index json contract', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->getJson(route('audit-flag.index'))
        ->assertOk()
        ->assertJsonStructure(['flags', 'total']);
});

test('audit log flags summary json contract', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->getJson(route('audit-log.flags-summary'))
        ->assertOk()
        ->assertJsonStructure(['total', 'new_count', 'reviewed_count', 'by_type', 'by_severity']);
});

test('audit log summary weekly json contract', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->getJson(route('audit-log.summary-weekly'))
        ->assertOk()
        ->assertJsonStructure(['logs_this_week', 'new_flags_this_week', 'reviewed_count']);
});

test('notifications index json contract', function () {
    $user = User::factory()->create(['role' => 'operator']);

    $this->actingAs($user)
        ->getJson(route('notifications.index'))
        ->assertOk()
        ->assertJsonStructure(['success', 'data', 'next_cursor', 'unread_count']);
});

test('notifications unread count json contract', function () {
    $user = User::factory()->create(['role' => 'operator']);

    $this->actingAs($user)
        ->getJson(route('notifications.unread.count'))
        ->assertOk()
        ->assertJsonStructure(['success', 'unread_count']);
});
