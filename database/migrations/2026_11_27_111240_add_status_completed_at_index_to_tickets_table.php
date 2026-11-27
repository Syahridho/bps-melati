<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasIndex('tickets', 'tickets_status_completed_at_index')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->index(['status', 'completed_at'], 'tickets_status_completed_at_index');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('tickets', 'tickets_status_completed_at_index')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->dropIndex('tickets_status_completed_at_index');
            });
        }
    }
};
