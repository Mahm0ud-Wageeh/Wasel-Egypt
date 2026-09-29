<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create or update roles
        $adminRole = Role::updateOrCreate(
            ['name' => 'admin'],
            ['description' => 'System administrator with full access']
        );

        $moderatorRole = Role::updateOrCreate(
            ['name' => 'moderator'],
            ['description' => 'Content moderator for community reports']
        );

        $dataEditorRole = Role::updateOrCreate(
            ['name' => 'data_editor'],
            ['description' => 'Can edit transit data (routes, stops, etc.)']
        );

        $userRole = Role::updateOrCreate(
            ['name' => 'user'],
            ['description' => 'Regular app user']
        );

        // Helper function to extract resource and action from permission name
        $extractResourceAction = function(string $name): array {
            $parts = explode('.', $name);
            $resource = $parts[0] ?? 'unknown';
            $action = $parts[1] ?? 'unknown';
            return [$resource, $action];
        };

        // Define permissions
        $permissionsData = [
            // Transit data editing (blanket permission guarding the transit CRUD and GTFS import endpoints)
            ['name' => 'transit-data-edit', 'description' => 'Edit transit data (modes, operators, stops, routes, schedules, alerts) and import GTFS'],

            // Transit modes
            ['name' => 'transit_modes.view', 'description' => 'View transit modes'],
            ['name' => 'transit_modes.create', 'description' => 'Create transit modes'],
            ['name' => 'transit_modes.edit', 'description' => 'Edit transit modes'],
            ['name' => 'transit_modes.delete', 'description' => 'Delete transit modes'],

            // Transit operators
            ['name' => 'transit_operators.view', 'description' => 'View transit operators'],
            ['name' => 'transit_operators.create', 'description' => 'Create transit operators'],
            ['name' => 'transit_operators.edit', 'description' => 'Edit transit operators'],
            ['name' => 'transit_operators.delete', 'description' => 'Delete transit operators'],

            // Governorates
            ['name' => 'governorates.view', 'description' => 'View governorates'],
            ['name' => 'governorates.create', 'description' => 'Create governorates'],
            ['name' => 'governorates.edit', 'description' => 'Edit governorates'],
            ['name' => 'governorates.delete', 'description' => 'Delete governorates'],

            // Areas
            ['name' => 'areas.view', 'description' => 'View areas'],
            ['name' => 'areas.create', 'description' => 'Create areas'],
            ['name' => 'areas.edit', 'description' => 'Edit areas'],
            ['name' => 'areas.delete', 'description' => 'Delete areas'],

            // Routes
            ['name' => 'routes.view', 'description' => 'View routes'],
            ['name' => 'routes.create', 'description' => 'Create routes'],
            ['name' => 'routes.edit', 'description' => 'Edit routes'],
            ['name' => 'routes.delete', 'description' => 'Delete routes'],

            // Route variants
            ['name' => 'route_variants.view', 'description' => 'View route variants'],
            ['name' => 'route_variants.create', 'description' => 'Create route variants'],
            ['name' => 'route_variants.edit', 'description' => 'Edit route variants'],
            ['name' => 'route_variants.delete', 'description' => 'Delete route variants'],

            // Transit stops
            ['name' => 'transit_stops.view', 'description' => 'View transit stops'],
            ['name' => 'transit_stops.create', 'description' => 'Create transit stops'],
            ['name' => 'transit_stops.edit', 'description' => 'Edit transit stops'],
            ['name' => 'transit_stops.delete', 'description' => 'Delete transit stops'],

            // Journeys
            ['name' => 'journeys.view', 'description' => 'View journeys'],
            ['name' => 'journeys.create', 'description' => 'Create journeys'],
            ['name' => 'journeys.edit', 'description' => 'Edit journeys'],
            ['name' => 'journeys.delete', 'description' => 'Delete journeys'],

            // Community reports
            ['name' => 'community_reports.view', 'description' => 'View community reports'],
            ['name' => 'community_reports.create', 'description' => 'Create community reports'],
            ['name' => 'community_reports.edit', 'description' => 'Edit community reports'],
            ['name' => 'community_reports.delete', 'description' => 'Delete community reports'],
            ['name' => 'community_reports.moderate', 'description' => 'Moderate community reports'],

            // Notifications
            ['name' => 'notifications.view', 'description' => 'View notifications'],
            ['name' => 'notifications.create', 'description' => 'Create notifications'],
            ['name' => 'notifications.edit', 'description' => 'Edit notifications'],
            ['name' => 'notifications.delete', 'description' => 'Delete notifications'],

            // System config
            ['name' => 'system_config.view', 'description' => 'View system configuration'],
            ['name' => 'system_config.edit', 'description' => 'Edit system configuration'],

            // User management
            ['name' => 'users.view', 'description' => 'View users'],
            ['name' => 'users.create', 'description' => 'Create users'],
            ['name' => 'users.edit', 'description' => 'Edit users'],
            ['name' => 'users.delete', 'description' => 'Delete users'],

            // Roles and permissions
            ['name' => 'roles.view', 'description' => 'View roles'],
            ['name' => 'roles.create', 'description' => 'Create roles'],
            ['name' => 'roles.edit', 'description' => 'Edit roles'],
            ['name' => 'roles.delete', 'description' => 'Delete roles'],
            ['name' => 'permissions.view', 'description' => 'View permissions'],
            ['name' => 'permissions.assign', 'description' => 'Assign permissions to roles'],
        ];

        // Create or update all permissions
        foreach ($permissionsData as $permissionData) {
            list($resource, $action) = $extractResourceAction($permissionData['name']);
            Permission::updateOrCreate(
                ['name' => $permissionData['name']],
                array_merge($permissionData, [
                    'resource' => $resource,
                    'action' => $action,
                ])
            );
        }

        // Assign permissions to roles
        // Admin gets all permissions
        $adminRole->permissions()->sync(Permission::pluck('id')->toArray());

        // Moderator gets specific permissions
        $moderatorPermissions = [
            'community_reports.view',
            'community_reports.create',
            'community_reports.edit',
            'community_reports.moderate',
            'notifications.view',
            'users.view',
        ];
        $moderatorRole->permissions()->sync(
            Permission::whereIn('name', $moderatorPermissions)->pluck('id')->toArray()
        );

        // Data editor gets specific permissions
        $dataEditorPermissions = [
            'transit-data-edit',
            'transit_modes.view',
            'transit_operators.view',
            'governorates.view',
            'areas.view',
            'routes.view',
            'routes.create',
            'routes.edit',
            'route_variants.view',
            'route_variants.create',
            'route_variants.edit',
            'transit_stops.view',
            'transit_stops.create',
            'transit_stops.edit',
            'journeys.view',
            'system_config.view',
        ];
        $dataEditorRole->permissions()->sync(
            Permission::whereIn('name', $dataEditorPermissions)->pluck('id')->toArray()
        );

        // User gets basic permissions
        $userPermissions = [
            'routes.view',
            'transit_stops.view',
            'journeys.view',
            'community_reports.view',
            'community_reports.create',
            'notifications.view',
        ];
        $userRole->permissions()->sync(
            Permission::whereIn('name', $userPermissions)->pluck('id')->toArray()
        );
    }
}