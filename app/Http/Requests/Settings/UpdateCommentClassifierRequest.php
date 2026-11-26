<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCommentClassifierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        $wordList = ['array', 'max:300'];
        $word = ['nullable', 'string', 'max:60'];

        return [
            'min_length' => ['required', 'integer', 'min:1', 'max:10000'],
            'min_words' => ['required', 'integer', 'min:1', 'max:1000'],
            'fallback_when_uncertain' => ['sometimes', 'boolean'],
            'keywords' => ['sometimes', 'array'],
            'keywords.pengaduan' => ['sometimes', 'array', 'max:300'],
            'keywords.pengaduan.*' => $word,
            'keywords.aspirasi' => ['sometimes', 'array', 'max:300'],
            'keywords.aspirasi.*' => $word,
            'keywords.permintaan_informasi' => ['sometimes', 'array', 'max:300'],
            'keywords.permintaan_informasi.*' => $word,
            'pengaduan' => ['sometimes', 'array', 'max:300'],
            'pengaduan.*' => $word,
            'aspirasi' => ['sometimes', 'array', 'max:300'],
            'aspirasi.*' => $word,
            'permintaan_informasi' => ['sometimes', 'array', 'max:300'],
            'permintaan_informasi.*' => $word,
            'ignore' => ['sometimes', 'array', 'max:300'],
            'ignore.*' => $word,
            'abbreviations' => ['sometimes', 'array', 'max:300'],
            'abbreviations.*' => ['string', 'max:60'],
            'priority' => ['sometimes', 'array', 'max:10'],
            'priority.*' => ['string', 'in:pengaduan,aspirasi,permintaan_informasi'],
        ];
    }

    public function messages(): array
    {
        return [
            'min_length.required' => 'Panjang minimum wajib diisi.',
            'min_length.integer' => 'Panjang minimum harus berupa angka.',
            'min_words.required' => 'Jumlah kata minimum wajib diisi.',
            'min_words.integer' => 'Jumlah kata minimum harus berupa angka.',
            '*.max' => 'Maksimal 300 kata per daftar.',
            'keywords.pengaduan.*.max' => 'Setiap kata maksimal 60 karakter.',
        ];
    }
}
