<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateReportSignatureSettingsRequest extends FormRequest
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
            'nama_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'jabatan_penanda_tangan' => ['nullable', 'string', 'max:255'],
            'kota_penanda_tangan' => ['nullable', 'string', 'max:255'],
        ];
    }
}
