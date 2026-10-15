<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use App\Rules\NotPlaceholderEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Validator;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\post;
use function Pest\Laravel\withHeader;

uses(RefreshDatabase::class);

beforeEach(function () {
    Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);
});

function ticketPayload(array $overrides = []): array
{
    return array_merge([
        'classification' => 'pengaduan',
        'title' => 'Judul Laporan Pengujian',
        'content' => 'Isi laporan pengujian yang cukup panjang untuk validasi.',
        'reporter_name' => 'Pelapor Test',
        'reporter_email' => 'pelapor.valid@gmail.com',
    ], $overrides);
}

test('placeholder local-part ditolak', function (string $email) {
    $v = Validator::make(
        ['email' => $email],
        ['email' => [new NotPlaceholderEmail]]
    );

    expect($v->fails())->toBeTrue()
        ->and($v->errors()->first('email'))->toContain('tidak valid');
})->with([
    'asd@gmail.com',
    'test@gmail.com',
    'xxx@yahoo.com',
    'abc@outlook.com',
    'qwerty@gmail.com',
    'dummy@gmail.com',
    'a@gmail.com',
    '123@gmail.com',
]);

test('placeholder domain ditolak', function (string $email) {
    $v = Validator::make(
        ['email' => $email],
        ['email' => [new NotPlaceholderEmail]]
    );

    expect($v->fails())->toBeTrue();
})->with([
    'valid.user@example.com',
    'nama@test.com',
    'siapa@mailinator.com',
    'user@yopmail.com',
]);

test('email valid lolos NotPlaceholderEmail', function (string $email) {
    $v = Validator::make(
        ['email' => $email],
        ['email' => [new NotPlaceholderEmail]]
    );

    expect($v->fails())->toBeFalse();
})->with([
    'budi.santoso@gmail.com',
    'siti.nurhaliza@yahoo.co.id',
    'pelapor123@outlook.com',
    'ahmad.pelapor@bps.go.id',
]);

test('form publik menolak email placeholder', function () {
    Event::fake();

    post(route('tickets.store'), ticketPayload([
        'reporter_email' => 'asd@gmail.com',
    ]))->assertSessionHasErrors('reporter_email');
});

test('form publik menolak domain contoh', function () {
    Event::fake();

    post(route('tickets.store'), ticketPayload([
        'reporter_email' => 'valid.user@example.com',
    ]))->assertSessionHasErrors('reporter_email');
});

test('form publik menerima email valid', function () {
    Event::fake();

    post(route('tickets.store'), ticketPayload([
        'reporter_email' => 'pelapor.valid@gmail.com',
    ]))->assertSessionHasNoErrors();
});

test('api menolak email placeholder', function () {
    $apiKey = config('app.api_key', 'melati-secret-api-key');

    withHeader('X-API-KEY', $apiKey)
        ->postJson('/api/tickets', ticketPayload([
            'reporter_email' => 'test@gmail.com',
        ]))->assertStatus(422)
        ->assertJsonPath('errors.reporter_email.0', fn ($msg) => str_contains($msg, 'tidak valid'));
});

test('api menolak format email tidak valid', function () {
    $apiKey = config('app.api_key', 'melati-secret-api-key');

    withHeader('X-API-KEY', $apiKey)
        ->postJson('/api/tickets', ticketPayload([
            'reporter_email' => 'bukan-email',
        ]))->assertStatus(422)
        ->assertJsonPath('errors.reporter_email', fn ($errors) => count($errors) > 0);
});

test('api menerima email valid dan lowercase', function () {
    Event::fake();
    $apiKey = config('app.api_key', 'melati-secret-api-key');

    withHeader('X-API-KEY', $apiKey)
        ->postJson('/api/tickets', ticketPayload([
            'reporter_email' => 'Budi.Santoso@Gmail.Com',
        ]))->assertStatus(201);

    $ticket = Ticket::latest()->first();
    expect($ticket->reporter_email)->toBe('budi.santoso@gmail.com');
});

test('input data admin menolak email placeholder', function () {
    Event::fake();
    $admin = User::factory()->admin()->create();

    actingAs($admin)
        ->post(route('dashboard.admin.input-data.store'), ticketPayload([
            'reporter_email' => 'asdf@gmail.com',
            'response_type' => 'respon_awal',
            'response_message' => 'Terima kasih atas laporannya.',
        ]))->assertSessionHasErrors('reporter_email');
});
