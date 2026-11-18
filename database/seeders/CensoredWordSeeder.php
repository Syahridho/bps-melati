<?php

namespace Database\Seeders;

use App\Models\CensoredWord;
use Illuminate\Database\Seeder;

class CensoredWordSeeder extends Seeder
{
    public function run(): void
    {
        $words = config('profanity.words', []);

        foreach ($words as $word) {
            CensoredWord::updateOrCreate(
                ['word' => mb_strtolower(trim($word))],
                [
                    'match_type' => mb_strlen($word) >= 5 ? 'anywhere' : 'whole_word',
                    'is_active' => true,
                ]
            );
        }
    }
}
