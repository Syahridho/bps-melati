<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            ['key' => 'auto_close_pengaduan_days', 'value' => '3'],
            ['key' => 'auto_close_aspirasi_days', 'value' => '1'],
            ['key' => 'auto_close_permintaan_informasi_days', 'value' => '5'],
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

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'auto_close_pengaduan_days',
            'auto_close_aspirasi_days',
            'auto_close_permintaan_informasi_days',
        ])->delete();
    }
};
