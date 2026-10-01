<?php

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->channel = Channel::where('slug', 'website')->first()
        ?? Channel::firstOrCreate(['slug' => 'website'], ['name' => 'Website', 'is_active' => true]);

    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
    $this->operator = User::factory()->create(['role' => UserRole::Operator]);
});

test('admin can update allowed ticket fields', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'P-1400/102026/AA01',
        'period' => '102026',
        'sequence' => 1,
        'classification' => 'pengaduan',
        'title' => 'Judul Lama',
        'content' => 'Isi laporan lama yang cukup panjang',
        'reporter_name' => 'Budi Lama',
        'reporter_email' => 'budi.lama@example.com',
        'reporter_wa' => '081234567890',
        'channel_id' => $this->channel->id,
        'status' => 'baru',
    ]);

    $response = $this->actingAs($this->admin)
        ->put(route('dashboard.admin.laporan-masuk.update', ['ticketNumber' => $ticket->ticket_number]), [
            'reporter_name' => 'Budi Baru',
            'reporter_email' => 'budi.baru@example.com',
            'reporter_wa' => '089876543210',
            'title' => 'Judul Baru',
            'content' => 'Isi laporan baru yang sudah diperbarui',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $ticket->refresh();
    expect($ticket->reporter_name)->toBe('Budi Baru');
    expect($ticket->reporter_email)->toBe('budi.baru@example.com');
    expect($ticket->reporter_wa)->toBe('089876543210');
    expect($ticket->title)->toBe('Judul Baru');
    expect($ticket->content)->toBe('Isi laporan baru yang sudah diperbarui');

    // Uneditable fields remain unchanged
    expect($ticket->ticket_number)->toBe('P-1400/102026/AA01');
    expect($ticket->classification)->toBe('pengaduan');
    expect($ticket->period)->toBe('102026');
    expect($ticket->sequence)->toBe(1);
    expect($ticket->status)->toBe('baru');
});

test('admin can delete a ticket and its attachments', function () {
    Storage::fake('public');

    $ticket = Ticket::create([
        'ticket_number' => 'P-1400/102026/AA02',
        'period' => '102026',
        'sequence' => 2,
        'classification' => 'pengaduan',
        'title' => 'Tiket Dihapus',
        'content' => 'Isi laporan tiket yang akan dihapus',
        'channel_id' => $this->channel->id,
        'status' => 'baru',
    ]);

    TicketAttachment::create([
        'ticket_id' => $ticket->id,
        'path' => 'attachments/test_file.pdf',
        'original_name' => 'test_file.pdf',
        'mime_type' => 'application/pdf',
        'size' => 1024,
    ]);

    Storage::disk('public')->put('attachments/test_file.pdf', 'dummy content');
    Storage::disk('public')->assertExists('attachments/test_file.pdf');

    $response = $this->actingAs($this->admin)
        ->delete(route('dashboard.admin.laporan-masuk.destroy', ['ticketNumber' => $ticket->ticket_number]));

    $response->assertRedirect(route('dashboard.admin.laporan-masuk.index'));
    $response->assertSessionHas('success');

    expect(Ticket::find($ticket->id))->toBeNull();
    Storage::disk('public')->assertMissing('attachments/test_file.pdf');
});

test('operator is forbidden from updating or deleting tickets', function () {
    $ticket = Ticket::create([
        'ticket_number' => 'P-1400/102026/AA03',
        'period' => '102026',
        'sequence' => 3,
        'classification' => 'pengaduan',
        'title' => 'Tiket Operator Test',
        'content' => 'Isi laporan tiket operator test',
        'channel_id' => $this->channel->id,
        'status' => 'baru',
    ]);

    $updateResponse = $this->actingAs($this->operator)
        ->put(route('dashboard.operator.laporan-masuk.update', ['ticketNumber' => $ticket->ticket_number]), [
            'title' => 'Mencoba Update',
            'content' => 'Isi mencoba update',
        ]);

    $updateResponse->assertStatus(403);

    $deleteResponse = $this->actingAs($this->operator)
        ->delete(route('dashboard.operator.laporan-masuk.destroy', ['ticketNumber' => $ticket->ticket_number]));

    $deleteResponse->assertStatus(403);
});
