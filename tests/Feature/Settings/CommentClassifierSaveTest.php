<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;

uses(RefreshDatabase::class);

test('admin menyimpan daftar dengan duplikat dan kosong lalu rules berupa array', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->post(route('settings.comment-classifier.update'), [
            'min_length' => 10,
            'min_words' => 3,
            'fallback_when_uncertain' => false,
            'keywords' => [
                'pengaduan' => ['lambat', '', 'lambat', '  ', 'error'],
                'aspirasi' => [],
                'permintaan_informasi' => ['syarat', 'syarat', ''],
            ],
            'ignore' => ['', 'mantap', 'mantap', '  '],
            'abbreviations' => [],
            'priority' => ['pengaduan', 'pengaduan', 'aspirasi', 'permintaan_informasi'],
        ])
        ->assertRedirect();

    actingAs($admin)
        ->get(route('settings.comment-classifier.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/comment-classifier/index')
            ->where('rules.keywords.pengaduan', ['lambat', 'error'])
            ->where('rules.keywords.permintaan_informasi', ['syarat'])
            ->where('rules.ignore', ['mantap'])
            ->where('rules.priority', ['pengaduan', 'aspirasi', 'permintaan_informasi'])
        );
});

test('admin menerima flash success saat berhasil menyimpan pengaturan klasifikasi komentar', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->from(route('settings.comment-classifier.index'))
        ->post(route('settings.comment-classifier.update'), [
            'min_length' => 12,
            'min_words' => 4,
            'fallback_when_uncertain' => true,
        ])
        ->assertRedirect(route('settings.comment-classifier.index'))
        ->assertSessionHas('flash.success', 'Aturan klasifikasi komentar berhasil disimpan!');
});

test('admin menerima error validasi saat isian wajib tidak valid', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    actingAs($admin)
        ->from(route('settings.comment-classifier.index'))
        ->post(route('settings.comment-classifier.update'), [
            'min_length' => 0,
            'min_words' => 0,
        ])
        ->assertRedirect(route('settings.comment-classifier.index'))
        ->assertSessionHasErrors(['min_length', 'min_words'])
        ->assertSessionMissing('flash.success');
});

test('pengguna non-admin tidak dapat menyimpan pengaturan klasifikasi komentar', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    actingAs($operator)
        ->post(route('settings.comment-classifier.update'), [
            'min_length' => 10,
            'min_words' => 3,
        ])
        ->assertForbidden();
});
