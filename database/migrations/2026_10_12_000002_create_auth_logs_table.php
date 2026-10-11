<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit log seluruh aksi autentikasi. Password TIDAK PERNAH disimpan di sini.
     * Email dicoba disimpan dalam bentuk hash agar tetap bisa dicari tanpa
     * mengekspos alamat email mentah.
     */
    public function up(): void
    {
        Schema::create('auth_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event', 40);                  // login_success, login_failed, locked_out, ...
            $table->string('email_hash', 64)->nullable();  // sha256(email lowercase)
            $table->string('email_masked', 120)->nullable(); // a***@contoh.id untuk tampilan
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('context', 20)->nullable();     // web | mobile | unknown
            $table->json('meta')->nullable();          // konteks tambahan tanpa data sensitif
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('event');
            $table->index('email_hash');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_logs');
    }
};
