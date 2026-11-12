<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDashboardLiveRequest extends FormRequest
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
            'dashboard_live_enabled' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'dashboard_live_enabled.required' => 'Pengaturan pembaruan realtime dashboard wajib diisi.',
            'dashboard_live_enabled.boolean' => 'Pengaturan pembaruan realtime dashboard harus bernilai ya atau tidak.',
        ];
    }
}
