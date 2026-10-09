<?php

namespace App\Http\Requests;

use App\Models\Channel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        if (! $this->has('channel_id') || empty($this->channel_id)) {
            $websiteChannelId = Channel::where('slug', 'website')->value('id');
            if ($websiteChannelId) {
                $updates['channel_id'] = $websiteChannelId;
            }
        }

        foreach (['title', 'content', 'reporter_name', 'satuan_tugas', 'response_message'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $cleaned = strip_tags($this->input($field));
                $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $cleaned);
                $updates[$field] = trim($cleaned);
            }
        }

        if ($this->has('reporter_email') && is_string($this->input('reporter_email'))) {
            $updates['reporter_email'] = strtolower(trim($this->input('reporter_email')));
        }

        if ($this->has('reporter_wa') && is_string($this->input('reporter_wa'))) {
            $cleanedWa = preg_replace('/[^0-9+]/', '', $this->input('reporter_wa'));
            $updates['reporter_wa'] = $cleanedWa !== '' ? $cleanedWa : null;
        }

        if (! empty($updates)) {
            $this->merge($updates);
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
            'classification' => ['required', 'string', 'in:pengaduan,aspirasi,permintaan_informasi'],
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'channel_id' => [
                'required',
                'integer',
                Rule::exists('channels', 'id')->where(function ($query) {
                    $query->where('is_active', true);
                }),
                function ($attribute, $value, $fail) {
                    $channel = Channel::find($value);
                    if ($channel && $channel->children()->where('is_active', true)->exists()) {
                        $fail('Silakan pilih sub-kanal yang lebih spesifik.');
                    }
                },
            ],
            'reporter_name' => ['nullable', 'string', 'max:100'],
            'reporter_email' => ['nullable', 'email:rfc', 'max:150'],
            'reporter_wa' => ['nullable', 'string', 'regex:/^(\+62|62|0)8[0-9]{8,12}$/'],
            'content' => ['required', 'string', 'min:10', 'max:5000'],
            'service_type' => ['nullable', 'in:pst,lainnya', $isWebsite ? 'nullable' : 'required_if:classification,pengaduan'],
            'tanggal_kejadian' => ['nullable', 'date', 'before_or_equal:today'],
            'satuan_tugas' => ['nullable', 'string', 'max:255', $isWebsite ? 'nullable' : 'required_if:classification,aspirasi'],
            'source_app' => ['nullable', 'string', 'max:20'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'max:2048',
            ],
            'response_message' => ['nullable', 'string', 'max:5000'],
            'response_type' => ['nullable', 'string', 'in:respon_awal,respon_substantif'],
            'mark_as_completed' => ['nullable', 'boolean'],
            'response_attachments' => ['nullable', 'array', 'max:3'],
            'response_attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'max:2048',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'classification.required' => 'Jenis klasifikasi laporan wajib dipilih.',
            'classification.in' => 'Klasifikasi laporan tidak valid.',
            'title.required' => 'Judul laporan wajib diisi.',
            'title.min' => 'Judul laporan minimal 3 karakter.',
            'title.max' => 'Judul laporan maksimal 255 karakter.',
            'channel_id.required' => 'Kanal laporan wajib dipilih.',
            'channel_id.exists' => 'Kanal laporan tidak ditemukan atau tidak aktif.',
            'reporter_name.max' => 'Nama pelapor maksimal 100 karakter.',
            'reporter_email.email' => 'Format email tidak valid.',
            'reporter_email.max' => 'Email maksimal 150 karakter.',
            'reporter_wa.regex' => 'Format nomor WhatsApp tidak valid (contoh: 081234567890).',
            'content.required' => 'Isi uraian laporan wajib diisi.',
            'content.min' => 'Isi uraian laporan minimal 10 karakter.',
            'content.max' => 'Isi uraian laporan maksimal 5000 karakter.',
            'service_type.required_if' => 'Jenis layanan wajib dipilih untuk pengaduan.',
            'service_type.in' => 'Jenis layanan tidak valid.',
            'tanggal_kejadian.date' => 'Tanggal kejadian tidak valid.',
            'tanggal_kejadian.before_or_equal' => 'Tanggal kejadian tidak boleh di masa mendatang.',
            'satuan_tugas.required_if' => 'Satuan tugas wajib diisi untuk aspirasi.',
            'attachments.max' => 'Maksimal 3 file lampiran.',
            'attachments.*.file' => 'Lampiran harus berupa file.',
            'attachments.*.mimes' => 'Format file lampiran harus JPG, JPEG, PNG, atau PDF.',
            'attachments.*.mimetypes' => 'Tipe MIME file lampiran tidak valid.',
            'attachments.*.max' => 'Ukuran file lampiran maksimal 2MB.',
        ];
    }
}
