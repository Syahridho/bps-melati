<?php

namespace App\Http\Requests\Settings;

use App\Models\CensoredWord;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCensoredWordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('word'))) {
            $this->merge([
                'word' => mb_strtolower(trim((string) $this->input('word'))),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $censoredWord = $this->route('censoredWord');
        $wordId = $censoredWord instanceof CensoredWord ? $censoredWord->id : (int) $censoredWord;

        return [
            'word' => [
                'required',
                'string',
                'max:50',
                'regex:/^[^\s]+$/',
                Rule::unique('censored_words', 'word')->ignore($wordId),
                function ($attribute, $value, $fail) {
                    if (preg_match('/\s/', $value)) {
                        $fail('Kata hanya boleh satu kata, tanpa spasi.');
                    }
                },
            ],
            'match_type' => ['required', 'string', 'in:anywhere,whole_word'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'word.required' => 'Kata wajib diisi.',
            'word.string' => 'Kata harus berupa teks.',
            'word.max' => 'Kata maksimal 50 karakter.',
            'word.regex' => 'Kata hanya boleh satu kata, tanpa spasi.',
            'word.unique' => 'Kata sudah terdaftar.',
            'match_type.required' => 'Mode pencocokan wajib dipilih.',
            'match_type.in' => 'Mode pencocokan tidak valid.',
            'is_active.boolean' => 'Status aktif harus berupa boolean.',
        ];
    }
}
