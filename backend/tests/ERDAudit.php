<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

/** @var Illuminate\Foundation\Application $app */
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

class ERDAudit
{
    protected $app;
    protected $passed = 0;
    protected $failed = 0;
    protected $errors = [];

    public function __construct($app)
    {
        $this->app = $app;
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

    public function runModelExistenceAudit()
    {
        echo "\n=== Model Existence Audit ===\n";
        $expectedModels = [
            'TransitMode',
            'TransitOperator',
            'Governorate',
            'Area',
            'User',
            'Role',
            'Permission',
            'UserPreference',
            'TransitStop',
            'Route',
            'RouteVariant',
            'RouteGeometry',
            'RouteStop',
            'Schedule',
            'StopTime',
            'ServiceAlert',
            'ServiceAlertStop',
            'ServiceAlertRoute',
            'Journey',
            'JourneyLeg',
            'Transfer',
            'ActiveJourney',
            'JourneyProgress',
            'DeviationEvent',
            'RecoveryRoute',
            'SavedTrip',
            'FavoriteLocation',
            'CommunityReport',
            'ReportModeration',
            'NotificationTemplate',
            'Notification',
            'NotificationPreference',
            'AnalyticsEvent',
            'AggregatedMetric',
            'SystemConfig',
            'AuditLog',
        ];

        foreach ($expectedModels as $model) {
            $class = "App\\Models\\{$model}";
            $this->assertTrue(class_exists($class), "Model {$model} exists");
        }
    }

    public function runTableColumnAudit()
    {
        echo "\n=== Table Column Audit ===\n";
        // Check a few key tables to ensure they have expected columns
        $checks = [
            'users' => ['id', 'name', 'email', 'phone', 'password_hash', 'status'],
            'roles' => ['id', 'name'],
            'permissions' => ['id', 'name'],
            'route_variants' => ['id', 'route_id', 'name', 'direction', 'headsign', 'active', 'reliability_score'],
            'notification_preferences' => ['id', 'user_id', 'quiet_hours_start', 'quiet_hours_end', 'quiet_hours_enabled'],
            'transfers' => ['id', 'journey_id', 'from_leg_id', 'to_leg_id', 'from_lat', 'from_longitude', 'to_lat', 'to_longitude'],
        ];

        foreach ($checks as $table => $expectedColumns) {
            $actualColumns = $this->getTableColumns($table);
            foreach ($expectedColumns as $column) {
                $this->assertTrue(
                    in_array($column, $actualColumns),
                    "Table {$table} has column {$column}"
                );
            }
        }
    }

    protected function getTableColumns($table)
    {
        $result = DB::select("DESCRIBE {$table}");
        $columns = [];
        foreach ($result as $row) {
            $columns[] = $row->Field;
        }
        return $columns;
    }

    public function runForeignKeyAudit()
    {
        echo "\n=== Foreign Key Audit ===\n";
        // Check a few key foreign keys
        $checks = [
            ['table' => 'role_permissions', 'column' => 'role_id', 'references' => 'roles(id)'],
            ['table' => 'role_permissions', 'column' => 'permission_id', 'references' => 'permissions(id)'],
            ['table' => 'route_variants', 'column' => 'route_id', 'references' => 'routes(id)'],
            ['table' => 'journeys', 'column' => 'user_id', 'references' => 'users(id)'],
            ['table' => 'journey_legs', 'column' => 'journey_id', 'references' => 'journeys(id)'],
            ['table' => 'transfers', 'column' => 'journey_id', 'references' => 'journeys(id)'],
            ['table' => 'transfers', 'column' => 'from_leg_id', 'references' => 'journey_legs(id)'],
            ['table' => 'transfers', 'column' => 'to_leg_id', 'references' => 'journey_legs(id)'],
            ['table' => 'notification_preferences', 'column' => 'user_id', 'references' => 'users(id)'],
            ['table' => 'community_reports', 'column' => 'user_id', 'references' => 'users(id)'],
            ['table' => 'community_reports', 'column' => 'related_route_id', 'references' => 'route_variants(id)'],
            ['table' => 'community_reports', 'column' => 'related_stop_id', 'references' => 'transit_stops(id)'],
        ];

        foreach ($checks as $check) {
            $table = $check['table'];
            $column = $check['column'];
            $references = $check['references'];

            $result = DB::select(
                "SELECT COUNT(*) as count FROM information_schema.key_column_usage
                 WHERE table_schema = DATABASE()
                 AND table_name = ?
                 AND column_name = ?
                 AND referenced_table_name IS NOT NULL",
                [$table, $column]
            );

            $exists = $result[0]->count > 0;
            $this->assertTrue($exists, "Foreign key exists: {$table}.{$column} -> {$references}");
        }
    }

    public function run()
    {
        echo "Starting ERD Consistency Audit...\n";

        $this->runModelExistenceAudit();
        $this->runTableColumnAudit();
        $this->runForeignKeyAudit();

        echo "\n=== Audit Summary ===\n";
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

// Run the audit
$audit = new ERDAudit($app);
$success = $audit->run();

if ($success) {
    echo "\n🎉 ERD audit passed! All expected models, columns, and foreign keys exist.\n";
    exit(0);
} else {
    echo "\n❌ ERD audit failed. Please review the errors above.\n";
    exit(1);
}