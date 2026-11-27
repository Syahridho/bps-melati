<?php

use App\Enums\UserRole;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('channel observer clears both channels:tree and channels:filter-tree on create, update, and delete', function () {
    Cache::put('channels:tree', ['stale'], 600);
    Cache::put('channels:filter-tree', ['stale'], 600);

    $channel = Channel::create([
        'name' => 'Kanal Uji Observer',
        'slug' => 'kanal-uji-observer',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    expect(Cache::has('channels:tree'))->toBeFalse();
    expect(Cache::has('channels:filter-tree'))->toBeFalse();

    Cache::put('channels:tree', ['stale'], 600);
    Cache::put('channels:filter-tree', ['stale'], 600);

    $channel->update(['name' => 'Kanal Uji Observer Updated']);

    expect(Cache::has('channels:tree'))->toBeFalse();
    expect(Cache::has('channels:filter-tree'))->toBeFalse();

    Cache::put('channels:tree', ['stale'], 600);
    Cache::put('channels:filter-tree', ['stale'], 600);

    $channel->delete();

    expect(Cache::has('channels:tree'))->toBeFalse();
    expect(Cache::has('channels:filter-tree'))->toBeFalse();
});

test('inertia shared props read both nested flash and top-level session flash keys', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    actingAs($admin)
        ->withSession(['success' => 'Top-level success', 'error' => 'Top-level error'])
        ->get(route('settings.recap'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('flash.success', 'Top-level success')
            ->where('flash.error', 'Top-level error')
        );

    actingAs($admin)
        ->withSession(['flash' => ['success' => 'Nested success', 'error' => 'Nested error']])
        ->get(route('settings.recap'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('flash.success', 'Nested success')
            ->where('flash.error', 'Nested error')
        );
});

test('incoming reports, input data, and pengawasan controllers expose flash.success in inertia props', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create([
        'name' => 'Website',
        'slug' => 'website-flash-test',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $webTicket = Ticket::create([
        'ticket_number' => 'L-1400/112026/FL0001',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Laporan Web',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor Web',
        'content' => 'Isi laporan web untuk test flash.',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    $adminTicket = Ticket::create([
        'ticket_number' => 'L-1400/112026/FL0002',
        'period' => '2026-11',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Laporan Admin',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor Admin',
        'content' => 'Isi laporan admin untuk test flash.',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    actingAs($admin)
        ->put(route('dashboard.admin.incoming-reports.update', $webTicket->ticket_number), [
            'title' => 'Laporan Web Diperbarui',
            'reporter_name' => 'Pelapor Web',
            'content' => 'Isi laporan web diperbarui.',
        ])
        ->assertRedirect();

    expect(session('flash.success'))->toBe('Laporan berhasil diperbarui.');

    actingAs($admin)
        ->put(route('dashboard.admin.input-data.update', $adminTicket->ticket_number), [
            'title' => 'Laporan Admin Diperbarui',
            'reporter_name' => 'Pelapor Admin',
            'content' => 'Isi laporan admin diperbarui.',
        ])
        ->assertRedirect();

    expect(session('flash.success'))->toBe('Data tiket berhasil diperbarui.');

    actingAs($admin)
        ->patch(route('dashboard.admin.incoming-reports.pengawasan', $webTicket->ticket_number), [
            'aktif' => true,
        ])
        ->assertRedirect();

    expect(session('flash.success'))->toBe('Kadar pengawasan berhasil diaktifkan.');
});

test('input data show page passes rating for completed ticket', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    $channel = Channel::create([
        'name' => 'Website',
        'slug' => 'website-rating-test',
        'sort_order' => 1,
        'is_active' => true,
    ]);

    $ticket = Ticket::create([
        'ticket_number' => 'A-1400/112026/RT0001',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'aspirasi',
        'title' => 'Tiket Selesai Dengan Rating',
        'channel_id' => $channel->id,
        'reporter_name' => 'Pelapor',
        'content' => 'Isi aspirasi selesai.',
        'status' => 'selesai',
        'completed_at' => now(),
        'rating' => 5,
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.input-data.show', $ticket->ticket_number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('ticket.status', 'selesai')
            ->where('ticket.rating', 5)
        );
});
