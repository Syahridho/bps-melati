<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\RekapYears;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

it('builds dynamic years list and falls back on invalid parameters', function () {
    $admin = User::factory()->admin()->create();
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    Ticket::create([
        'ticket_number' => 'L-1400/092024/0001',
        'period' => '2024-05',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $channel->id,
        'content' => 'Tiket masa lalu 2024.',
        'status' => 'baru',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.rekap-bulanan.index', ['year' => '9999', 'month' => '15'], absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/rekap/bulanan')
            ->has('years')
            ->where('year', (string) now()->year)
            ->where('month', (string) now()->month)
        );

    actingAs($admin)
        ->get(route('dashboard.admin.rekap-bulanan.index', ['year' => '2024', 'month' => '5'], absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('year', '2024')
            ->where('month', '5')
        );
});

it('invalidates RekapYears cache when a ticket is created or deleted', function () {
    $admin = User::factory()->admin()->create();
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $ticket = Ticket::create([
        'ticket_number' => 'L-1400/092023/0001',
        'period' => '2023-01',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'channel_id' => $channel->id,
        'content' => 'Tiket 2023.',
        'status' => 'baru',
        'is_read' => true,
        'source_app' => 'web',
    ]);

    actingAs($admin)
        ->get(route('dashboard.admin.rekap-bulanan.index', absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('years', fn ($years) => collect($years)->contains('value', '2023')));

    $ticket->delete();

    RekapYears::invalidate();

    actingAs($admin)
        ->get(route('dashboard.admin.rekap-bulanan.index', absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('years', fn ($years) => !collect($years)->contains('value', '2023') || count($years) >= 1));
});
