<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
});

test('input data tabs filter returns correct subset and counts for admin', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    Ticket::create([
        'ticket_number' => 'INPUT-P1',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'status' => 'respon_awal',
        'channel_id' => $this->channel->id,
        'content' => 'Pengaduan dengan respon awal',
        'source_app' => 'admin',
        'is_pengawasan' => true,
        'is_flagged' => true,
        'created_by' => $admin->id,
    ]);

    Ticket::create([
        'ticket_number' => 'INPUT-A1',
        'period' => '2026-11',
        'sequence' => 2,
        'classification' => 'aspirasi',
        'status' => 'respon_substantif',
        'channel_id' => $this->channel->id,
        'content' => 'Aspirasi dengan respon substantif',
        'source_app' => 'admin',
        'is_pengawasan' => false,
        'is_flagged' => false,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['tab' => 'semua']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard/admin/input-data/index')
            ->where('counts.semua', 2)
            ->where('counts.pengaduan', 1)
            ->where('counts.aspirasi', 1)
            ->where('counts.respon_awal', 1)
            ->where('counts.respon_substantif', 1)
            ->where('counts.berkadar_pengawasan', 1)
            ->where('counts.ditandai', 1)
            ->has('tickets.data', 2)
        );

    // Test tab ditandai
    $this->actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['tab' => 'ditandai']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', 'INPUT-P1')
        );

    // Test tab berkadar_pengawasan
    $this->actingAs($admin)
        ->get(route('dashboard.admin.input-data.index', ['tab' => 'berkadar_pengawasan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', 'INPUT-P1')
        );
});

test('operator_tim only sees and counts their own input data tickets across all tabs', function () {
    $operatorTim1 = User::factory()->create(['role' => UserRole::OperatorTim]);
    $operatorTim2 = User::factory()->create(['role' => UserRole::OperatorTim]);

    Ticket::create([
        'ticket_number' => 'INPUT-TIM1',
        'period' => '2026-11',
        'sequence' => 11,
        'classification' => 'pengaduan',
        'status' => 'respon_awal',
        'channel_id' => $this->channel->id,
        'content' => 'Punya tim 1 ditandai',
        'source_app' => 'admin',
        'is_flagged' => true,
        'created_by' => $operatorTim1->id,
    ]);

    Ticket::create([
        'ticket_number' => 'INPUT-TIM2',
        'period' => '2026-11',
        'sequence' => 12,
        'classification' => 'pengaduan',
        'status' => 'respon_awal',
        'channel_id' => $this->channel->id,
        'content' => 'Punya tim 2 ditandai',
        'source_app' => 'admin',
        'is_flagged' => true,
        'created_by' => $operatorTim2->id,
    ]);

    $this->actingAs($operatorTim1)
        ->get(route('dashboard.operator.input-data.index', ['tab' => 'ditandai']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('counts.semua', 1)
            ->where('counts.ditandai', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', 'INPUT-TIM1')
        );
});

test('admin can flag and unflag input data ticket', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    $ticket = Ticket::create([
        'ticket_number' => 'INPUT-FLAG-1',
        'period' => '2026-11',
        'sequence' => 20,
        'classification' => 'pengaduan',
        'status' => 'baru',
        'channel_id' => $this->channel->id,
        'content' => 'Konten uji tandai',
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    // Flag
    $this->actingAs($admin)
        ->patchJson(route('dashboard.admin.input-data.tandai', $ticket->ticket_number), [
            'aktif' => true,
            'note' => 'Perlu atensi pimpinan',
        ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'is_flagged' => true,
            'flag_note' => 'Perlu atensi pimpinan',
        ]);

    expect($ticket->fresh()->is_flagged)->toBeTrue();
    expect($ticket->fresh()->flag_note)->toBe('Perlu atensi pimpinan');

    // Unflag
    $this->actingAs($admin)
        ->patchJson(route('dashboard.admin.input-data.tandai', $ticket->ticket_number), [
            'aktif' => false,
        ])
        ->assertOk()
        ->assertJson([
            'success' => true,
            'is_flagged' => false,
        ]);

    expect($ticket->fresh()->is_flagged)->toBeFalse();
});

test('operator_tim can only flag their own tickets and receives 404 for others', function () {
    $operatorTim1 = User::factory()->create(['role' => UserRole::OperatorTim]);
    $operatorTim2 = User::factory()->create(['role' => UserRole::OperatorTim]);

    $ownTicket = Ticket::create([
        'ticket_number' => 'INPUT-OWN',
        'period' => '2026-11',
        'sequence' => 31,
        'classification' => 'pengaduan',
        'status' => 'baru',
        'channel_id' => $this->channel->id,
        'content' => 'Punya sendiri',
        'source_app' => 'admin',
        'created_by' => $operatorTim1->id,
    ]);

    $otherTicket = Ticket::create([
        'ticket_number' => 'INPUT-OTHER',
        'period' => '2026-11',
        'sequence' => 32,
        'classification' => 'pengaduan',
        'status' => 'baru',
        'channel_id' => $this->channel->id,
        'content' => 'Punya orang lain',
        'source_app' => 'admin',
        'created_by' => $operatorTim2->id,
    ]);

    // Own ticket -> success
    $this->actingAs($operatorTim1)
        ->patchJson(route('dashboard.operator.input-data.tandai', $ownTicket->ticket_number), [
            'aktif' => true,
            'note' => 'Catatan sendiri',
        ])
        ->assertOk();

    // Other ticket -> 404
    $this->actingAs($operatorTim1)
        ->patchJson(route('dashboard.operator.input-data.tandai', $otherTicket->ticket_number), [
            'aktif' => true,
            'note' => 'Coba tandai punya orang',
        ])
        ->assertNotFound();
});

test('input data index query count does not produce N+1', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    for ($i = 1; $i <= 5; $i++) {
        Ticket::create([
            'ticket_number' => "INPUT-N1-{$i}",
            'period' => '2026-11',
            'sequence' => 50 + $i,
            'classification' => 'pengaduan',
            'status' => 'baru',
            'channel_id' => $this->channel->id,
            'content' => "Isi tiket {$i}",
            'source_app' => 'admin',
            'created_by' => $admin->id,
            'is_flagged' => true,
            'flagged_by' => $admin->id,
        ]);
    }

    DB::enableQueryLog();

    $this->actingAs($admin)
        ->get(route('dashboard.admin.input-data.index'))
        ->assertOk();

    $queries = DB::getQueryLog();
    // Harus bounded (tidak bertambah seiring jumlah tiket karena eager loading channel & flaggedBy)
    expect(count($queries))->toBeLessThan(15);
});
