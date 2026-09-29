<?php

namespace Database\Seeders;

use App\Models\SystemConfig;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SystemConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminId = User::where('email', 'admin@example.com')->value('id') ?: 1;

        $configs = [
            [
                'config_key' => 'journey_scoring_weights',
                'config_value' => json_encode([
                    'time_efficiency' => 0.3,
                    'comfort' => 0.25,
                    'reliability' => 0.2,
                    'walking_distance' => 0.15,
                    'transfers' => 0.1,
                ]),
                'config_type' => 'json',
                'description' => 'Weights used in journey scoring algorithm',
                'updated_by' => $adminId,
            ],
            [
                'config_key' => 'deviation_thresholds',
                'config_value' => json_encode([
                    'early' => 300, // 5 minutes in seconds
                    'late' => 300,  // 5 minutes in seconds
                    'off_route_distance' => 100, // 100 meters
                    'vehicle_change' => true,
                ]),
                'config_type' => 'json',
                'description' => 'Thresholds for detecting deviations',
                'updated_by' => $adminId,
            ],
            [
                'config_key' => 'max_reports_per_day',
                'config_value' => '10',
                'config_type' => 'integer',
                'description' => 'Maximum number of community reports a user can submit per day',
                'updated_by' => $adminId,
            ],
            [
                'config_key' => 'journey_progress_interval',
                'config_value' => '30',
                'config_type' => 'integer',
                'description' => 'Interval in seconds for updating journey progress',
                'updated_by' => $adminId,
            ],
            [
                'config_key' => 'quiet_hours',
                'config_value' => json_encode([
                    'start' => '22:00',
                    'end' => '06:00',
                    'enabled' => true,
                ]),
                'config_type' => 'json',
                'description' => 'Default quiet hours for notifications',
                'updated_by' => $adminId,
            ],
        ];

        foreach ($configs as $config) {
            SystemConfig::updateOrCreate(
                ['config_key' => $config['config_key']],
                $config
            );
        }
    }
}