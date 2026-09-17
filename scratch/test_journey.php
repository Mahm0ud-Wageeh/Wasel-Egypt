<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Journey\JourneyPlannerService;
use App\Models\User;

$planner = app(JourneyPlannerService::class);
$user = User::first();
$result = $planner->search($user, [
    'origin_lat' => 30.0617,
    'origin_lng' => 31.2497,
    'destination_lat' => 30.0444,
    'destination_lng' => 31.2357,
]);

echo "OPTIONS COUNT: " . count($result['options']) . "\n";
if (!empty($result['options'])) {
    $opt = $result['options'][0];
    echo "DURATION: " . $opt['total_duration_sec'] . "s\n";
    echo "TRANSFERS: " . $opt['total_transfers'] . "\n";
    echo "LEGS COUNT: " . count($opt['legs']) . "\n";
    foreach ($opt['legs'] as $i => $leg) {
        echo "  LEG $i: type={$leg['type']}, mode={$leg['mode']}, from=" . ($leg['from_stop']['name'] ?? 'none') . ", to=" . ($leg['to_stop']['name'] ?? 'none') . ", duration={$leg['duration_sec']}s\n";
    }
}
