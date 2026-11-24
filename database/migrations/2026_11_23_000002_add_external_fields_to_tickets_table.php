<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tickets', 'external_id')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->string('external_id')->nullable()->after('channel_id');
                $table->string('external_parent_id')->nullable()->after('external_id');
                $table->string('external_permalink')->nullable()->after('external_parent_id');
                $table->timestamp('external_occurred_at')->nullable()->after('external_permalink');
                $table->string('external_author_handle')->nullable()->after('external_occurred_at');
            });
        } else {
            // Pastikan kolom yang mungkin kurang tetap ada (idempotent).
            Schema::table('tickets', function (Blueprint $table) {
                if (! Schema::hasColumn('tickets', 'external_parent_id')) {
                    $table->string('external_parent_id')->nullable()->after('external_id');
                }
                if (! Schema::hasColumn('tickets', 'external_permalink')) {
                    $table->string('external_permalink')->nullable()->after('external_parent_id');
                }
                if (! Schema::hasColumn('tickets', 'external_occurred_at')) {
                    $table->timestamp('external_occurred_at')->nullable()->after('external_permalink');
                }
                if (! Schema::hasColumn('tickets', 'external_author_handle')) {
                    $table->string('external_author_handle')->nullable()->after('external_occurred_at');
                }
            });
        }

        $indexNames = collect(Schema::getIndexes('tickets'))->pluck('name')->all();

        if (! in_array('tickets_channel_external_unique', $indexNames, true)) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->unique(['channel_id', 'external_id'], 'tickets_channel_external_unique');
            });
        }

        if (! in_array('tickets_external_parent_id_index', $indexNames, true)
            && ! collect(Schema::getIndexes('tickets'))->contains(fn ($idx) => ($idx['columns'] ?? []) === ['external_parent_id'])) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->index('external_parent_id');
            });
        }
    }

    public function down(): void
    {
        $indexNames = collect(Schema::getIndexes('tickets'))->pluck('name')->all();

        if (in_array('tickets_channel_external_unique', $indexNames, true)) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropUnique('tickets_channel_external_unique');
            });
        }

        if (collect(Schema::getIndexes('tickets'))->contains(fn ($idx) => ($idx['columns'] ?? []) === ['external_parent_id'])) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropIndex(['external_parent_id']);
            });
        }

        // Kolom tidak di-drop agar tidak merusak data existing.
    }
};