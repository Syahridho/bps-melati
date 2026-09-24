<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('settings')->insertOrIgnore([
            'key' => 'nama_penanda_tangan',
            'value' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
