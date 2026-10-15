<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public const INDEX_NAME = 'tickets_period_channel_id_index';

    public function up(): void
    {
        if (! Schema::hasIndex('tickets', self::INDEX_NAME)) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->index(['period', 'channel_id'], self::INDEX_NAME);
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
