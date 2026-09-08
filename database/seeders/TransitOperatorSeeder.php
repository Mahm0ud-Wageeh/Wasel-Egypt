<?php

namespace Database\Seeders;

use App\Models\TransitOperator;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TransitOperatorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $operators = [
            [
                'name' => 'Cairo Transport Authority',
                'short_code' => 'CTA',
                'website' => 'https://cta.gov.eg',
                'phone' => '+20212345678',
            ],
            [
                'name' => 'Alexandria Tram and Rail Authority',
                'short_code' => 'ATRA',
                'website' => 'https://atra.gov.eg',
                'phone' => '+20398765432',
            ],
            [
                'name' => 'Giza Bus Company',
                'short_code' => 'GBC',
                'website' => 'https://gbc.gov.eg',
                'phone' => '+2025551234',
            ],
            [
                'name' => 'Private MiniBus Operators Association',
                'short_code' => 'PMOA',
                'website' => 'https://pmoa.org.eg',
                'phone' => '+2027778888',
            ],
            [
                'name' => 'Egyptian National Railways',
                'short_code' => 'ENR',
                'website' => 'https://enr.gov.eg',
                'phone' => '+2029990000',
            ],
        ];

        foreach ($operators as $operator) {
            TransitOperator::updateOrCreate(
                ['short_code' => $operator['short_code']],
                $operator
            );
        }
    }
}