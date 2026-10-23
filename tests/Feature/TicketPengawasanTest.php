<?php

use App\Actions\AutoCloseTickets;
use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;

test('admin and operator can toggle ticket pengawasan', function () {
    $channel = Channel::first() ?? Channel::create(['name' => 'Default']);
    
    // Test Admin
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $ticketAdmin = Ticket::create([
        'ticket_number' => 'A-1400/102026/0001',
        'period' => '2026-10',
        'sequence' => random_int(1000, 9999),
        'classification' => 'aspirasi',
        'title' => 'Tiket uji admin',
        'content' => 'Isi laporan',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'channel_id' => $channel->id,
        'is_pengawasan' => false,
    ]);

    $this->actingAs($admin)
        ->patch(route('dashboard.admin.laporan-masuk.pengawasan', ['ticketNumber' => $ticketAdmin->ticket_number]), [
            'aktif' => true,
        ])
        ->assertRedirect();
    expect($ticketAdmin->fresh()->is_pengawasan)->toBeTrue();

    // Turn off Admin
    $this->actingAs($admin)
        ->patch(route('dashboard.admin.laporan-masuk.pengawasan', ['ticketNumber' => $ticketAdmin->ticket_number]), [
            'aktif' => false,
        ])
        ->assertRedirect();
    expect($ticketAdmin->fresh()->is_pengawasan)->toBeFalse();

    // Test Operator
    $operator = User::factory()->create(['role' => UserRole::Operator]);
    $ticketOp = Ticket::create([
        'ticket_number' => 'A-1400/102026/0002',
        'period' => '2026-10',
        'sequence' => random_int(10000, 19999),
        'classification' => 'aspirasi',
        'title' => 'Tiket uji operator',
        'content' => 'Isi laporan',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'channel_id' => $channel->id,
        'is_pengawasan' => false,
    ]);

    $this->actingAs($operator)
        ->patch(route('dashboard.operator.laporan-masuk.pengawasan', ['ticketNumber' => $ticketOp->ticket_number]), [
            'aktif' => true,
        ])
        ->assertRedirect();
    expect($ticketOp->fresh()->is_pengawasan)->toBeTrue();
});

test('operator_tim and guest cannot toggle pengawasan', function () {
    $channel = Channel::first() ?? Channel::create(['name' => 'Default']);
    $operatorTim = User::factory()->create(['role' => UserRole::OperatorTim]);
    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/102026/0009',
        'period' => '2026-10',
        'sequence' => random_int(20000, 29999),
        'classification' => 'aspirasi',
        'title' => 'Tiket uji',
        'content' => 'Isi laporan',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'channel_id' => $channel->id,
    ]);

    $this->actingAs($operatorTim)
        ->patch(route('dashboard.admin.laporan-masuk.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => true,
        ])
        ->assertForbidden();

    $this->patch(route('dashboard.admin.laporan-masuk.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
        'aktif' => true,
    ])
        ->assertForbidden();
});

test('completed ticket cannot be toggled', function () {
    $channel = Channel::first() ?? Channel::create(['name' => 'Default']);
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/102026/0003',
        'period' => '2026-10',
        'sequence' => random_int(30000, 39999),
        'classification' => 'aspirasi',
        'title' => 'Tiket uji',
        'content' => 'Isi laporan',
        'status' => 'selesai',
        'source_app' => 'web',
        'channel_id' => $channel->id,
        'is_pengawasan' => false,
    ]);

    $this->actingAs($admin)
        ->patch(route('dashboard.admin.laporan-masuk.pengawasan', ['ticketNumber' => $ticket->ticket_number]), [
            'aktif' => true,
        ])
        ->assertSessionHasErrors();

    expect($ticket->fresh()->is_pengawasan)->toBeFalse();
});

test('auto close uses pengawasan days when ticket is under pengawasan', function () {
    $channel = Channel::first() ?? Channel::create(['name' => 'Default']);
    Setting::set('kadar_pengawasan_hari', '30');
    Setting::set('auto_close_aspirasi_days', '1');

    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/102026/0004',
        'period' => '2026-10',
        'sequence' => random_int(40000, 49999),
        'classification' => 'aspirasi',
        'title' => 'Tiket uji',
        'content' => 'Isi laporan',
        'status' => 'respon_awal',
        'source_app' => 'web',
        'channel_id' => $channel->id,
        'last_staff_response_at' => now()->subDays(2),
        'is_pengawasan' => true,
    ]);

    // Should not be closed yet because pengawasan is 30 days
    $result = app(AutoCloseTickets::class)->handle();
    expect($result->closedCount())->toBe(0);
    expect($ticket->fresh()->status)->toBe('respon_awal');

    // Make last response 31 days ago
    $ticket->update(['last_staff_response_at' => now()->subDays(31)]);

    $result2 = app(AutoCloseTickets::class)->handle();
    expect($result2->closedCount())->toBe(1);
    expect($ticket->fresh()->status)->toBe('selesai');
    expect($ticket->fresh()->closed_reason)->toBe('auto_close');
});
