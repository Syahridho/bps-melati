<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('laporan masuk excludes tickets created via input data (source_app admin)', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    // Public ticket
    Ticket::create([
        'ticket_number' => 'PUB-001',
        'period' => now()->format('Y-m'),
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Laporan dari Publik',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan dari publik',
        'status' => 'baru',
        'source_app' => 'web',
    ]);

    // Admin input-data ticket
    Ticket::create([
        'ticket_number' => 'ADM-001',
        'period' => now()->format('Y-m'),
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Laporan dari Input Data Admin',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan input manual admin',
        'status' => 'baru',
        'source_app' => 'admin',
        'created_by' => $admin->id,
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.laporan-masuk.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->where('counts.semua', 1)
            ->has('tickets.data', 1)
            ->where('tickets.data.0.title', 'Laporan dari Publik')
        );
});
