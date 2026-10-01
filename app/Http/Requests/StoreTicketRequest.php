<?php

namespace App\Http\Requests;

use App\Models\Channel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('channel_id') || empty($this->channel_id)) {
            $websiteChannelId = Channel::where('slug', 'website')->value('id');
            if ($websiteChannelId) {
                $this->merge([
                    'channel_id' => $websiteChannelId,
                ]);
            }
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $websiteChannelId = Channel::where('slug', 'website')->value('id');
        $isWebsite = (int) $this->channel_id === (int) $websiteChannelId;

        return [
            'classification' => ['required', 'in:pengaduan,aspirasi,permintaan_informasi'],
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'channel_id' => ['required', 'integer', 'exists:channels,id'],
            'reporter_name' => ['nullable', 'string', 'max:255'],
            'reporter_email' => ['nullable', 'email', 'max:255'],
            'reporter_wa' => ['nullable', 'string', 'regex:/^[0-9]+$/', 'max:30'],
            'content' => ['required', 'string', 'min:10'],
            'service_type' => ['nullable', 'in:pst,lainnya', $isWebsite ? 'nullable' : 'required_if:classification,pengaduan'],
            'tanggal_kejadian' => ['nullable', 'date'],
            'satuan_tugas' => ['nullable', 'string', 'max:255', $isWebsite ? 'nullable' : 'required_if:classification,aspirasi'],
            'response_message' => ['nullable', 'string'],
            'response_type' => ['nullable', 'in:respon_awal,respon_substantif'],
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
            'title.required' => 'Judul laporan wajib diisi.',
            'title.min' => 'Judul laporan minimal 3 karakter.',
            'title.max' => 'Judul laporan maksimal 255 karakter.',
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
