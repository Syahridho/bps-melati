<?php

namespace App\Http\Controllers;

use App\Models\AndroidRelease;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AndroidDownloadController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $release = Cache::remember('android:release:active', now()->addMinutes(10), function () {
            return AndroidRelease::where('is_active', true)->latest('id')->first();
        });

        if (! $release) {
            abort(404, 'APK tidak tersedia.');
        }

        if (! Storage::disk('local')->exists($release->stored_path)) {
            Cache::forget('android:release:active');
            abort(404, 'APK tidak tersedia.');
        }

        AndroidRelease::where('id', $release->id)->increment('download_count');

        $filename = 'Melati-'.$release->version.'.apk';

        $headers = [
            'Content-Type' => 'application/vnd.android.package-archive',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
        ];

        return Storage::disk('local')->download($release->stored_path, $filename, $headers);
    }
}