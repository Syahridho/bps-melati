<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('android_releases', function (Blueprint $table) {
            $table->id();
            $table->string('version', 20);
            $table->text('release_notes')->nullable();
            $table->string('original_name');
            $table->string('stored_path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('checksum_sha256', 64);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(false)->index();
            $table->unsignedBigInteger('download_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('android_releases');
    }
};