<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->boolean('berkadar_pengawasan')->default(false)->after('closed_reason');
            $table->foreignId('berkadar_pengawasan_by')->nullable()->after('berkadar_pengawasan')->constrained('users')->nullOnDelete();
            $table->timestamp('berkadar_pengawasan_at')->nullable()->after('berkadar_pengawasan_by');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['berkadar_pengawasan_by']);
            $table->dropColumn(['berkadar_pengawasan', 'berkadar_pengawasan_by', 'berkadar_pengawasan_at']);
        });
    }
};
