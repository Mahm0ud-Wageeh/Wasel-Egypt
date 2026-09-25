<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Journey;
use App\Models\SavedPlace;
use App\Models\FavoriteLocation;
use App\Models\Notification;
use Illuminate\Support\Facades\Hash;

echo "=== MULTI-USER ISOLATION & AUTHORIZATION AUDIT ===" . PHP_EOL;

// 1. Create or get User A and User B
$userA = User::updateOrCreate(
    ['email' => 'user_a_audit@wasel.local'],
    ['name' => 'User Alpha', 'password' => Hash::make('Password123!')]
);

$userB = User::updateOrCreate(
    ['email' => 'user_b_audit@wasel.local'],
    ['name' => 'User Beta', 'password' => Hash::make('Password123!')]
);

echo "User A ID: {$userA->id} ({$userA->email})" . PHP_EOL;
echo "User B ID: {$userB->id} ({$userB->email})" . PHP_EOL;

// 2. User A creates a unique journey
$journeyA = Journey::create([
    'user_id' => $userA->id,
    'origin_lat' => 30.0444,
    'origin_lng' => 31.2357,
    'destination_lat' => 30.0131,
    'destination_lng' => 31.2089,
    'origin_name' => 'Ramses Alpha Exclusive',
    'destination_name' => 'Giza Alpha Exclusive',
    'duration_minutes' => 30,
    'fare' => 12.00,
    'status' => 'planned',
    'requested_at' => now(),
]);

echo "Created User A's Journey ID: {$journeyA->id}" . PHP_EOL;

// 3. User A creates a favorite location
$favA = FavoriteLocation::updateOrCreate(
    ['user_id' => $userA->id, 'name' => 'Alpha Secret Hideout'],
    [
        'address' => 'Secret St 1',
        'latitude' => 30.05,
        'longitude' => 31.25,
        'place_type' => 'home',
    ]
);

echo "Created User A's FavoriteLocation ID: {$favA->id}" . PHP_EOL;

// 4. User A creates a notification
$notifA = Notification::create([
    'user_id' => $userA->id,
    'title' => 'Alpha Personal Alert',
    'body' => 'Confidential alert for Alpha only',
    'type' => 'system',
    'channel' => 'in_app',
    'sent_at' => now(),
]);

echo "Created User A's Notification ID: {$notifA->id}" . PHP_EOL;

// 5. User B lists journeys
Auth::setUser($userB);
$requestJourneysB = Illuminate\Http\Request::create('/api/v1/journeys', 'GET');
$requestJourneysB->setUserResolver(fn() => $userB);
$controllerJourneys = app(App\Http\Controllers\Api\V1\JourneyController::class);
$responseJourneysB = $controllerJourneys->index($requestJourneysB);
$contentJourneysB = json_decode($responseJourneysB->getContent(), true);

$userBSeesAJourney = false;
foreach ($contentJourneysB['data'] ?? [] as $j) {
    if ($j['id'] == $journeyA->id) {
        $userBSeesAJourney = true;
    }
}
echo "TEST 1 - User B list journeys contains User A's journey: " . ($userBSeesAJourney ? "FAIL (LEAK!)" : "PASS (ISOLATED)") . PHP_EOL;

// 6. User B attempts direct GET /api/v1/journeys/{journeyA->id}
Auth::setUser($userB);
$responseShowB = $controllerJourneys->show($journeyA->id);
$statusShowB = $responseShowB->getStatusCode();
echo "TEST 2 - User B direct GET User A's journey: HTTP {$statusShowB} " . ($statusShowB === 403 || $statusShowB === 404 ? "PASS (REJECTED)" : "FAIL (LEAK!)") . PHP_EOL;

// 7. User B attempts DELETE /api/v1/journeys/{journeyA->id}
Auth::setUser($userB);
$responseDelB = $controllerJourneys->destroy($journeyA->id);
$statusDelB = $responseDelB->getStatusCode();
echo "TEST 3 - User B direct DELETE User A's journey: HTTP {$statusDelB} " . ($statusDelB === 403 || $statusDelB === 404 ? "PASS (REJECTED)" : "FAIL (LEAK!)") . PHP_EOL;

// 8. User B lists favorite locations
$favController = app(App\Http\Controllers\Api\V1\FavoriteLocationController::class);
// Set auth user to User B
Auth::setUser($userB);
$favListB = $favController->index();
$favContentB = json_decode($favListB->getContent(), true);
$userBSeesAFav = false;
foreach ($favContentB['data'] ?? [] as $f) {
    if ($f['id'] == $favA->id) {
        $userBSeesAFav = true;
    }
}
echo "TEST 4 - User B list favorite-locations contains User A's favorite: " . ($userBSeesAFav ? "FAIL (LEAK!)" : "PASS (ISOLATED)") . PHP_EOL;

// 9. User B attempts direct DELETE /api/v1/favorite-locations/{favA->id}
$favDelB = $favController->destroy($favA->id);
$statusFavDelB = $favDelB->getStatusCode();
echo "TEST 5 - User B direct DELETE User A's favorite: HTTP {$statusFavDelB} " . ($statusFavDelB === 404 || $statusFavDelB === 403 ? "PASS (REJECTED)" : "FAIL (LEAK!)") . PHP_EOL;

// 10. User B lists notifications
$notifController = app(App\Http\Controllers\Api\V1\NotificationController::class);
$notifReqB = app(App\Http\Requests\NotificationListRequest::class);
$notifReqB->setUserResolver(fn() => $userB);
$notifListB = $notifController->index($notifReqB);
$notifContentB = json_decode($notifListB->getContent(), true);
$userBSeesANotif = false;
foreach ($notifContentB['data'] ?? [] as $n) {
    if ($n['id'] == $notifA->id) {
        $userBSeesANotif = true;
    }
}
echo "TEST 6 - User B list notifications contains User A's notification: " . ($userBSeesANotif ? "FAIL (LEAK!)" : "PASS (ISOLATED)") . PHP_EOL;

// Cleanup test items
$journeyA->delete();
$favA->delete();
$notifA->delete();
