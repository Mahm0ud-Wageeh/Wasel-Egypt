<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TransitMode;

class TransitModeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TransitMode::updateOrCreate(
            ['name' => 'metro'],
            [
                'description' => 'Metro rail system',
                'icon' => 'subway',
            ]
        );

        TransitMode::updateOrCreate(
            ['name' => 'bus'],
            [
                'description' => 'Public bus transportation',
                'icon' => 'bus',
            ]
        );

        TransitMode::updateOrCreate(
            ['name' => 'minibus'],
            [
                'description' => 'Minibus service',
                'icon' => 'minibus',
            ]
        );

        TransitMode::updateOrCreate(
            ['name' => 'microbus'],
            [
                'description' => 'Microbus service',
                'icon' => 'microbus',
            ]
        );

        TransitMode::updateOrCreate(
            ['name' => 'rail'],
            [
                'description' => 'Railway service',
                'icon' => 'train',
            ]
        );

        TransitMode::updateOrCreate(
            ['name' => 'walking'],
            [
                'description' => 'Walking/pedestrian route',
                'icon' => 'walk',
            ]
        );
    }
}