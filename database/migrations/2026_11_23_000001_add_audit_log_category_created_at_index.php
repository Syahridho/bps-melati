<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public const INDEX_NAME = 'audit_logs_category_created_at_index';

    public function up(): void
    {
        if (! Schema::hasIndex('audit_logs', self::INDEX_NAME)) {
            Schema::table('audit_logs', function (Blueprint $table): void {
                $table->index(['category', 'created_at'], self::INDEX_NAME);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('audit_logs', self::INDEX_NAME)) {
            Schema::table('audit_logs', function (Blueprint $table): void {
                $table->dropIndex(self::INDEX_NAME);
            });
        }
    }
};
