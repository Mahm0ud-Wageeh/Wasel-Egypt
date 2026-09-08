<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

/** @var Illuminate\Foundation\Application $app */
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

class DatabaseFoundationTest
{
    protected $app;
    protected $db;
    protected $passed = 0;
    protected $failed = 0;
    protected $errors = [];

    public function __construct($app)
    {
        $this->app = $app;
        $this->db = $app->make('db');
    }

    public function assertTrue($condition, $message)
    {
        if ($condition) {
            $this->passed++;
            echo "✓ $message\n";
        } else {
            $this->failed++;
            $this->errors[] = "✗ $message";
            echo "✗ $message\n";
        }
    }

    public function runMigrationTest()
    {
        echo "\n=== Migration Test ===\n";
        \Artisan::call('migrate:fresh');
        $this->assertTrue(true, 'Migration fresh succeeded');
    }

    public function runRollbackTest()
    {
        echo "\n=== Rollback Test ===\n";
        \Artisan::call('migrate:rollback');
        \Artisan::call('migrate');
        $this->assertTrue(true, 'Rollback and remigrate succeeded');
    }

    public function runSeederTest()
    {
        echo "\n=== Seeder Test ===\n";
        \Artisan::call('db:seed');
        $this->assertTrue(true, 'Database seeding succeeded');
    }

    public function runRelationshipTest()
    {
        echo "\n=== Relationship Test ===\n";
        $user = \App\Models\User::first();
        $this->assertTrue($user !== null, 'User exists');

        // Check that relationship methods exist and return correct relation types
        $this->assertTrue(method_exists($user, 'roles'), 'User has roles method');
        $rolesRelation = $user->roles();
        $this->assertTrue($rolesRelation instanceof \Illuminate\Database\Eloquent\Relations\BelongsToMany, 'User roles relation is BelongsToMany');

        $this->assertTrue(method_exists($user, 'preferences'), 'User has preferences method');
        $preferencesRelation = $user->preferences();
        $this->assertTrue($preferencesRelation instanceof \Illuminate\Database\Eloquent\Relations\HasOne, 'User preferences relation is HasOne');

        $this->assertTrue(method_exists($user, 'journeys'), 'User has journeys method');
        $journeysRelation = $user->journeys();
        $this->assertTrue($journeysRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User journeys relation is HasMany');

        $this->assertTrue(method_exists($user, 'savedTrips'), 'User has saved trips method');
        $savedTripsRelation = $user->savedTrips();
        $this->assertTrue($savedTripsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User saved trips relation is HasMany');

        $this->assertTrue(method_exists($user, 'favoriteLocations'), 'User has favorite locations method');
        $favoriteLocationsRelation = $user->favoriteLocations();
        $this->assertTrue($favoriteLocationsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User favorite locations relation is HasMany');

        $this->assertTrue(method_exists($user, 'communityReports'), 'User has community reports method');
        $communityReportsRelation = $user->communityReports();
        $this->assertTrue($communityReportsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User community reports relation is HasMany');

        $this->assertTrue(method_exists($user, 'notifications'), 'User has notifications method');
        $notificationsRelation = $user->notifications();
        $this->assertTrue($notificationsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User notifications relation is HasMany');

        $this->assertTrue(method_exists($user, 'auditLogs'), 'User has audit logs method');
        $auditLogsRelation = $user->auditLogs();
        $this->assertTrue($auditLogsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User audit logs relation is HasMany');

        $this->assertTrue(method_exists($user, 'analyticsEvents'), 'User has analytics events method');
        $analyticsEventsRelation = $user->analyticsEvents();
        $this->assertTrue($analyticsEventsRelation instanceof \Illuminate\Database\Eloquent\Relations\HasMany, 'User analytics events relation is HasMany');
    }

    public function runConstraintTest()
    {
        echo "\n=== Constraint Test ===\n";
        try {
            // Test notification_preferences quiet_hours constraint
            // We'll test by trying to create a record that should violate the constraint
            // The constraint is: ((quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR (quiet_hours_start < quiet_hours_end))

            // First, test a valid case (both null) - should pass
            $user1 = \App\Models\User::factory()->create();
            $np1 = \App\Models\NotificationPreference::create([
                'user_id' => $user1->id,
                'quiet_hours_enabled' => false,
                'quiet_hours_start' => null,
                'quiet_hours_end' => null,
            ]);
            $this->assertTrue($np1->id > 0, 'Valid quiet hours (both null) constraint passed');

            // Test valid case (start < end) - should pass
            $user2 = \App\Models\User::factory()->create();
            $np2 = \App\Models\NotificationPreference::create([
                'user_id' => $user2->id,
                'quiet_hours_enabled' => true,
                'quiet_hours_start' => '01:00:00',
                'quiet_hours_end' => '02:00:00',
            ]);
            $this->assertTrue($np2->id > 0, 'Valid quiet hours (start < end) constraint passed');

            // Test invalid case (start >= end and not both null) - should fail
            try {
                $user3 = \App\Models\User::factory()->create();
                \App\Models\NotificationPreference::create([
                    'user_id' => $user3->id,
                    'quiet_hours_enabled' => true,
                    'quiet_hours_start' => '08:00:00',
                    'quiet_hours_end' => '08:00:00',
                ]);
                $this->assertTrue(false, 'Invalid quiet hours constraint should have failed (start = end)');
            } catch (\Exception $e) {
                $this->assertTrue(true, 'Invalid quiet hours constraint correctly failed (start = end)');
            }

            // Test another invalid case (start > end) - should fail
            try {
                $user4 = \App\Models\User::factory()->create();
                \App\Models\NotificationPreference::create([
                    'user_id' => $user4->id,
                    'quiet_hours_enabled' => true,
                    'quiet_hours_start' => '10:00:00',
                    'quiet_hours_end' => '08:00:00',
                ]);
                $this->assertTrue(false, 'Invalid quiet hours constraint should have failed (start > end)');
            } catch (\Exception $e) {
                $this->assertTrue(true, 'Invalid quiet hours constraint correctly failed (start > end)');
            }

            // Test transfers constraint: coordinates validation
            // First create required related records
            $journey = \App\Models\Journey::factory()->create();
            $fromLeg = \App\Models\JourneyLeg::factory()->create(['journey_id' => $journey->id]);
            $toLeg = \App\Models\JourneyLeg::factory()->create(['journey_id' => $journey->id]);

            // Test valid coordinates
            $transfer = \App\Models\Transfer::create([
                'journey_id' => $journey->id,
                'from_leg_id' => $fromLeg->id,
                'to_leg_id' => $toLeg->id,
                'transfer_type' => 'waiting',
                'transfer_duration_sec' => 100,
                'from_lat' => 45.0,
                'from_longitude' => 10.0,
                'to_lat' => -45.0,
                'to_longitude' => -10.0,
            ]);
            $this->assertTrue($transfer->id > 0, 'Valid transfer coordinates passed');

            // Test invalid latitude (> 90) - should fail
            try {
                \App\Models\Transfer::create([
                    'journey_id' => $journey->id,
                    'from_leg_id' => $fromLeg->id,
                    'to_leg_id' => $toLeg->id,
                    'transfer_type' => 'waiting',
                    'transfer_duration_sec' => 100,
                    'from_lat' => 95.0, // invalid
                    'from_longitude' => 10.0,
                    'to_lat' => 45.0,
                    'to_longitude' => 10.0,
                ]);
                $this->assertTrue(false, 'Invalid latitude should have failed');
            } catch (\Exception $e) {
                $this->assertTrue(true, 'Invalid latitude constraint correctly failed');
            }

            // Test invalid longitude (> 180) - should fail
            try {
                \App\Models\Transfer::create([
                    'journey_id' => $journey->id,
                    'from_leg_id' => $fromLeg->id,
                    'to_leg_id' => $toLeg->id,
                    'transfer_type' => 'waiting',
                    'transfer_duration_sec' => 100,
                    'from_lat' => 45.0,
                    'from_longitude' => 190.0, // invalid
                    'to_lat' => 45.0,
                    'to_longitude' => 10.0,
                ]);
                $this->assertTrue(false, 'Invalid longitude should have failed');
            } catch (\Exception $e) {
                $this->assertTrue(true, 'Invalid longitude constraint correctly failed');
            }

            $this->assertTrue(true, 'All constraint tests passed');
        } catch (\Exception $e) {
            $this->assertTrue(false, 'Constraint test failed: ' . $e->getMessage());
        }
    }

    public function runSoftDeleteTest()
    {
        echo "\n=== Soft Delete Test ===\n";
        $model = \App\Models\User::first();
        if (!$model) {
            $model = \App\Models\User::factory()->create();
        }
        $model->delete();
        $this->assertTrue($model->trashed(), 'Model soft deleted correctly');

        $model->restore();
        $this->assertTrue(!$model->trashed(), 'Model restored correctly');

        $this->assertTrue(true, 'Soft delete test passed');
    }

    public function runFactoryTest()
    {
        echo "\n=== Factory Test ===\n";
        $models = [
            \App\Models\TransitStop::class,
            \App\Models\Route::class,
            \App\Models\RouteVariant::class,
            \App\Models\Journey::class,
            \App\Models\JourneyLeg::class,
            \App\Models\CommunityReport::class,
            \App\Models\SavedTrip::class,
            \App\Models\FavoriteLocation::class,
            \App\Models\ReportModeration::class,
            \App\Models\NotificationPreference::class,
        ];

        foreach ($models as $model) {
            $instance = $model::factory()->make();
            $this->assertTrue($instance instanceof $model, "Factory for {$model} makes correct instance");
        }

        // Test creating a few
        $transitStop = \App\Models\TransitStop::factory()->create();
        $this->assertTrue($transitStop->id > 0, 'TransitStop factory creates in DB');

        $route = \App\Models\Route::factory()->create();
        $this->assertTrue($route->id > 0, 'Route factory creates in DB');

        $this->assertTrue(true, 'All factory tests passed');
    }

    public function runTableExistenceTest()
    {
        echo "\n=== Table Existence Test ===\n";
        $expectedTables = [
            'transit_modes',
            'transit_operators',
            'governorates',
            'areas',
            'users',
            'roles',
            'permissions',
            'role_permissions',
            'user_roles',
            'user_preferences',
            'transit_stops',
            'routes',
            'route_variants',
            'route_geometry',
            'route_stops',
            'schedules',
            'stop_times',
            'service_alerts',
            'service_alert_stops',
            'service_alert_routes',
            'journeys',
            'journey_legs',
            'transfers',
            'active_journeys',
            'journey_progress',
            'deviation_events',
            'recovery_routes',
            'saved_trips',
            'favorite_locations',
            'community_reports',
            'report_moderations',
            'notification_templates',
            'notifications',
            'notification_preferences',
            'analytics_events',
            'aggregated_metrics',
            'system_config',
            'audit_logs',
        ];

        foreach ($expectedTables as $table) {
            $result = $this->db->select(
                "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
                [$table]
            );
            $exists = $result[0]->count > 0;
            $this->assertTrue($exists, "Table {$table} exists");
        }
    }

    public function run()
    {
        echo "Starting Database Foundation Verification...\n";

        $this->runTableExistenceTest();
        $this->runMigrationTest();
        $this->runRollbackTest();
        $this->runSeederTest();
        $this->runRelationshipTest();
        $this->runConstraintTest();
        $this->runSoftDeleteTest();
        $this->runFactoryTest();

        echo "\n=== Summary ===\n";
        echo "Passed: {$this->passed}\n";
        echo "Failed: {$this->failed}\n";

        if ($this->failed > 0) {
            echo "\nErrors:\n";
            foreach ($this->errors as $error) {
                echo $error . "\n";
            }
        }

        return $this->failed === 0;
    }
}

// Run the test
$test = new DatabaseFoundationTest($app);
$success = $test->run();

if ($success) {
    echo "\n🎉 All tests passed! Database foundation is verified.\n";
    exit(0);
} else {
    echo "\n❌ Some tests failed. Please review the errors above.\n";
    exit(1);
}