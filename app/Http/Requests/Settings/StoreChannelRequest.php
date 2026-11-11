<?php

namespace App\Http\Requests\Settings;

use App\Models\Channel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreChannelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $name = is_string($this->input('name')) ? trim($this->input('name')) : $this->input('name');
        $updates = ['name' => $name];

        if (is_string($this->input('color')) && $this->input('color') !== '') {
            $updates['color'] = strtolower(trim($this->input('color')));
        }

        $parentId = $this->input('parent_id');
        if (empty($parentId)) {
            $updates['parent_id'] = null;
            $slug = Str::slug((string) $name);
        } else {
            $parent = Channel::find($parentId);
            $slug = $parent ? Str::slug($parent->slug.' '.(string) $name) : Str::slug((string) $name);
        }

        // Slug unik: tambahkan -2, -3, ... bila sudah dipakai (hindari 422 slug).
        $base = $slug;
        $candidate = $base;
        $i = 2;
        while (Channel::where('slug', $candidate)->exists()) {
            $candidate = $base.'-'.$i;
            $i++;
        }
        $updates['slug'] = $candidate;

        $this->merge($updates);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $parentId = $this->input('parent_id');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('channels', 'name')],
            'slug' => ['required', 'string', 'max:255', Rule::unique('channels', 'slug')],
            'parent_id' => [
                'nullable', 'integer', 'exists:channels,id',
                function ($attribute, $value, $fail) {
                    if (empty($value)) {
                        return;
                    }
                    $parent = Channel::find($value);
                    if (! $parent) {
                        return;
                    }
                    if ($parent->parent_id !== null) {
                        $fail('Induk harus berupa kanal utama (tanpa induk), bukan sub-kanal.');
                    }
                    if (! $parent->is_active) {
                        $fail('Induk yang dipilih tidak aktif.');
                    }
                },
            ],
            'color' => [
                empty($parentId) ? 'required' : 'nullable',
                'string',
                'regex:/^#[0-9a-fA-F]{6}$/',
            ],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama kanal wajib diisi.',
            'name.unique' => 'Nama kanal sudah digunakan.',
            'color.required' => 'Warna kanal utama wajib diisi.',
            'color.regex' => 'Format warna harus berupa hex diawali # (mis. #8b5cf6).',
            'parent_id.exists' => 'Kanal induk tidak ditemukan.',
            'sort_order.required' => 'Urutan wajib diisi.',
        ];
    }
}
