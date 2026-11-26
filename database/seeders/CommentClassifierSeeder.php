<?php

namespace Database\Seeders;

use App\Services\Social\RuleRepository;
use Illuminate\Database\Seeder;

class CommentClassifierSeeder extends Seeder
{
    public function run(): void
    {
        app(RuleRepository::class)->resetToDefault();
    }
}
