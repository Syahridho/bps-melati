<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'nama_penanda_tangan', 'value' => null],
            ['key' => 'jabatan_penanda_tangan', 'value' => 'KETUA TIM PENGADUAN'],
            ['key' => 'kota_penanda_tangan', 'value' => 'Pekanbaru'],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->insertOrIgnore([
                'key' => $setting['key'],
                'value' => $setting['value'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
