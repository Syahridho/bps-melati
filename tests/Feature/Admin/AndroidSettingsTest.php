<?php

use App\Models\User;
use App\Models\AndroidRelease;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

function makeApkFile(string $name = 'melati.apk', bool $withManifest = true, int $sizeKb = 1): UploadedFile
{
    $tmp = tempnam(sys_get_temp_dir(), 'apk');
    if ($withManifest) {
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString('AndroidManifest.xml', '<manifest/>');
        $zip->close();
    } else {
        $zip = new ZipArchive();
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $zip->addFromString('readme.txt', 'not an apk');
        $zip->close();
    }

    // Pad to requested size (KB) if needed
    if ($sizeKb > 1) {
        file_put_contents($tmp, str_repeat('A', $sizeKb * 1024), FILE_APPEND);
    }

    return new UploadedFile($tmp, $name, 'application/vnd.android.package-archive', null, true);
}

test('admin can upload a valid APK', function () {
    Storage::fake('local');
    Cache::flush();
    $admin = User::factory()->create(['role' => 'admin']);

    $file = makeApkFile();

    $this->actingAs($admin)
        ->post(route('settings.android.store'), [
            'apk' => $file,
            'version' => '1.0.0',
            'release_notes' => 'Rilis awal',
        ])
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    expect(AndroidRelease::count())->toBe(1);
    $release = AndroidRelease::first();
    expect($release->version)->toBe('1.0.0')
        ->and($release->is_active)->toBeTrue()
        ->and($release->checksum_sha256)->not->toBeEmpty();
    expect(Storage::disk('local')->exists($release->stored_path))->toBeTrue();
});

test('operator cannot access android settings (403)', function () {
    $operator = User::factory()->create(['role' => 'operator']);

    $this->actingAs($operator)
        ->get(route('settings.android'))
        ->assertForbidden();

    $this->actingAs($operator)
        ->post(route('settings.android.store'), [])
        ->assertForbidden();
});

test('upload rejects file larger than 10MB', function () {
    Storage::fake('local');
    $admin = User::factory()->create(['role' => 'admin']);

    $file = makeApkFile('big.apk', true, 10241);

    $this->actingAs($admin)
        ->post(route('settings.android.store'), [
            'apk' => $file,
            'version' => '1.0.0',
        ])
        ->assertSessionHasErrors('apk');
});

test('upload rejects non-apk extension', function () {
    Storage::fake('local');
    $admin = User::factory()->create(['role' => 'admin']);

    $tmp = tempnam(sys_get_temp_dir(), 'txt');
    file_put_contents($tmp, 'hello');
    $file = new UploadedFile($tmp, 'file.txt', 'text/plain', null, true);

    $this->actingAs($admin)
        ->post(route('settings.android.store'), [
            'apk' => $file,
            'version' => '1.0.0',
        ])
        ->assertSessionHasErrors('apk');
});

test('upload rejects zip without AndroidManifest.xml', function () {
    Storage::fake('local');
    $admin = User::factory()->create(['role' => 'admin']);

    $file = makeApkFile('bad.apk', false);

    $this->actingAs($admin)
        ->post(route('settings.android.store'), [
            'apk' => $file,
            'version' => '1.0.0',
        ])
        ->assertSessionHasErrors('apk');
});

test('replacing APK deletes old file', function () {
    Storage::fake('local');
    Cache::flush();
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->post(route('settings.android.store'), [
        'apk' => makeApkFile('v1.apk'),
        'version' => '1.0.0',
    ])->assertRedirect();

    $old = AndroidRelease::first();
    $oldPath = $old->stored_path;

    $this->actingAs($admin)->post(route('settings.android.store'), [
        'apk' => makeApkFile('v2.apk'),
        'version' => '2.0.0',
    ])->assertRedirect();

    expect(AndroidRelease::count())->toBe(2);
    expect(AndroidRelease::where('is_active', true)->first()->version)->toBe('2.0.0');
    expect(Storage::disk('local')->exists($oldPath))->toBeFalse();
});

test('public download succeeds with correct headers and increments count', function () {
    Storage::fake('local');
    Cache::flush();
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->post(route('settings.android.store'), [
        'apk' => makeApkFile(),
        'version' => '1.0.0',
    ])->assertRedirect();

    $release = AndroidRelease::first();

    $response = $this->get(route('android.download'));
    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.android.package-archive');
    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $disposition = $response->headers->get('Content-Disposition');
    expect($disposition)->toContain('attachment');
    expect($disposition)->toContain('Melati-1.0.0.apk');

    expect($release->fresh()->download_count)->toBe(1);
});

test('public download returns 404 when no APK', function () {
    Storage::fake('local');
    Cache::flush();

    $this->get(route('android.download'))->assertNotFound();
});

test('admin can delete APK', function () {
    Storage::fake('local');
    Cache::flush();
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->post(route('settings.android.store'), [
        'apk' => makeApkFile(),
        'version' => '1.0.0',
    ])->assertRedirect();

    $release = AndroidRelease::first();

    $this->actingAs($admin)
        ->delete(route('settings.android.destroy', $release->id))
        ->assertRedirect()
        ->assertSessionHas('flash.success');

    expect(AndroidRelease::count())->toBe(0);
    expect(Storage::disk('local')->exists($release->stored_path))->toBeFalse();
});

test('upload handles missing PHP zip extension without HTTP 500', function () {
    // Skenario ini tidak dapat disimulasikan di lingkungan uji tanpa
    // menonaktifkan ekstensi zip pada php.ini. Guard-nya diverifikasi lewat
    // kode (class_exists/extension_loaded) dan Log::warning.
})->skip('Ekstensi zip aktif di lingkungan uji; tidak dapat dinonaktifkan dari kode.');