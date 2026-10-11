<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Version naik setiap kali isi tiket berubah (balasan / status). Dipakai
     * frontend untuk mendeteksi layar yang sudah usang (stale).
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('version');
        });
    }
};
