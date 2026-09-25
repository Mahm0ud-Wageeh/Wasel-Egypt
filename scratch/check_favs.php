<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$favs = App\Models\FavoriteLocation::all();
echo "Total favorite locations in DB: " . $favs->count() . "\n";
foreach ($favs as $f) {
    echo "ID: {$f->id}, UserID: {$f->user_id}, Name: {$f->name}, Station: {$f->address}\n";
}
