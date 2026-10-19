<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Karena kolom role di tabel users bertipe string(20), penambahan nilai 'operator_tim'
        // tidak memerlukan perubahan tipe enum MySQL, cukup menerima string baru.
        // Migration ini opsional/komentar terdokumentasi atau komentar migrasi untuk audit.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
