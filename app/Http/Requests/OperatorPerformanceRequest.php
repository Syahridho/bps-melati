<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OperatorPerformanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'string', 'max:20'],
            'to' => ['nullable', 'string', 'max:20'],
            'mode' => ['nullable', 'string', 'max:20'],
            'sort' => ['nullable', 'string', 'max:30'],
            'direction' => ['nullable', 'string', 'max:10'],
            'refresh' => ['nullable', 'boolean'],
        ];
    }

    protected function passedValidation(): void
    {
        // Normalisasi nilai tidak valid ke default.
        if (! in_array($this->input('mode'), ['otomatis', 'selesai', 'gabungan'], true)) {
            $this->merge(['mode' => 'gabungan']);
        }
        if (! in_array($this->input('sort'), ['completed', 'in_progress', 'rating', 'duration', 'name'], true)) {
            $this->merge(['sort' => 'completed']);
        }
        if (! in_array(strtolower((string) $this->input('direction')), ['asc', 'desc'], true)) {
            $this->merge(['direction' => 'desc']);
        }
    }

    public function validatedParams(): array
    {
        return [
            'from' => $this->input('from'),
            'to' => $this->input('to'),
            'mode' => $this->input('mode', 'gabungan'),
            'sort' => $this->input('sort', 'completed'),
            'direction' => $this->input('direction', 'desc'),
            'refresh' => $this->boolean('refresh'),
        ];
    }
}
