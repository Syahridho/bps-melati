<?php

namespace Database\Seeders;

use App\Models\Channel;
use Illuminate\Database\Seeder;

class ChannelSeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            'SP4N-LAPOR!' => [],
            'Sosial Media' => ['Instagram', 'Facebook', 'YouTube', 'WhatsApp'],
            'Kunjungan Langsung' => ['Pelayanan Pengaduan', 'Kotak Saran/Pengaduan'],
            'WBS' => [],
            'Email' => [],
            'Website' => [],
        ];

        $order = 0;
        foreach ($tree as $parentName => $children) {
            $parent = Channel::updateOrCreate(
                ['slug' => str($parentName)->slug()->toString()],
                ['name' => $parentName, 'parent_id' => null, 'sort_order' => ++$order],
            );

            foreach ($children as $i => $childName) {
                Channel::updateOrCreate(
                    ['slug' => str($parentName.' '.$childName)->slug()->toString()],
                    ['name' => $childName, 'parent_id' => $parent->id, 'sort_order' => $i + 1],
                );
            }
        }
    }
}
