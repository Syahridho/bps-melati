<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

function createBookmarkTestTicket(array $attributes = []): Ticket
{
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website']);

    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/' . now()->format('mY') . '/' . strtoupper(fake()->bothify('??##')),
        'channel_id' => $channel->id,
        'period' => now()->format('Y-m'),
        'sequence' => fake()->unique()->numberBetween(1, 9999),
        'classification' => 'pengaduan',
        'content' => 'Isi laporan pengujian minimal sepuluh karakter untuk testing.',
        'status' => 'baru',
        'reporter_name' => 'Pelapor Test',
        'source_app' => 'web',
    ], $attributes));
}

it('allows admin and operator to bookmark and unbookmark a ticket', function () {
    $admin = User::factory()->admin()->create();
    $ticket = createBookmarkTestTicket();

    actingAs($admin)
        ->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))
        ->assertRedirect();

    expect(DB::table('ticket_bookmarks')->where('user_id', $admin->id)->where('ticket_id', $ticket->id)->exists())->toBeTrue();

    // Unbookmark
    actingAs($admin)
        ->delete(route('dashboard.admin.laporan-masuk.bookmark.destroy', ['ticketNumber' => $ticket->ticket_number]))
        ->assertRedirect();

    expect(DB::table('ticket_bookmarks')->where('user_id', $admin->id)->where('ticket_id', $ticket->id)->exists())->toBeFalse();
});

it('is idempotent when bookmarking or unbookmarking multiple times', function () {
    $operator = User::factory()->operator()->create();
    $ticket = createBookmarkTestTicket();

    actingAs($operator)->put(route('dashboard.operator.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))->assertRedirect();
    actingAs($operator)->put(route('dashboard.operator.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))->assertRedirect();

    expect(DB::table('ticket_bookmarks')->where('user_id', $operator->id)->where('ticket_id', $ticket->id)->count())->toBe(1);

    actingAs($operator)->delete(route('dashboard.operator.laporan-masuk.bookmark.destroy', ['ticketNumber' => $ticket->ticket_number]))->assertRedirect();
    actingAs($operator)->delete(route('dashboard.operator.laporan-masuk.bookmark.destroy', ['ticketNumber' => $ticket->ticket_number]))->assertRedirect();

    expect(DB::table('ticket_bookmarks')->where('user_id', $operator->id)->where('ticket_id', $ticket->id)->count())->toBe(0);
});

it('keeps bookmarks private per user account', function () {
    $userA = User::factory()->admin()->create();
    $userB = User::factory()->operator()->create();
    $ticket = createBookmarkTestTicket();

    actingAs($userA)->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]));

    expect(DB::table('ticket_bookmarks')->where('user_id', $userA->id)->where('ticket_id', $ticket->id)->exists())->toBeTrue();
    expect(DB::table('ticket_bookmarks')->where('user_id', $userB->id)->where('ticket_id', $ticket->id)->exists())->toBeFalse();

    actingAs($userB)
        ->get(route('dashboard.operator.laporan-masuk.index', ['tab' => 'ditandai']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->has('tickets.data', 0)
            ->where('counts.ditandai', 0)
        );

    actingAs($userA)
        ->get(route('dashboard.admin.laporan-masuk.index', ['tab' => 'ditandai']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk')
            ->has('tickets.data', 1)
            ->where('counts.ditandai', 1)
        );
});

it('does not alter ticket status, version, updated_at, or trigger events/jobs/mails', function () {
    Event::fake();
    Bus::fake();
    Mail::fake();

    $admin = User::factory()->admin()->create();
    $ticket = createBookmarkTestTicket();
    $originalUpdatedAt = $ticket->updated_at;
    $originalVersion = $ticket->version ?? 0;
    $originalStatus = $ticket->status;

    actingAs($admin)
        ->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))
        ->assertRedirect();

    $ticket->refresh();

    expect($ticket->status)->toBe($originalStatus);
    expect($ticket->version ?? 0)->toBe($originalVersion);
    expect($ticket->updated_at->toIso8601String())->toBe($originalUpdatedAt->toIso8601String());

    Event::assertNotDispatched(\App\Events\TicketCreated::class);
    Event::assertNotDispatched(\App\Events\TicketUpdated::class);
    Event::assertNotDispatched(\App\Events\TicketResponseCreated::class);
    Bus::assertNothingDispatched();
    Mail::assertNothingSent();
});

it('shows bookmark info on ticket detail for other staff without sensitive data', function () {
    $userA = User::factory()->admin()->create(['name' => 'Petugas A']);
    $userB = User::factory()->operator()->create(['name' => 'Petugas B']);
    $ticket = createBookmarkTestTicket();

    actingAs($userA)->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]));

    actingAs($userB)
        ->get(route('dashboard.operator.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk/show')
            ->where('ticket.bookmark_info.by_me', false)
            ->where('ticket.bookmark_info.others_count', 1)
            ->where('ticket.bookmark_info.others.0.name', 'Petugas A')
            ->has('ticket.bookmark_info.others.0', 2)
        );

    actingAs($userA)
        ->get(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/laporan-masuk/show')
            ->where('ticket.bookmark_info.by_me', true)
        );
});

it('denies operator_tim and guests from bookmarking', function () {
    $operatorTim = User::factory()->create(['role' => 'operator_tim']);
    $ticket = createBookmarkTestTicket();

    actingAs($operatorTim)
        ->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))
        ->assertForbidden();

    $this->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]))
        ->assertForbidden();
});

it('broadcasts bookmark change events when state changes', function () {
    Event::fake([App\Events\TicketBookmarkChanged::class, App\Events\TicketBookmarkersChanged::class]);

    $admin = User::factory()->admin()->create();
    $otherUser = User::factory()->operator()->create();
    $ticket = createBookmarkTestTicket();
    $ticket->bookmarkedBy()->attach($otherUser->id);

    actingAs($admin)->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]));

    Event::assertDispatched(App\Events\TicketBookmarkChanged::class, function ($event) use ($admin, $ticket) {
        return $event->userId === $admin->id && $event->ticketId === $ticket->id && $event->bookmarked === true;
    });

    Event::assertDispatched(App\Events\TicketBookmarkersChanged::class, function ($event) use ($ticket) {
        return $event->ticketId === $ticket->id && $event->othersCount === 1;
    });

    Event::fake([App\Events\TicketBookmarkChanged::class, App\Events\TicketBookmarkersChanged::class]);
    actingAs($admin)->put(route('dashboard.admin.laporan-masuk.bookmark.store', ['ticketNumber' => $ticket->ticket_number]));
    Event::assertNotDispatched(App\Events\TicketBookmarkChanged::class);
});
