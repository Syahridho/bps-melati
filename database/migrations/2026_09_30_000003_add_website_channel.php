<?php

use App\Models\Channel;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Channel::updateOrCreate(
            ['slug' => 'website'],
            [
                'name' => 'Website',
                'parent_id' => null,
                'sort_order' => 6,
                'is_active' => true,
            ]
        );
    }

    public function down(): void
    {
        Channel::where('slug', 'website')->delete();
    }
};
