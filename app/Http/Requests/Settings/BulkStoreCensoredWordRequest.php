<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BulkStoreCensoredWordRequest extends FormRequest
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
            'words' => ['required', 'string'],
            'match_type' => ['required', 'string', 'in:anywhere,whole_word'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'words.required' => 'Daftar kata wajib diisi.',
            'words.string' => 'Daftar kata harus berupa teks.',
            'match_type.required' => 'Mode pencocokan wajib dipilih.',
            'match_type.in' => 'Mode pencocokan tidak valid.',
            'is_active.boolean' => 'Status aktif harus berupa boolean.',
        ];
    }

    /**
     * @return list<string>
     */
    public function wordsList(): array
    {
        $raw = (string) $this->input('words');
        $lines = preg_split('/\r\n|\r|\n/', $raw);

        $words = [];
        foreach ($lines as $line) {
            $word = mb_strtolower(trim($line));
            if ($word === '' || preg_match('/\s/', $word)) {
                continue;
            }
            $words[] = $word;
        }

        return array_values(array_unique($words));
    }
}
