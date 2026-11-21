<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_to');
            $table->string('assignment_mode', 20)->default('free')->after('assigned_at')->index();
        });

        // Tiket lama selalu mengikuti perilaku "free" (tanpa PIC).
        DB::table('tickets')->update([
            'assignment_mode' => 'free',
            'assigned_to' => null,
            'assigned_at' => null,
        ]);
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropIndex(['assignment_mode']);
            $table->dropColumn(['assigned_to', 'assigned_at', 'assignment_mode']);
        });
    }
};
