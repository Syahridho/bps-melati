<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketResponseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->isAdmin() || $user->isOperator());
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('response_message') && is_string($this->input('response_message'))) {
            $cleaned = strip_tags($this->input('response_message'));
            $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $cleaned) ?? '';

            $this->merge([
                'response_message' => trim($cleaned),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'response_type' => ['required', 'in:respon_awal,respon_substantif'],
            'response_message' => ['required', 'string', 'min:10', 'max:5000'],
            'berkadar_pengawasan' => ['nullable', 'boolean'],
            'response_attachments' => ['nullable', 'array', 'max:3'],
            'response_attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'max:2048',
            ],
            // Anti double submit / retry jaringan: UUID v4 dibuat frontend saat form dibuka.
            'idempotency_key' => ['nullable', 'uuid'],
            // Versi tiket yang dilihat pengguna; dipakai untuk deteksi layar usang.
            'expected_version' => ['nullable', 'integer', 'min:0'],
        ];
    }

    // Catatan: pengecekan status 'selesai' TIDAK dilakukan di sini. Sumber
    // kebenaran ada di App\Actions\ReplyToTicket (di dalam row lock), supaya
    // balasan tidak bisa lolos hanya karena membaca data basi sebelum lock.

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'response_type.required' => 'Jenis tanggapan wajib dipilih.',
            'response_type.in' => 'Jenis tanggapan tidak valid.',
            'response_message.required' => 'Pesan tanggapan wajib diisi.',
            'response_message.min' => 'Pesan tanggapan minimal 10 karakter.',
            'response_message.max' => 'Pesan tanggapan maksimal 5000 karakter.',
            'response_attachments.max' => 'Lampiran maksimal 3 file.',
            'response_attachments.*.mimes' => 'Lampiran harus berformat JPG, PNG, atau PDF.',
            'response_attachments.*.max' => 'Setiap lampiran maksimal 2MB.',
            'idempotency_key.uuid' => 'Kunci idempotensi tidak valid.',
            'expected_version.integer' => 'Versi tiket tidak valid.',
        ];
    }
}
