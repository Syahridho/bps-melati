<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UploadAndroidApkRequest;
use App\Models\AndroidRelease;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AndroidController extends Controller
{
    private const CACHE_KEY = 'android:release:active';

    public function index(): Response
    {
        $release = AndroidRelease::active();

        return Inertia::render('settings/android/index', [
            'release' => $release ? $this->present($release) : null,
        ]);
    }

    public function store(UploadAndroidApkRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $file = $request->file('apk');

        $oldRelease = AndroidRelease::active();

        $storedPath = $file->storeAs('android', Str::uuid()->toString().'.apk', 'local');

        $checksum = hash_file('sha256', $file->getRealPath());
        $size = $file->getSize();

        try {
            AndroidRelease::where('is_active', true)->update(['is_active' => false]);

            $release = AndroidRelease::create([
                'version' => $validated['version'],
                'release_notes' => $validated['release_notes'] ?? null,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $storedPath,
                'size_bytes' => $size,
                'checksum_sha256' => $checksum,
                'uploaded_by' => $request->user()?->id,
                'is_active' => true,
                'download_count' => 0,
            ]);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            throw $e;
        }

        if ($oldRelease) {
            Storage::disk('local')->delete($oldRelease->stored_path);
        }

        Cache::forget(self::CACHE_KEY);

        AuditLogger::log(
            eventType: $oldRelease ? 'android.apk.replaced' : 'android.apk.uploaded',
            category: 'android',
            actor: $request->user(),
            request: $request,
            meta: [
                'version' => $release->version,
                'original_name' => $release->original_name,
                'size_bytes' => $release->size_bytes,
                'checksum_sha256' => $release->checksum_sha256,
            ],
            severity: 'notice',
        );

        return redirect()->back()->with('flash', [
            'success' => 'APK berhasil diunggah.',
        ]);
    }

    public function destroy(AndroidRelease $androidRelease): RedirectResponse
    {
        $version = $androidRelease->version;
        $originalName = $androidRelease->original_name;

        Storage::disk('local')->delete($androidRelease->stored_path);
        $androidRelease->delete();

        Cache::forget(self::CACHE_KEY);

        AuditLogger::log(
            eventType: 'android.apk.deleted',
            category: 'android',
            actor: request()->user(),
            request: request(),
            meta: [
                'version' => $version,
                'original_name' => $originalName,
            ],
            severity: 'notice',
        );

        return redirect()->back()->with('flash', [
            'success' => 'APK berhasil dihapus.',
        ]);
    }

    private function present(AndroidRelease $release): array
    {
        return [
            'id' => $release->id,
            'version' => $release->version,
            'release_notes' => $release->release_notes,
            'original_name' => $release->original_name,
            'size_bytes' => $release->size_bytes,
            'checksum_sha256' => $release->checksum_sha256,
            'uploaded_at' => $release->created_at?->toIso8601String(),
            'uploaded_by' => $release->uploader?->name,
            'download_count' => $release->download_count,
        ];
    }
}