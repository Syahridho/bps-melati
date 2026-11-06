<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->index(['source_app', 'created_at'], 'tickets_source_app_created_at_idx');
            $table->index(['source_app', 'is_flagged', 'created_at'], 'tickets_source_app_flagged_idx');
            $table->index(['created_by', 'source_app', 'created_at'], 'tickets_created_by_source_app_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('tickets_source_app_created_at_idx');
            $table->dropIndex('tickets_source_app_flagged_idx');
            $table->dropIndex('tickets_created_by_source_app_idx');
        });
    }
};
