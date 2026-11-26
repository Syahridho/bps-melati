<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

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