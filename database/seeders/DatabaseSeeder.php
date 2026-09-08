<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed modes/roles first
        $this->call([
            TransitModeSeeder::class,
            RolePermissionSeeder::class,
        ]);

        // Seed transit operators (needed for route factories and relationships)
        $this->call([
            TransitOperatorSeeder::class,
        ]);

        // Create or update an admin user so SystemConfig can reference it
        $adminUser = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'phone' => '+201234567890',
                'password_hash' => Hash::make('password'), // default password, should be changed in production
                'status' => 'active',
                'email_verified_at' => Carbon::now(),
            ]
        );

        // Assign admin role
        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $adminUser->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        // Run remaining seeders that depend on admin user
        $this->call([
            GovernorateSeeder::class,
            SystemConfigSeeder::class,
        ]);
    }
}
