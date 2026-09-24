<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tindak lanjut: respon awal / respon substantif
        Schema::create('ticket_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 30);         // respon_awal | respon_substantif
            $table->longText('message');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_responses');
    }
};
