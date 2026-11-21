<?php

use App\Models\Channel;
use App\Models\Setting;
use App\Models\SettingChangeLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function modeSettingPayload(array $overrides = []): array
{
    return array_merge([
        'mode' => 'claim',
        'apply' => 'now',
    ], $overrides);
}

test('operator cannot access or change assignment mode', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    $this->actingAs($operator)
        ->get(route('settings.application.edit'))
        ->assertForbidden();

    $this->actingAs($operator)
        ->post(route('settings.application.assignment-mode'), modeSettingPayload())
        ->assertForbidden();

    expect(Setting::get('assignment_mode', 'free'))->toBe('free');
});

test('admin sees current mode on the application settings page', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Setting::set('assignment_mode', 'claim');

    $this->actingAs($admin)
        ->get(route('settings.application.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/application/index')
            ->where('assignmentMode.current', 'claim')
            ->has('assignmentMode.options', 3)
        );
});

test('admin can apply a new mode immediately and history is recorded', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('settings.application.assignment-mode'), modeSettingPayload(['mode' => 'round_robin']))
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    expect(Setting::get('assignment_mode'))->toBe('round_robin')
        ->and(Cache::get('setting:assignment_mode'))->toBe('round_robin');

    $this->assertDatabaseHas('setting_change_logs', [
        'key' => 'assignment_mode',
        'old_value' => 'free',
        'new_value' => 'round_robin',
        'changed_by' => $admin->id,
    ]);

    expect(SettingChangeLog::whereNotNull('applied_at')->count())->toBe(1);
});

test('invalid mode is rejected server side', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->postJson(route('settings.application.assignment-mode'), modeSettingPayload(['mode' => 'bebas']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('mode');
});

test('scheduled mode change is applied by the scheduler command and invalidates cache', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Setting::set('assignment_mode', 'free');

    $scheduledAt = Carbon::now()->addDay();

    $this->actingAs($admin)
        ->post(route('settings.application.assignment-mode'), modeSettingPayload([
            'mode' => 'claim',
            'apply' => 'scheduled',
            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
        ]))
        ->assertRedirect();

    expect(Setting::get('assignment_mode'))->toBe('free');

    $this->artisan('settings:apply-assignment-mode')->assertExitCode(0);

    expect(Setting::get('assignment_mode'))->toBe('free');

    $this->travelTo($scheduledAt->copy()->addMinute());

    $this->artisan('settings:apply-assignment-mode')->assertExitCode(0);

    expect(Setting::get('assignment_mode'))->toBe('claim')
        ->and(Cache::get('setting:assignment_mode'))->toBe('claim')
        ->and(SettingChangeLog::whereNotNull('applied_at')->count())->toBe(1);
});

test('changing the mode does not change existing tickets', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator']);
    $channel = Channel::firstOrCreate(
        ['slug' => 'website'],
        ['name' => 'Website', 'sort_order' => 1, 'is_active' => true]
    );

    $oldTicket = Ticket::create([
        'ticket_number' => 'L-1400/112026/7001',
        'period' => '2026-11',
        'sequence' => 7001,
        'classification' => 'pengaduan',
        'channel_id' => $channel->id,
        'content' => 'Tiket lama yang tidak boleh berubah saat mode diganti.',
        'status' => 'baru',
        'assignment_mode' => 'free',
    ]);

    $this->actingAs($admin)
        ->post(route('settings.application.assignment-mode'), modeSettingPayload(['mode' => 'round_robin']))
        ->assertRedirect();

    $oldTicket->refresh();

    expect($oldTicket->assignment_mode)->toBe('free')
        ->and($oldTicket->assigned_to)->toBeNull();
});

test('admin can schedule only a future mode change', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->postJson(route('settings.application.assignment-mode'), modeSettingPayload([
            'apply' => 'scheduled',
            'scheduled_at' => Carbon::now()->subHour()->format('Y-m-d H:i:s'),
        ]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('scheduled_at');
});
