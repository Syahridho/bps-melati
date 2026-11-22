<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAutoCloseSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'auto_close_pengaduan_days' => ['required', 'integer', 'min:0', 'max:365'],
            'auto_close_aspirasi_days' => ['required', 'integer', 'min:0', 'max:365'],
            'auto_close_permintaan_informasi_days' => ['required', 'integer', 'min:0', 'max:365'],
            'kadar_pengawasan_hari' => ['required', 'integer', 'min:0', 'max:365'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'auto_close_pengaduan_days.min' => 'Batas waktu pengaduan minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'auto_close_aspirasi_days.min' => 'Batas waktu aspirasi minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'auto_close_permintaan_informasi_days.min' => 'Batas waktu permintaan informasi minimal 0 hari. Isi 0 untuk menonaktifkan.',
            'kadar_pengawasan_hari.min' => 'Kadar pengawasan minimal 0 hari.',
            'auto_close_pengaduan_days.max' => 'Batas waktu pengaduan maksimal 365 hari.',
            'auto_close_aspirasi_days.max' => 'Batas waktu aspirasi maksimal 365 hari.',
            'auto_close_permintaan_informasi_days.max' => 'Batas waktu permintaan informasi maksimal 365 hari.',
            'kadar_pengawasan_hari.max' => 'Kadar pengawasan maksimal 365 hari.',
            'auto_close_pengaduan_days.required' => 'Batas waktu pengaduan wajib diisi. Isi 0 untuk menonaktifkan.',
            'auto_close_aspirasi_days.required' => 'Batas waktu aspirasi wajib diisi. Isi 0 untuk menonaktifkan.',
            'auto_close_permintaan_informasi_days.required' => 'Batas waktu permintaan informasi wajib diisi. Isi 0 untuk menonaktifkan.',
            'kadar_pengawasan_hari.required' => 'Kadar pengawasan wajib diisi.',
        ];
    }
}
