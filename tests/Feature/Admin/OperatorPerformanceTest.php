<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

uses(RefreshDatabase::class);

function makePerfTicket(array $overrides = []): Ticket
{
    static $seq = 1;
    $channel = Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    return Ticket::create(array_merge([
        'ticket_number' => 'PERF-'.sprintf('%04d', $seq++),
        'period' => now()->format('Y-m'),
        'sequence' => $seq,
        'classification' => 'pengaduan',
        'title' => 'Test Ticket Title',
        'channel_id' => $channel->id,
        'content' => 'Isi laporan tiket test',
        'status' => 'baru',
        'source_app' => 'admin',
    ], $overrides));
}

test('guest cannot access operator performance endpoint', function () {
    getJson(route('dashboard.admin.operator.performance'))->assertUnauthorized();
});

test('operator cannot access operator performance endpoint', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->getJson(route('dashboard.admin.operator.performance'))
        ->assertForbidden();
});

test('admin receives operator performance json', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator', 'name' => 'Operator A']);

    makePerfTicket([
        'assigned_to' => $operator->id,
        'assignment_mode' => 'claim',
        'status' => 'selesai',
        'completed_at' => now(),
        'closed_reason' => 'staff',
        'rating' => 5,
        'rated_at' => now(),
        'created_at' => now()->subDay(),
    ]);

    actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance'))
        ->assertOk()
        ->assertJsonPath('operators.0.name', 'Operator A')
        ->assertJsonPath('operators.0.completed', 1)
        ->assertJsonPath('operators.0.rating', 5);
});

test('tickets without pic are excluded and counted', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    makePerfTicket([
        'assigned_to' => null,
        'status' => 'selesai',
        'completed_at' => now(),
        'closed_reason' => 'staff',
    ]);

    $response = actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance'))
        ->assertOk();

    expect($response->json('totals.excluded_without_pic'))->toBe(1);
});

test('mode filter separates automatic and manual closures', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator', 'name' => 'Operator A']);

    makePerfTicket([
        'assigned_to' => $operator->id,
        'status' => 'selesai',
        'completed_at' => now(),
        'closed_reason' => 'auto_close',
    ]);
    makePerfTicket([
        'assigned_to' => $operator->id,
        'status' => 'selesai',
        'completed_at' => now(),
        'closed_reason' => 'staff',
    ]);

    $gabungan = actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance', ['mode' => 'gabungan']))
        ->assertOk();
    expect($gabungan->json('operators.0.completed'))->toBe(2);

    $otomatis = actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance', ['mode' => 'otomatis']))
        ->assertOk();
    expect($otomatis->json('operators.0.completed'))->toBe(1);

    $selesai = actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance', ['mode' => 'selesai']))
        ->assertOk();
    expect($selesai->json('operators.0.completed'))->toBe(1);
});

test('in progress snapshot is not affected by date filter', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $operator = User::factory()->create(['role' => 'operator', 'name' => 'Operator A']);

    makePerfTicket([
        'assigned_to' => $operator->id,
        'status' => 'diproses',
    ]);

    $oldMonth = now()->subMonths(2)->format('Y-m-d');
    actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance', ['from' => $oldMonth, 'to' => $oldMonth]))
        ->assertOk()
        ->assertJsonPath('operators.0.in_progress', 1);
});

test('invalid sort falls back to default', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->getJson(route('dashboard.admin.operator.performance', ['sort' => 'invalid']))
        ->assertOk()
        ->assertJsonPath('meta.sort', 'completed');
});
