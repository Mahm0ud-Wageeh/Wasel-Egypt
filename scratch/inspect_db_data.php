<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== USERS IN DATABASE ===" . PHP_EOL;
$users = App\Models\User::all(['id', 'name', 'email']);
echo "Total users: " . $users->count() . PHP_EOL;
foreach ($users as $u) {
    echo "ID: {$u->id} | Name: {$u->name} | Email: {$u->email}" . PHP_EOL;
}

echo PHP_EOL . "=== USER-OWNED TABLES AUDIT ===" . PHP_EOL;
$tables = [
    'journeys' => App\Models\Journey::class,
    'active_journeys' => App\Models\ActiveJourney::class,
    'saved_places' => App\Models\SavedPlace::class,
    'favorite_locations' => App\Models\FavoriteLocation::class,
    'community_reports' => App\Models\CommunityReport::class,
    'incident_reports' => App\Models\IncidentReport::class,
    'notifications' => App\Models\Notification::class,
    'wallets' => App\Models\Wallet::class,
    'user_rewards' => App\Models\UserReward::class,
    'smart_tickets' => App\Models\SmartTicket::class,
];

foreach ($tables as $name => $class) {
    if (class_exists($class)) {
        try {
            $count = $class::count();
            $nullUserCount = $class::whereNull('user_id')->count();
            echo "Table: {$name} | Total: {$count} | Null user_id: {$nullUserCount}" . PHP_EOL;
        } catch (\Throwable $e) {
            echo "Table: {$name} | Error: " . $e->getMessage() . PHP_EOL;
        }
    }
}
