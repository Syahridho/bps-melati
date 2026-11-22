<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function chatLimitChannel(): Channel
{
    $parent = Channel::firstOrCreate(['slug' => 'sosial-media'], ['name' => 'Sosial Media', 'sort_order' => 1, 'is_active' => true]);

    return Channel::firstOrCreate(['slug' => 'sosial-media-instagram'], ['name' => 'Instagram', 'parent_id' => $parent->id, 'sort_order' => 1, 'is_active' => true]);
}

function chatLimitTicket(string $period): Ticket
{
    static $seq = 0;
    $seq++;

    $channel = chatLimitChannel();

    return Ticket::create([
        'ticket_number' => 'T-'.$seq,
        'period' => $period,
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'service_type' => 'pst',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter.',
        'status' => 'baru',
        'is_read' => false,
        'source_app' => 'web',
        'channel_id' => $channel->id,
    ]);
}

it('defaults chat_limit to 500 when absent', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.periodic-recap.print', ['year' => '2026', 'months' => '2', 'chat' => '2'], absolute: false))
        ->assertOk();
});

it('clamps chat_limit above max', function () {
    config(['recap.chat_max' => 10]);

    $admin = User::factory()->admin()->create();
    $channel = chatLimitChannel();

    for ($i = 0; $i < 12; $i++) {
        chatLimitTicket('2026-02');
    }

    $response = actingAs($admin)
        ->get(route('dashboard.admin.periodic-recap.print', ['year' => '2026', 'months' => '2', 'chat' => '2', 'chat_limit' => '100'], absolute: false))
        ->assertOk();

    $response->assertSee('Menampilkan 10 dari total 12');
});

it('does not show limit warning when all tickets fit', function () {
    $admin = User::factory()->admin()->create();

    $response = actingAs($admin)
        ->get(route('dashboard.admin.periodic-recap.print', ['year' => '2026', 'months' => '2', 'chat' => '2', 'chat_limit' => '500'], absolute: false))
        ->assertOk();

    $response->assertDontSee('Menampilkan');
});

it('passes chat_limit props to index', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.periodic-recap.index', ['year' => '2026', 'months' => '1,2,3', 'chat_limit' => '123'], absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('chat_limit', '123')
        );
});

it('invalid chat_limit falls back to default', function () {
    actingAs(User::factory()->admin()->create())
        ->get(route('dashboard.admin.periodic-recap.index', ['year' => '2026', 'months' => '1,2,3', 'chat_limit' => 'abc'], absolute: false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('chat_limit', '500')
        );
});
