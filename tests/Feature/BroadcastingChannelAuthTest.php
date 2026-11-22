<?php

use App\Enums\UserRole;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    Broadcast::purge('reverb');
    require base_path('routes/channels.php');
});

afterEach(function () {
    config(['broadcasting.default' => 'null']);
    Broadcast::purge('reverb');
});

function authChannel(string $channel, ?User $user = null): TestResponse
{
    $test = test();
    if ($user !== null) {
        $test->actingAs($user);
    } else {
        auth()->logout();
    }

    return $test->post('/broadcasting/auth', [
        'channel_name' => $channel,
        'socket_id' => '1234.5678',
    ]);
}

test('audit.log channel authorization rules', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveAdmin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => false]);

    authChannel('private-audit.log', $admin)->assertSuccessful();
    authChannel('private-audit.log', $operator)->assertForbidden();
    authChannel('private-audit.log', $operatorTim)->assertForbidden();
    authChannel('private-audit.log', $inactiveAdmin)->assertForbidden();
    authChannel('private-audit.log')->assertForbidden();
});

test('inbox.incoming-reports channel authorization rules', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveOperator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false]);

    authChannel('private-inbox.incoming-reports', $admin)->assertSuccessful();
    authChannel('private-inbox.incoming-reports', $operator)->assertSuccessful();
    authChannel('private-inbox.incoming-reports', $operatorTim)->assertForbidden();
    authChannel('private-inbox.incoming-reports', $inactiveOperator)->assertForbidden();
    authChannel('private-inbox.other-scope', $admin)->assertForbidden();
    authChannel('private-inbox.incoming-reports')->assertForbidden();
});

test('ticket.{ticketId} channel authorization rules', function () {
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $ticket = Ticket::withoutEvents(function () use ($channel) {
        return Ticket::create([
            'ticket_number' => 'L-1400/112026/0001',
            'period' => '112026',
            'sequence' => 1,
            'classification' => 'pengaduan',
            'channel_id' => $channel->id,
            'title' => 'Test Ticket',
            'content' => 'Test Content',
            'status' => 'baru',
        ]);
    });

    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveUser = User::factory()->create(['role' => UserRole::Admin, 'is_active' => false]);

    authChannel('presence-ticket.'.$ticket->id, $admin)->assertSuccessful();
    authChannel('presence-ticket.'.$ticket->id, $operator)->assertSuccessful();
    authChannel('presence-ticket.'.$ticket->id, $operatorTim)->assertSuccessful();
    authChannel('presence-ticket.'.$ticket->id, $inactiveUser)->assertForbidden();
    authChannel('presence-ticket.999999', $admin)->assertForbidden();
    authChannel('presence-ticket.'.$ticket->id)->assertForbidden();
});

test('staff channel authorization rules', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveUser = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false]);

    authChannel('private-staff', $admin)->assertSuccessful();
    authChannel('private-staff', $operator)->assertSuccessful();
    authChannel('private-staff', $operatorTim)->assertSuccessful();
    authChannel('private-staff', $inactiveUser)->assertForbidden();
    authChannel('private-staff')->assertForbidden();
});

test('laporan.operator.{userId} channel authorization rules', function () {
    $operator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $otherOperator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => true]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'is_active' => true]);
    $inactiveOperator = User::factory()->create(['role' => UserRole::Operator, 'is_active' => false]);

    authChannel('private-laporan.operator.'.$operator->id, $operator)->assertSuccessful();
    authChannel('private-laporan.operator.'.$operatorTim->id, $operatorTim)->assertSuccessful();
    authChannel('private-laporan.operator.'.$operator->id, $otherOperator)->assertForbidden();
    authChannel('private-laporan.operator.'.$inactiveOperator->id, $inactiveOperator)->assertForbidden();
    authChannel('private-laporan.operator.'.$operator->id)->assertForbidden();
});
