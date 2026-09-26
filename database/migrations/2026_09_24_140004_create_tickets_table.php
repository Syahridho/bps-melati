<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();

            // Penomoran: L-0001/09/2026, A-0002/09/2026, I-0003/09/2026
            $table->string('ticket_number')->unique();
            $table->string('period', 7);                    // "2026-09"
            $table->unsignedInteger('sequence');            // nomor urut bersama antar klasifikasi

            $table->string('classification', 30);           // lapor | aspirasi | permintaan_informasi
            $table->string('service_type', 20)->nullable(); // pst | lainnya (khusus lapor)
            $table->string('satuan_tugas')->nullable();     // khusus aspirasi
            $table->foreignId('channel_id')->constrained('channels');

            // Data pelapor (semua opsional)
            $table->string('reporter_name')->nullable();
            $table->string('reporter_email')->nullable();
            $table->string('reporter_wa', 30)->nullable();

            $table->longText('content');

            // Kode akses acak untuk cek status oleh pelapor (diisi saat tiket dibuat)
            $table->string('access_code', 12)->nullable();

            $table->string('status', 20)->default('baru');  // baru | respon_awal | respon_substantif | selesai
            $table->boolean('is_read')->default(false);     // penanda "laporan masuk" ala inbox
            $table->string('source_app', 20)->default('web'); // web | android | admin
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Nomor urut tidak boleh kembar dalam satu periode, apa pun klasifikasinya.
            $table->unique(['period', 'sequence']);
            $table->index(['classification', 'status']);
            $table->index(['status', 'is_read']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
