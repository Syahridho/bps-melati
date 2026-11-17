<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tickets')
            ->whereNull('access_code')
            ->orWhere('access_code', '')
            ->chunkById(100, function ($tickets) {
                foreach ($tickets as $ticket) {
                    DB::table('tickets')
                        ->where('id', $ticket->id)
                        ->update(['access_code' => Str::random(32)]);
                }
            });
    }

    public function down(): void
    {
        // Tidak perlu revert karena access_code diperlukan untuk keamanan
    }
};
