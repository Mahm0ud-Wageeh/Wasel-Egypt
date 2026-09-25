<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$userA = User::updateOrCreate(
    ['email' => 'ahmed@wasel.eg'],
    [
        'name' => 'أحمد محمود',
        'password_hash' => Hash::make('Password123!'),
        'status' => 'active',
        'phone' => '01012345678',
        'email_verified_at' => now(),
    ]
);
echo "User A ready: ID {$userA->id}, {$userA->name} ({$userA->email})\n";

$userB = User::updateOrCreate(
    ['email' => 'sara@wasel.eg'],
    [
        'name' => 'سارة خليل',
        'password_hash' => Hash::make('Password123!'),
        'status' => 'active',
        'phone' => '01198765432',
        'email_verified_at' => now(),
    ]
);
echo "User B ready: ID {$userB->id}, {$userB->name} ({$userB->email})\n";
