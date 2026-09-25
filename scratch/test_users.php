<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$users = App\Models\User::all(['id', 'name', 'email', 'status', 'password_hash']);
foreach ($users as $u) {
    echo "ID: {$u->id}, Name: {$u->name}, Email: {$u->email}, Status: {$u->status}\n";
    echo "Check Password123!: " . (Illuminate\Support\Facades\Hash::check('Password123!', $u->password_hash) ? "MATCH" : "NO MATCH") . "\n";
    echo "Check password: " . (Illuminate\Support\Facades\Hash::check('password', $u->password_hash) ? "MATCH" : "NO MATCH") . "\n";
}
