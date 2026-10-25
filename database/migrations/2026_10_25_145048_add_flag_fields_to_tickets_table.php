<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'is_flagged')) {
                $table->boolean('is_flagged')->default(false)->after('pengawasan_by');
            }
            if (! Schema::hasColumn('tickets', 'flagged_at')) {
                $table->timestamp('flagged_at')->nullable()->after('is_flagged');
            }
            if (! Schema::hasColumn('tickets', 'flagged_by')) {
                $table->foreignId('flagged_by')->nullable()->after('flagged_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('tickets', 'flag_note')) {
                $table->string('flag_note', 255)->nullable()->after('flagged_by');
            }

            $table->index(['status', 'is_flagged']);
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['status', 'is_flagged']);

            if (Schema::hasColumn('tickets', 'flagged_by')) {
                $table->dropForeign(['flagged_by']);
                $table->dropColumn('flagged_by');
            }
            if (Schema::hasColumn('tickets', 'flag_note')) {
                $table->dropColumn('flag_note');
            }
            if (Schema::hasColumn('tickets', 'flagged_at')) {
                $table->dropColumn('flagged_at');
            }
            if (Schema::hasColumn('tickets', 'is_flagged')) {
                $table->dropColumn('is_flagged');
            }
        });
    }
};
