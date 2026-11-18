<?php

use App\Models\Channel;
use App\Models\CensoredWord;
use App\Models\Ticket;
use App\Models\User;
use App\Support\ProfanityFilter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
    $this->admin = User::factory()->admin()->create();

    CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);
    CensoredWord::create(['word' => 'memek', 'match_type' => 'whole_word', 'is_active' => true]);
    ProfanityFilter::clearCache();
});

function profaneTicket(array $overrides = []): Ticket
{
    return Ticket::create(array_merge([
        'ticket_number' => 'L-1400/112026/AA001',
        'period' => '2026-11',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'channel_id' => Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true])->id,
        'title' => 'Judul anjing ini',
        'content' => 'Isi laporan yang mengandung kata anjing dan memek.',
        'status' => 'baru',
        'source_app' => 'web',
    ], $overrides));
}

test('membuat laporan dengan kata kasar berhasil dan database tetap menyimpan teks asli', function () {
    Event::fake();

    $this->post(route('tickets.store'), [
        'classification' => 'pengaduan',
        'title' => 'Laporan soal anjing liar',
        'content' => 'Saya melaporkan ada anjing di depan kantor yang menggonggong sejak malam tadi.',
        'channel_id' => $this->channel->id,
    ])->assertRedirect();

    $ticket = Ticket::where('ticket_number', 'like', 'L-%')->first();

    expect($ticket->title)->toBe('Laporan soal anjing liar');
    expect($ticket->content)->toContain('anjing');
    expect($ticket->source_app)->toBe('web');
});

test('halaman publik /check menampilkan teks tersensor', function () {
    $ticket = profaneTicket();

    $this->get(route('tickets.check', ['ticket_number' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('check/index')
            ->where('ticket.title', 'Judul a***** ini')
            ->where('ticket.content', 'Isi laporan yang mengandung kata a***** dan m****.')
        );
});

test('API /check mengembalikan teks tersensor bagi klien publik', function () {
    $ticket = profaneTicket();

    $this->withHeader('X-API-KEY', config('app.api_key'))
        ->getJson('/api/check?ticket_number='.$ticket->ticket_number)
        ->assertOk()
        ->assertJsonPath('data.title', 'Judul a***** ini')
        ->assertJsonPath('data.content', 'Isi laporan yang mengandung kata a***** dan m****.');
});

test('clean statis mensensor via singleton config dan biarkan aman untuk teks bebas', function () {
    expect(ProfanityFilter::clean('anjing'))->toBe('a*****');
    expect(ProfanityFilter::clean('selamat pagi dunia'))->toBe('selamat pagi dunia');
    expect(ProfanityFilter::clean(null))->toBeNull();
});

test('halaman admin default tersensor, has_profanity true, dan teks asli hanya untuk petugas', function () {
    $ticket = profaneTicket();

    $this->actingAs($this->admin)
        ->get(route('dashboard.admin.laporan-masuk.show', ['ticketNumber' => $ticket->ticket_number]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/admin/laporan-masuk/show/index')
            ->where('ticket.has_profanity', true)
            ->where('ticket.title', 'Judul a***** ini')
            ->where('ticket.content', 'Isi laporan yang mengandung kata a***** dan m****.')
            ->where('ticket.title_original', 'Judul anjing ini')
            ->where('ticket.content_original', 'Isi laporan yang mengandung kata anjing dan memek.')
        );
});
