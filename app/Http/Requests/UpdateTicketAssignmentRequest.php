<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('assigned_to') === '' || $this->input('assigned_to') === null) {
            $this->merge(['assigned_to' => null]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'assigned_to' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', UserRole::Operator->value)
                    ->where('is_active', true)
                    ->where('is_available', true)
                    ->whereNull('deleted_at'),
            ],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'assigned_to.exists' => 'Operator yang dipilih tidak aktif, tidak tersedia, atau sudah dihapus.',
            'assigned_to.integer' => 'Operator yang dipilih tidak valid.',
            'note.max' => 'Catatan maksimal 255 karakter.',
        ];
    }
}
