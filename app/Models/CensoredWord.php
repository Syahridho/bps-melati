<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CensoredWord extends Model
{
    protected $fillable = ['word', 'match_type', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Simpan kata dalam huruf kecil dan tanpa spasi di ujung.
     */
    protected function setWordAttribute(string $value): void
    {
        $this->attributes['word'] = mb_strtolower(trim($value));
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    public function scopeOfMatchType($query, string $matchType)
    {
        return $query->where('match_type', $matchType);
    }

    /**
     * Kembalikan daftar kata aktif dalam huruf kecil, diurutkan panjangnya
     * menurun agar kata panjang dicocokkan dulu.
     *
     * @return list<string>
     */
    public static function activeWords(): array
    {
        return self::active()
            ->orderByRaw('CHAR_LENGTH(word) DESC')
            ->pluck('word')
            ->all();
    }

    /**
     * Kembalikan daftar kata aktif beserta tipe pencocokannya.
     *
     * @return list<array{word: string, match_type: string}>
     */
    public static function activeWithType(): array
    {
        return self::active()
            ->orderByRaw('CHAR_LENGTH(word) DESC')
            ->get(['word', 'match_type'])
            ->map(fn (self $word): array => [
                'word' => $word->word,
                'match_type' => $word->match_type,
            ])
            ->all();
    }
}
