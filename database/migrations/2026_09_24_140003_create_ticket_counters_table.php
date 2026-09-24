<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Satu counter bersama untuk semua klasifikasi, direset per periode (mis. "2026-09").
        Schema::create('ticket_counters', function (Blueprint $table) {
            $table->id();
            $table->string('period', 7)->unique();
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_counters');
    }
};
