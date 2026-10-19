<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\put;

uses(RefreshDatabase::class);

test('operator_tim can access dashboard and input-data', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    actingAs($operatorTim)
        ->get('/dashboard/operator-tim')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('operator/dashboard'));

    actingAs($operatorTim)
        ->get(route('dashboard.operator-tim.input-data.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/input-data'));
});

test('operator_tim is forbidden from accessing restricted routes', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    get(route('dashboard.admin.operator.index'))
        ->assertRedirect(route('login'));

    actingAs($operatorTim)
        ->get(route('dashboard.admin.operator.index'))
        ->assertForbidden();

    actingAs($operatorTim)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertForbidden();

    actingAs($operatorTim)
        ->get(route('dashboard.admin.laporan-selesai.index'))
        ->assertForbidden();

    actingAs($operatorTim)
        ->get(route('dashboard.admin.rekap-bulanan.index'))
        ->assertForbidden();

    actingAs($operatorTim)
        ->get(route('dashboard.admin.rekap-periodik.index'))
        ->assertForbidden();

    actingAs($operatorTim)
        ->get('/settings/application')
        ->assertForbidden();
});

test('operator_tim cannot subscribe to inbox or ticket channels', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-app-key',
        'broadcasting.connections.reverb.secret' => 'test-app-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app-id',
    ]);
    \Illuminate\Support\Facades\Broadcast::purge('reverb');
    require base_path('routes/channels.php');

    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);
    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/102026/AB01',
        'channel_id' => $channel->id,
        'classification' => 'pengaduan',
        'title' => 'Judul Test',
        'content' => 'Konten laporan pengaduan uji coba',
        'status' => 'baru',
        'reporter_name' => 'Tester',
        'source_app' => 'web',
        'period' => '102026',
        'sequence' => 1,
    ]);

    actingAs($operatorTim)
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-inbox.laporan-masuk',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();

    actingAs($operatorTim)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-ticket.'.$ticket->id,
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

test('operator_tim can store ticket via input-data', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);

    actingAs($operatorTim)
        ->post(route('dashboard.operator-tim.input-data.store'), [
            'classification' => 'pengaduan',
            'title' => 'Tiket Input Operator Tim',
            'content' => 'Uraian pengaduan yang diinput oleh operator tim.',
            'channel_id' => $channel->id,
            'reporter_name' => 'Pelapor Tim',
            'reporter_email' => 'pelapor.tim@bps.go.id',
            'service_type' => 'pst',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('tickets', [
        'title' => 'Tiket Input Operator Tim',
        'classification' => 'pengaduan',
        'source_app' => 'admin',
    ]);
});

test('admin can manage operator_tim accounts', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    actingAs($admin)
        ->post(route('dashboard.admin.operator.store'), [
            'name' => 'Tim Support Baru',
            'role' => 'operator_tim',
            'email' => 'support.tim@bps.go.id',
            'password' => 'password123',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'name' => 'Tim Support Baru',
        'email' => 'support.tim@bps.go.id',
        'role' => UserRole::OperatorTim,
    ]);

    $user = User::where('email', 'support.tim@bps.go.id')->first();

    actingAs($admin)
        ->put(route('dashboard.admin.operator.update', $user), [
            'name' => 'Tim Support Diperbarui',
            'role' => 'operator_tim',
            'email' => 'support.updated@bps.go.id',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'email' => 'support.updated@bps.go.id',
    ]);

    actingAs($admin)
        ->delete(route('dashboard.admin.operator.destroy', $user))
        ->assertRedirect();

    $this->assertDatabaseMissing('users', [
        'id' => $user->id,
    ]);
});

test('invalid role is rejected with 422', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    actingAs($admin)
        ->post(route('dashboard.admin.operator.store'), [
            'name' => 'Role Ngawur',
            'role' => 'super_admin_ghost',
            'email' => 'ghost@bps.go.id',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('role');
});

test('operator and operator_tim cannot call user crud endpoints', function () {
    $operator = User::factory()->create(['role' => UserRole::Operator]);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);

    actingAs($operator)
        ->post(route('dashboard.admin.operator.store'), [
            'name' => 'Hacker',
            'role' => 'admin',
            'email' => 'hacker@bps.go.id',
            'password' => 'password123',
        ])
        ->assertForbidden();

    actingAs($operatorTim)
        ->post(route('dashboard.admin.operator.store'), [
            'name' => 'Hacker Tim',
            'role' => 'admin',
            'email' => 'hackertim@bps.go.id',
            'password' => 'password123',
        ])
        ->assertForbidden();
});

test('admin cannot delete or downgrade own role and cannot delete last active admin', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    actingAs($admin)
        ->put(route('dashboard.admin.operator.update', $admin), [
            'name' => 'Admin Sendiri',
            'role' => 'operator',
            'email' => $admin->email,
        ])
        ->assertSessionHasErrors('role');

    actingAs($admin)
        ->delete(route('dashboard.admin.operator.destroy', $admin))
        ->assertSessionHasErrors();
});
