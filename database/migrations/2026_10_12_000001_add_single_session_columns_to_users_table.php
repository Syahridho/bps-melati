<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sumber kebenaran untuk kebijakan "satu sesi aktif per akun".
     *
     * Sengaja TIDAK bergantung pada tabel `sessions` karena session driver di
     * project ini memakai Redis — tabel itu tidak pernah terisi.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('current_session_id', 100)->nullable()->after('is_active')->index();
            $table->timestamp('last_activity_at')->nullable()->after('current_session_id');
            $table->timestamp('last_login_at')->nullable()->after('last_activity_at');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('last_login_agent', 255)->nullable()->after('last_login_ip');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['current_session_id']);
            $table->dropColumn(['current_session_id', 'last_activity_at', 'last_login_at', 'last_login_ip', 'last_login_agent']);
        });
    }
};
