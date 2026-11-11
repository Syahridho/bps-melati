<?php

namespace Database\Factories;

use App\Models\Channel;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Channel>
 */
class ChannelFactory extends Factory
{
    public function definition(): array
    {
        $name = 'Kanal '.$this->faker->unique()->word();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.$this->faker->unique()->randomNumber(5),
            'color' => '#'.$this->faker->hexColor(),
            'sort_order' => 99,
            'is_active' => true,
        ];
    }

    public function child(Channel $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => $parent->id,
            'color' => null,
            'slug' => Str::slug($parent->slug.' '.$attributes['name']),
        ]);
    }
}
