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
            'channel_id' => ['required', 'integer', 'exists:channels,id'],
            'reporter_name' => ['nullable', 'string', 'max:255'],
            'reporter_email' => ['nullable', 'email', 'max:255'],
            'reporter_wa' => ['nullable', 'string', 'regex:/^[0-9]+$/', 'max:30'],
            'content' => ['required', 'string', 'min:10'],
            'service_type' => ['nullable', 'in:pst,lainnya', 'required_if:classification,pengaduan'],
            'tanggal_kejadian' => ['nullable', 'date', 'required_if:classification,pengaduan'],
            'satuan_tugas' => ['nullable', 'string', 'max:255', 'required_if:classification,aspirasi'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
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
            'channel_id.required' => 'Sumber kanal wajib dipilih.',
            'channel_id.exists' => 'Sumber kanal tidak valid.',
            'content.required' => 'Isi laporan wajib diisi.',
            'content.min' => 'Isi laporan minimal 10 karakter.',
            'tanggal_kejadian.required_if' => 'Tanggal kejadian wajib diisi untuk pengaduan.',
            'service_type.required_if' => 'Jenis layanan wajib dipilih untuk pengaduan.',
            'satuan_tugas.required_if' => 'Satuan tugas wajib dipilih untuk aspirasi.',
            'reporter_wa.regex' => 'Nomor WhatsApp hanya boleh berisi angka.',
            'service_type.in' => 'Jenis layanan tidak valid.',
            'attachments.max' => 'Maksimal 3 file lampiran.',
            'attachments.*.mimes' => 'Format file harus JPG, PNG, atau PDF.',
            'attachments.*.max' => 'Ukuran file maksimal 2MB.',
        ];
    }
}
