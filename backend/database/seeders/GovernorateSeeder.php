<?php

namespace Database\Seeders;

use App\Models\Governorate;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GovernorateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $governorates = [
            'Cairo',
            'Alexandria',
            'Giza',
            'Qalyubia',
            'Monufia',
            'Kafr el-Sheikh',
            'Dakahlia',
            'Gharbia',
            'Beheira',
            'Ismailia',
            'Port Said',
            'Suez',
            'Damietta',
            'Luxor',
            'Aswan',
            'Red Sea',
            'New Valley',
            'Matrouh',
            'North Sinai',
            'South Sinai',
            'Faiyum',
            'Beni Suef',
            'Minya',
            'Assiut',
            'Sohag',
            'Qena',
            'Asyut',
            'Sharqia',
        ];

        foreach ($governorates as $governorateName) {
            Governorate::updateOrCreate(
                ['name' => $governorateName],
                [
                    'code' => strtoupper(substr($governorateName, 0, 3)), // Simple code, first 3 letters uppercase
                ]
            );
        }
    }
}