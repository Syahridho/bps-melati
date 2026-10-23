<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'is_pengawasan')) {
                $table->boolean('is_pengawasan')->default(false)->after('closed_reason');
            }
            if (! Schema::hasColumn('tickets', 'pengawasan_at')) {
                $table->timestamp('pengawasan_at')->nullable()->after('is_pengawasan');
            }
            if (! Schema::hasColumn('tickets', 'pengawasan_by')) {
                $table->foreignId('pengawasan_by')->nullable()->after('pengawasan_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'pengawasan_by')) {
                $table->dropForeign(['pengawasan_by']);
                $table->dropColumn('pengawasan_by');
            }
            if (Schema::hasColumn('tickets', 'pengawasan_at')) {
                $table->dropColumn('pengawasan_at');
            }
            if (Schema::hasColumn('tickets', 'is_pengawasan')) {
                $table->dropColumn('is_pengawasan');
            }
        });
    }
};
