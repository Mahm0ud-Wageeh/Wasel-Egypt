<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\RouteVariant;
use App\Models\RouteGeometry;
use App\Models\TransitStop;

echo "=== DATABASE GEOMETRY AUDIT ===\n";
echo "Total RouteVariants: " . RouteVariant::count() . "\n";
echo "Total RouteGeometries: " . RouteGeometry::count() . "\n";
echo "Variants without geometry: " . RouteVariant::whereDoesntHave('geometry')->count() . "\n";
echo "Total TransitStops: " . TransitStop::count() . "\n";

$variantsNoGeom = RouteVariant::whereDoesntHave('geometry')->with('route')->take(10)->get();
if ($variantsNoGeom->isNotEmpty()) {
    echo "\nSample variants without geometry:\n";
    foreach ($variantsNoGeom as $v) {
        echo "- Variant #{$v->id}: {$v->route->short_name} ({$v->route->route_type}) {$v->route->long_name}\n";
    }
}
