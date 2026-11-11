<?php

namespace Database\Seeders;

use App\Models\Channel;
use Illuminate\Database\Seeder;

class ChannelSeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            'SP4N-LAPOR!' => ['color' => '#8b5cf6', 'children' => []],
            'Sosial Media' => ['color' => '#ec4899', 'children' => ['Instagram', 'Facebook', 'YouTube', 'WhatsApp']],
            'Kunjungan Langsung' => ['color' => '#84cc16', 'children' => ['Pelayanan Pengaduan', 'Kotak Saran/Pengaduan']],
            'WBS' => ['color' => '#f97316', 'children' => []],
            'Email' => ['color' => '#14b8a6', 'children' => []],
            'Website' => ['color' => '#0ea5e9', 'children' => []],
            'Android' => ['color' => '#06b6d4', 'children' => []],
        ];

        $order = 0;
        foreach ($tree as $parentName => $config) {
            $parent = Channel::updateOrCreate(
                ['slug' => str($parentName)->slug()->toString()],
                ['name' => $parentName, 'parent_id' => null, 'sort_order' => ++$order, 'color' => $config['color'], 'is_active' => true],
            );

            foreach ($config['children'] as $i => $childName) {
                Channel::updateOrCreate(
                    ['slug' => str($parentName.' '.$childName)->slug()->toString()],
                    ['name' => $childName, 'parent_id' => $parent->id, 'sort_order' => $i + 1, 'color' => null, 'is_active' => true],
                );
            }
        }
    }
}
