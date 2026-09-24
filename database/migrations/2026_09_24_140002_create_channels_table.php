<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sumber kanal, 2 level: kanal utama (parent_id null) dan sub-kanal.
        Schema::create('channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('channels')->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channels');
    }
};
