<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(App\Services\Journey\JourneyPlannerService::class);
$response = $service->search(null, [
    'origin_lat' => 29.3082,
    'origin_lng' => 30.8428,
    'destination_lat' => 30.0571,
    'destination_lng' => 31.2472,
]);

$opt = $response['options'][0];
foreach ($opt['legs'] as $i => $leg) {
    echo "=== Leg $i (" . ($leg['mode'] ?? $leg['type']) . ") ===" . PHP_EOL;
    echo "from_lat: " . var_export($leg['from_lat'] ?? null, true) . " from_lng: " . var_export($leg['from_lng'] ?? null, true) . PHP_EOL;
    echo "to_lat: " . var_export($leg['to_lat'] ?? null, true) . " to_lng: " . var_export($leg['to_lng'] ?? null, true) . PHP_EOL;
    echo "from_stop: " . (isset($leg['from_stop']) ? json_encode($leg['from_stop']) : 'null') . PHP_EOL;
    echo "to_stop: " . (isset($leg['to_stop']) ? json_encode($leg['to_stop']) : 'null') . PHP_EOL;
    echo "geometry count: " . count($leg['geometry'] ?? []) . PHP_EOL;
}
