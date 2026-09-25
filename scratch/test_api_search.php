<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

echo "=== TESTING API ENDPOINT /api/v1/journeys/search ===\n";

$request = Request::create('/api/v1/journeys/search', 'POST', [
    'origin_lat' => 30.0617,
    'origin_lng' => 31.2497,
    'destination_lat' => 30.0264,
    'destination_lng' => 31.2017,
]);

$response = app()->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
$content = json_decode($response->getContent(), true);

$options = $content['data']['options'] ?? $content['options'] ?? [];
echo "Options count: " . count($options) . "\n";

foreach ($options as $i => $opt) {
    echo "Option #{$i}:\n";
    echo "  Total duration: " . ($opt['total_duration_sec'] ?? 'N/A') . " sec\n";
    $legs = $opt['legs'] ?? [];
    echo "  Legs count: " . count($legs) . "\n";
    foreach ($legs as $j => $leg) {
        $type = $leg['type'] ?? 'N/A';
        $mode = $leg['mode'] ?? 'N/A';
        $geom = $leg['geometry'] ?? null;
        $geomCount = is_array($geom) ? count($geom) : 0;
        echo "    Leg #{$j}: type={$type}, mode={$mode}, from_lat={$leg['from_lat']}, from_lng={$leg['from_lng']}, to_lat={$leg['to_lat']}, to_lng={$leg['to_lng']}, geom_count={$geomCount}\n";
        if ($geomCount > 0) {
            echo "      First: [" . implode(',', $geom[0]) . "] Last: [" . implode(',', $geom[$geomCount - 1]) . "]\n";
        }
    }
}
