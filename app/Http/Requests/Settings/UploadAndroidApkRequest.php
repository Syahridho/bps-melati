<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use ZipArchive;

class UploadAndroidApkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'apk' => ['required', 'file', 'max:10240'],
            'version' => ['required', 'string', 'max:20', 'regex:/^[0-9]+(?:\.[0-9]+)*$/'],
            'release_notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'apk.required' => 'File APK wajib diunggah.',
            'apk.file' => 'File APK tidak valid.',
            'apk.max' => 'Ukuran file maksimal 10 MB (10240 KB).',
            'version.required' => 'Versi wajib diisi.',
            'version.string' => 'Versi harus berupa teks.',
            'version.max' => 'Versi maksimal 20 karakter.',
            'version.regex' => 'Format versi tidak valid (gunakan angka dan titik, mis. 1.0.0).',
            'release_notes.string' => 'Catatan rilis harus berupa teks.',
            'release_notes.max' => 'Catatan rilis maksimal 500 karakter.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $file = $this->file('apk');
            if (! $file) {
                return;
            }

            $extension = strtolower((string) $file->getClientOriginalExtension());
            if ($extension !== 'apk') {
                $validator->errors()->add('apk', 'File harus berformat .apk.');
                return;
            }

            // Verifikasi isi: buka sebagai ZIP dan pastikan berisi AndroidManifest.xml.
            $zip = new ZipArchive();
            $opened = $zip->open($file->getRealPath());
            if ($opened !== true) {
                $validator->errors()->add('apk', 'File bukan APK yang valid.');
                return;
            }

            $hasManifest = false;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if ($name === 'AndroidManifest.xml' || str_ends_with($name, '/AndroidManifest.xml')) {
                    // only root entry counts
                    if ($name === 'AndroidManifest.xml') {
                        $hasManifest = true;
                        break;
                    }
                }
            }
            $zip->close();

            if (! $hasManifest) {
                $validator->errors()->add('apk', 'File bukan APK yang valid.');
            }
        });
    }
}