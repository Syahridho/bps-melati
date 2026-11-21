<?php

namespace App\Http\Requests\Settings;

use App\Enums\AssignmentMode;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssignmentModeRequest extends FormRequest
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
            'mode' => ['required', 'string', Rule::in(AssignmentMode::values())],
            'apply' => ['required', 'string', Rule::in(['now', 'scheduled'])],
            'scheduled_at' => ['nullable', 'required_if:apply,scheduled', 'date', 'after:now'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mode.required' => 'Mode penanganan laporan wajib dipilih.',
            'mode.in' => 'Mode penanganan laporan tidak valid.',
            'apply.required' => 'Pilihan waktu penerapan wajib diisi.',
            'apply.in' => 'Pilihan waktu penerapan tidak valid.',
            'scheduled_at.required_if' => 'Tanggal dan jam penerapan wajib diisi untuk perubahan terjadwal.',
            'scheduled_at.date' => 'Tanggal dan jam penerapan tidak valid.',
            'scheduled_at.after' => 'Jadwal penerapan harus di masa depan.',
        ];
    }
}
