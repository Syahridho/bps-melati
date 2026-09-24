<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'classification' => ['required', 'in:pengaduan,aspirasi,permintaan_informasi'],
            'reporter_name' => ['nullable', 'string', 'max:255'],
            'reporter_email' => ['nullable', 'email', 'max:255'],
            'reporter_wa' => ['nullable', 'string', 'max:30'],
            'content' => ['required', 'string', 'min:10'],
            'tanggal_kejadian' => ['nullable', 'date', 'required_if:classification,pengaduan'],
            'satuan_tugas' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'classification.required' => 'Silakan pilih jenis laporan.',
            'classification.in' => 'Jenis laporan tidak valid.',
            'content.required' => 'Isi laporan wajib diisi.',
            'content.min' => 'Isi laporan minimal 10 karakter.',
            'tanggal_kejadian.required_if' => 'Tanggal kejadian wajib diisi untuk pengaduan.',
        ];
    }
}
