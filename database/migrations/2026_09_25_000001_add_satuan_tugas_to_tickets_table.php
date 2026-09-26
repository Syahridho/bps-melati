<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tickets', 'satuan_tugas')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->string('satuan_tugas')->nullable()->after('service_type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tickets', 'satuan_tugas')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('satuan_tugas');
            });
        }
    }
};
