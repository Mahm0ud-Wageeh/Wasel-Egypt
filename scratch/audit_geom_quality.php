<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\RouteGeometry;
use App\Services\Journey\GeoCalculator;

echo "=== ROUTE GEOMETRY QUALITY AUDIT ===\n";

$total = RouteGeometry::count();
echo "Auditing {$total} RouteGeometry records...\n";

$latLngSwapped = 0;
$nanNullCoords = 0;
$emptyCoords = 0;
$largeJumps = 0;
$validCount = 0;

$geoms = RouteGeometry::all();

foreach ($geoms as $g) {
    $coords = $g->coordinates;
    if (!is_array($coords) || count($coords) < 2) {
        $emptyCoords++;
        continue;
    }
    
    $hasError = false;
    for ($i = 0; $i < count($coords); $i++) {
        $p = $coords[$i];
        if (!is_array($p) || count($p) < 2 || !is_numeric($p[0]) || !is_numeric($p[1])) {
            $nanNullCoords++;
            $hasError = true;
            break;
        }
        
        $lat = (float)$p[0];
        $lng = (float)$p[1];
        
        // In Egypt, Latitude is ~22 to 32, Longitude is ~25 to 37
        // If $lat > 34 and $lng < 32, coordinates might be swapped!
        if ($lat > 35.0 || $lng < 24.0 || $lng > 38.0) {
            $latLngSwapped++;
            $hasError = true;
            echo "Possible Lat/Lng swap in Geometry #{$g->id} (variant #{$g->route_variant_id}): [{$lat}, {$lng}]\n";
            break;
        }
        
        if ($i > 0) {
            $prev = $coords[$i - 1];
            $dist = GeoCalculator::distanceMeters((float)$prev[0], (float)$prev[1], $lat, $lng);
            if ($dist > 50000) { // > 50km jump between consecutive points
                $largeJumps++;
                echo "Large jump ({$dist}m) in Geometry #{$g->id} (variant #{$g->route_variant_id}) at point {$i}\n";
            }
        }
    }
    
    if (!$hasError) {
        $validCount++;
    }
}

echo "\n--- Summary ---\n";
echo "Total Records: {$total}\n";
echo "Valid: {$validCount}\n";
echo "Empty/Short: {$emptyCoords}\n";
echo "NaN/Null: {$nanNullCoords}\n";
echo "Lat/Lng Swapped: {$latLngSwapped}\n";
echo "Large Jumps (>50km): {$largeJumps}\n";

