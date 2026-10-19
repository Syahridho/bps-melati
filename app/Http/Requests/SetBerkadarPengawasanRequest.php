<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SetBerkadarPengawasanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() || $this->user()?->isOperator();
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
        ];
    }
}
