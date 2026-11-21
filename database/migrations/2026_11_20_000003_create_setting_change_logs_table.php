<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('setting_change_logs', function (Blueprint $table) {
            $table->id();
            $table->string('key')->index();
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['key', 'applied_at', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('setting_change_logs');
    }
};
