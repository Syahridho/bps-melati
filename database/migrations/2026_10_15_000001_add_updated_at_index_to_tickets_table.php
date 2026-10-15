<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public const INDEX_NAME = 'tickets_status_updated_at_index';

    public function up(): void
    {
        if (! Schema::hasIndex('tickets', self::INDEX_NAME)) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->index(['status', 'updated_at'], self::INDEX_NAME);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('tickets', self::INDEX_NAME)) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->dropIndex(self::INDEX_NAME);
            });
        }
    }
};
