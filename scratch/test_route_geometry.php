<?php
/**
 * Test the backend journey planner to verify geometry is returned properly.
 * Run: php scratch/test_route_geometry.php
 */
require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Journey\JourneyPlannerService;

echo "=== WASEL EGYPT — Route Geometry Test ===\n\n";

$testJourneys = [
    ['name' => 'Ramses → Cairo University', 'o_lat' => 30.0617, 'o_lng' => 31.2497, 'd_lat' => 30.0264, 'd_lng' => 31.2017],
    ['name' => 'Giza → Ramses', 'o_lat' => 30.0131, 'o_lng' => 31.2089, 'd_lat' => 30.0617, 'd_lng' => 31.2497],
    ['name' => '6th of October → Abbasia', 'o_lat' => 29.9737, 'o_lng' => 30.9529, 'd_lat' => 30.0673, 'd_lng' => 31.2842],
    ['name' => 'Fayoum → Cairo (Ramses)', 'o_lat' => 29.3084, 'o_lng' => 30.8428, 'd_lat' => 30.0617, 'd_lng' => 31.2497],
];

try {
    $planner = app(JourneyPlannerService::class);
    
    foreach ($testJourneys as $idx => $tj) {
        echo ($idx + 1) . ". Searching: {$tj['name']}\n";
        $response = $planner->search(null, [
            'origin_lat' => $tj['o_lat'],
            'origin_lng' => $tj['o_lng'],
            'destination_lat' => $tj['d_lat'],
            'destination_lng' => $tj['d_lng'],
        ]);
        
        $options = $response['options'] ?? [];
        echo "   Found " . count($options) . " option(s)\n";
        
        foreach ($options as $i => $plan) {
            echo "   --- Option #" . ($i + 1) . ":\n";
            echo "       - Duration: " . ($plan['total_duration_sec'] ?? 'N/A') . " sec\n";
            echo "       - Transfers: " . ($plan['total_transfers'] ?? 'N/A') . "\n";
            echo "       - Walk distance: " . ($plan['walk_distance_meters'] ?? 'N/A') . " m\n";
            echo "       - Legs: " . count($plan['legs'] ?? []) . "\n";
            
            foreach ($plan['legs'] as $j => $leg) {
                $geom = $leg['geometry'] ?? [];
                $geomCount = count($geom);
                $geomSource = $leg['geometry_source'] ?? 'unknown';
                $walkSource = $leg['walk_source'] ?? '-';
                $legType = $leg['type'] ?? $leg['leg_type'] ?? 'unknown';
                $mode = $leg['mode'] ?? 'unknown';
                
                echo "       Leg " . ($j + 1) . ": type={$legType}, mode={$mode}, ";
                echo "from=({$leg['from_lat']}, {$leg['from_lng']}) ";
                echo "to=({$leg['to_lat']}, {$leg['to_lng']}) ";
                echo "geom_points={$geomCount} source={$geomSource} walk_src={$walkSource}\n";
                
                if ($geomCount > 0) {
                    $first = $geom[0];
                    $last = $geom[$geomCount - 1];
                    echo "         First point: [{$first[0]}, {$first[1]}] | Last point: [{$last[0]}, {$last[1]}]\n";
                    
                    // Validate point formats and coordinate order
                    // In backend, geometry is [[lat, lng], ...]
                    if (abs($first[0]) > 90 || abs($last[0]) > 90) {
                        echo "         [CRITICAL ERROR] First coordinate appears to be LON not LAT (> 90)! [{$first[0]}, {$first[1]}]\n";
                    }
                    if (abs($first[1]) > 180 || abs($last[1]) > 180) {
                        echo "         [CRITICAL ERROR] Second coordinate > 180! [{$first[0]}, {$first[1]}]\n";
                    }
                } else {
                    echo "         [WARNING] Empty geometry array!\n";
                }
            }
        }
        echo "\n";
    }
    
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
