<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_attachments', function (Blueprint $table) {
            $table->string('share_token', 64)->nullable()->unique()->after('path');
        });

        Schema::table('response_attachments', function (Blueprint $table) {
            $table->string('share_token', 64)->nullable()->unique()->after('path');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_attachments', function (Blueprint $table) {
            $table->dropColumn('share_token');
        });

        Schema::table('response_attachments', function (Blueprint $table) {
            $table->dropColumn('share_token');
        });
    }
};
