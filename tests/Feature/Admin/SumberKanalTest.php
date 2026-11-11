<?php

use App\Events\ChannelStatsUpdated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Support\DashboardStats;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->operator = User::factory()->operator()->create();
    // Dataset minimal agar tidak bergantung seeder. Website dibuat migrasi
    // 2026_09_30_000003, jadi pakai firstOrCreate.
    Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'color' => '#0ea5e9', 'sort_order' => 6, 'is_active' => true, 'parent_id' => null]);
    Channel::firstOrCreate(['slug' => 'sosial-media'], ['name' => 'Sosial Media', 'color' => '#ec4899', 'sort_order' => 2, 'is_active' => true, 'parent_id' => null]);
});

test('guest cannot access sumber kanal settings', function () {
    get(route('settings.sumber-kanal.index'))->assertRedirect(route('login'));
});

test('operator cannot access sumber kanal settings', function () {
    actingAs($this->operator)->get(route('settings.sumber-kanal.index'))->assertForbidden();
});

test('admin can access sumber kanal settings', function () {
    actingAs($this->admin)->get(route('settings.sumber-kanal.index'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->component('settings/sumber-kanal/index')
                ->has('channels')
                ->has('parents');
        });
});

test('admin can create root channel with color', function () {
    actingAs($this->admin)->post(route('settings.sumber-kanal.store'), [
        'name' => 'Android',
        'parent_id' => null,
        'color' => '#06b6d4',
        'sort_order' => 7,
        'is_active' => true,
    ])->assertSessionHas('flash.success');

    expect(Channel::where('slug', 'android')->exists())->toBeTrue()
        ->and(Channel::where('slug', 'android')->value('color'))->toBe('#06b6d4');
});

test('admin can create child channel inheriting parent slug', function () {
    $parent = Channel::where('slug', 'sosial-media')->first();

    actingAs($this->admin)->post(route('settings.sumber-kanal.store'), [
        'name' => 'Instagram',
        'parent_id' => $parent->id,
        'color' => '',
        'sort_order' => 1,
        'is_active' => true,
    ])->assertSessionHas('flash.success');

    expect(Channel::where('slug', 'sosial-media-instagram')->exists())->toBeTrue()
        ->and(Channel::where('slug', 'sosial-media-instagram')->value('parent_id'))->toBe($parent->id);
});

test('validation rejects color invalid and parent not root', function () {
    $parent = Channel::where('slug', 'sosial-media')->first();
    $child = Channel::create(['name' => 'Instagram', 'slug' => 'sosial-media-instagram', 'color' => null, 'sort_order' => 1, 'is_active' => true, 'parent_id' => $parent->id]);

    actingAs($this->admin)->post(route('settings.sumber-kanal.store'), [
        'name' => 'Android',
        'parent_id' => $child->id,
        'color' => '#06b6d4',
        'sort_order' => 7,
        'is_active' => true,
    ])->assertSessionHasErrors('parent_id');
});

test('channel cannot be its own parent', function () {
    $channel = Channel::where('slug', 'website')->first();

    actingAs($this->admin)->put(route('settings.sumber-kanal.update', $channel), [
        'name' => 'Website',
        'parent_id' => $channel->id,
        'color' => '#0ea5e9',
        'sort_order' => 6,
        'is_active' => true,
    ])->assertSessionHasErrors('parent_id');
});

test('cannot delete channel with tickets', function () {
    $channel = Channel::where('slug', 'website')->first();
    Ticket::create([
        'ticket_number' => 'L-1400/112026/0001',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Test',
        'content' => 'Isi laporan test',
        'channel_id' => $channel->id,
        'status' => 'baru',
    ]);

    actingAs($this->admin)->delete(route('settings.sumber-kanal.destroy', $channel))
        ->assertSessionHasErrors('error');

    expect(Channel::whereKey($channel->id)->exists())->toBeTrue();
});

test('can delete unused channel', function () {
    $channel = Channel::create(['name' => 'Lama', 'slug' => 'lama', 'color' => '#111111', 'sort_order' => 20, 'is_active' => true]);

    actingAs($this->admin)->delete(route('settings.sumber-kanal.destroy', $channel))
        ->assertSessionHas('flash.success');

    expect(Channel::whereKey($channel->id)->exists())->toBeFalse();
});

test('dashboard sumberKanal includes new channel with color and counts', function () {
    $android = Channel::create(['name' => 'Android', 'slug' => 'android', 'color' => '#06b6d4', 'sort_order' => 7, 'is_active' => true]);
    $sosmed = Channel::where('slug', 'sosial-media')->first();
    $ig = Channel::create(['name' => 'Instagram', 'slug' => 'sosial-media-instagram', 'color' => null, 'sort_order' => 1, 'is_active' => true, 'parent_id' => $sosmed->id]);

    Ticket::create(['ticket_number' => 'L-1400/112026/0002', 'period' => '2026-11', 'sequence' => 2, 'classification' => 'pengaduan', 'title' => 'T1', 'content' => 'Isi laporan test cukup panjang', 'channel_id' => $ig->id, 'status' => 'baru']);

    $data = DashboardStats::build();
    expect(collect($data['sumberKanal'])->firstWhere('slug', 'android')['color'])->toBe('#06b6d4')
        ->and(collect($data['sumberKanal'])->firstWhere('slug', 'sosial-media')['total'])->toBe(1)
        ->and(collect($data['sumberKanal'])->firstWhere('slug', 'android')['total'])->toBe(0);
});

test('channel change dispatches ChannelStatsUpdated', function () {
    Event::fake([ChannelStatsUpdated::class]);

    actingAs($this->admin)->post(route('settings.sumber-kanal.store'), [
        'name' => 'Android',
        'parent_id' => null,
        'color' => '#06b6d4',
        'sort_order' => 7,
        'is_active' => true,
    ]);

    Event::assertDispatched(ChannelStatsUpdated::class, fn ($e) => $e->name === 'Android');
});

test('ticket creation dispatches ChannelStatsUpdated', function () {
    Event::fake([ChannelStatsUpdated::class]);
    $channel = Channel::where('slug', 'website')->first();

    Ticket::create(['ticket_number' => 'L-1400/112026/0003', 'period' => '2026-11', 'sequence' => 3, 'classification' => 'pengaduan', 'title' => 'T2', 'content' => 'Isi laporan test cukup panjang', 'channel_id' => $channel->id, 'status' => 'baru']);

    Event::assertDispatched(ChannelStatsUpdated::class);
});
