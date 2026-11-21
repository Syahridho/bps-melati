<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Laporan Saya memfilter assigned_to + status aktif lalu urut created_at.
            $table->index(['assigned_to', 'status', 'created_at'], 'tickets_assigned_to_status_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('tickets_assigned_to_status_created_at_index');
        });
    }
};
