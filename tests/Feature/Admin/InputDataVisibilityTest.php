<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createInputDataTicket(User $creator, array $overrides = []): Ticket
{
    static $sequence = 100;
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    return Ticket::create(array_merge([
        'ticket_number' => 'INPUT-'.sprintf('%04d', $sequence++),
        'period' => now()->format('Y-m'),
        'sequence' => $sequence,
        'classification' => 'pengaduan',
        'title' => 'Tiket dibuat oleh '.$creator->name,
        'channel_id' => $channel->id,
        'content' => 'Konten tiket buatan '.$creator->name,
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $creator->id,
    ], $overrides));
}

test('admin sees tickets from admin, operator, and operator_tim', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin, 'name' => 'Admin User']);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'name' => 'Operator User']);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim User']);

    createInputDataTicket($admin, ['title' => 'Tiket Admin']);
    createInputDataTicket($operator, ['title' => 'Tiket Operator']);
    createInputDataTicket($operatorTim, ['title' => 'Tiket Tim']);

    $this->actingAs($admin)
        ->get(route('dashboard.admin.input-data.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/input-data/index')
            ->where('counts.semua', 3)
            ->has('tickets.data', 3)
        );
});

test('operator sees tickets from other operators and operator_tim', function () {
    $operator1 = User::factory()->create(['role' => UserRole::Operator, 'name' => 'Operator 1']);
    $operator2 = User::factory()->create(['role' => UserRole::Operator, 'name' => 'Operator 2']);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim User']);

    createInputDataTicket($operator1, ['title' => 'Tiket Operator 1']);
    createInputDataTicket($operator2, ['title' => 'Tiket Operator 2']);
    createInputDataTicket($operatorTim, ['title' => 'Tiket Tim']);

    $this->actingAs($operator1)
        ->get(route('dashboard.operator.input-data.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator/input-data/index')
            ->where('counts.semua', 3)
            ->has('tickets.data', 3)
        );
});

test('operator_tim only sees tickets created by themselves', function () {
    $operatorTim1 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 1']);
    $operatorTim2 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 2']);
    $operator = User::factory()->create(['role' => UserRole::Operator, 'name' => 'Operator User']);
    $admin = User::factory()->create(['role' => UserRole::Admin, 'name' => 'Admin User']);

    createInputDataTicket($operatorTim1, ['title' => 'Tiket Milik Tim 1']);
    createInputDataTicket($operatorTim2, ['title' => 'Tiket Milik Tim 2']);
    createInputDataTicket($operator, ['title' => 'Tiket Milik Operator']);
    createInputDataTicket($admin, ['title' => 'Tiket Milik Admin']);

    $this->actingAs($operatorTim1)
        ->get(route('dashboard.operator.input-data.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator-tim/input-data/index')
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Tiket Milik Tim 1')
        );
});

test('counts for operator_tim only count tickets created by themselves', function () {
    $operatorTim1 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 1']);
    $operatorTim2 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 2']);

    createInputDataTicket($operatorTim1, ['classification' => 'pengaduan', 'title' => 'Pengaduan Tim 1']);
    createInputDataTicket($operatorTim1, ['classification' => 'aspirasi', 'title' => 'Aspirasi Tim 1']);
    createInputDataTicket($operatorTim2, ['classification' => 'pengaduan', 'title' => 'Pengaduan Tim 2']);
    createInputDataTicket($operatorTim2, ['classification' => 'permintaan_informasi', 'title' => 'Permintaan Tim 2']);

    $this->actingAs($operatorTim1)
        ->get(route('dashboard.operator.input-data.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/operator-tim/input-data/index')
            ->where('counts.semua', 2)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->where('counts.permintaan', 0)
        );
});

test('operator_tim accessing show of another user ticket receives 404', function () {
    $operatorTim1 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 1']);
    $operatorTim2 = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 2']);

    $ticketTim2 = createInputDataTicket($operatorTim2, ['title' => 'Tiket Milik Tim 2']);

    $this->actingAs($operatorTim1)
        ->get(route('dashboard.operator.input-data.show', ['ticketNumber' => $ticketTim2->ticket_number]))
        ->assertNotFound();
});

test('operator_tim accessing show of their own ticket receives 200', function () {
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim, 'name' => 'Tim 1']);

    $ownTicket = createInputDataTicket($operatorTim, ['title' => 'Tiket Sendiri']);

    $this->actingAs($operatorTim)
        ->get(route('dashboard.operator.input-data.show', ['ticketNumber' => $ownTicket->ticket_number]))
        ->assertOk();
});
