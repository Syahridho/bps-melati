<?php

namespace App\Http\Requests\Settings;

use App\Models\Channel;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChannelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('color')) && $this->input('color') !== '') {
            $this->merge(['color' => strtolower(trim($this->input('color')))]);
        }
        if (empty($this->input('parent_id'))) {
            $this->merge(['parent_id' => null]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $channel = $this->route('channel');
        $channelId = $channel instanceof Channel ? $channel->id : (int) $channel;
        $parentId = $this->input('parent_id');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('channels', 'name')->ignore($channelId)],
            'parent_id' => [
                'nullable', 'integer', 'exists:channels,id',
                function ($attribute, $value, $fail) use ($channelId) {
                    if (empty($value)) {
                        return;
                    }
                    if ((int) $value === (int) $channelId) {
                        $fail('Kanal tidak boleh menjadi induk bagi dirinya sendiri.');

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
