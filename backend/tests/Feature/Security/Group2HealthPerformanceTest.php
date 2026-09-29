<?php

namespace Tests\Feature\Security;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Group2HealthPerformanceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function r2_admin_can_delete_other_user()
    {
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRole);

        $targetUser = User::factory()->create();

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/v1/admin/users/{$targetUser->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);

        $this->assertSoftDeleted('users', ['id' => $targetUser->id]);
    }

    /** @test */
    public function r2_admin_cannot_delete_self()
    {
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRole);

        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/v1/admin/users/{$admin->id}");

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'message' => 'You cannot delete yourself',
        ]);

        $this->assertNull($admin->fresh()->deleted_at);
    }

    /** @test */
    public function r2_admin_delete_nonexistent_user_returns_404()
    {
        $adminRole = Role::factory()->create(['name' => 'admin']);
        $admin = User::factory()->create();
        $admin->roles()->attach($adminRole);

        Sanctum::actingAs($admin);

        $response = $this->deleteJson('/api/v1/admin/users/9999999');

        $response->assertStatus(404);
    }

    /** @test */
    public function r2_non_admin_cannot_delete_users()
    {
        $user = User::factory()->create();
        $targetUser = User::factory()->create();

        Sanctum::actingAs($user);

        $response = $this->deleteJson("/api/v1/admin/users/{$targetUser->id}");

        $response->assertStatus(403);
        $this->assertNull($targetUser->fresh()->deleted_at);
    }

    /** @test */
    public function h2_search_or_conditions_do_not_bypass_filters_on_routes()
    {
        $mode1 = TransitMode::factory()->create(['name' => 'Metro']);
        $mode2 = TransitMode::factory()->create(['name' => 'Bus']);

        $routeA = Route::factory()->create([
            'transit_mode_id' => $mode1->id,
            'long_name' => 'Express Nile Line',
            'short_name' => 'EN1',
        ]);
        $routeB = Route::factory()->create([
            'transit_mode_id' => $mode2->id,
            'long_name' => 'Express Giza Line',
            'short_name' => 'EG1',
        ]);
        $routeC = Route::factory()->create([
            'transit_mode_id' => $mode1->id,
            'long_name' => 'Local Cairo Line',
            'short_name' => 'LC1',
        ]);

        // Search for 'Express' with transit_mode_id filter for mode 1
        $response = $this->getJson("/api/v1/public-routes?transit_mode_id={$mode1->id}&search=Express");

        $response->assertStatus(200);
        $data = $response->json('data');

        $returnedIds = collect($data)->pluck('id')->all();

        // Route A matches both filter and search
        $this->assertContains($routeA->id, $returnedIds);
        // Route B has 'Express' but wrong mode -> MUST NOT be included
        $this->assertNotContains($routeB->id, $returnedIds);
        // Route C has mode 1 but not 'Express' -> MUST NOT be included
        $this->assertNotContains($routeC->id, $returnedIds);
    }

    /** @test */
    public function h2_search_or_conditions_do_not_bypass_active_filter_on_public_schedules()
    {
        $variant = RouteVariant::factory()->create();

        $activeSchedule = Schedule::factory()->create([
            'route_variant_id' => $variant->id,
            'is_active' => true,
            'headsign' => 'Downtown Express',
        ]);
        $inactiveSchedule = Schedule::factory()->create([
            'route_variant_id' => $variant->id,
            'is_active' => false,
            'headsign' => 'Downtown Express Night',
        ]);

        $response = $this->getJson('/api/v1/public-schedules?search=Downtown');

        $response->assertStatus(200);
        $data = $response->json('data');

        $returnedIds = collect($data)->pluck('id')->all();

        // Only active schedule should be returned in public listing
        $this->assertContains($activeSchedule->id, $returnedIds);
        $this->assertNotContains($inactiveSchedule->id, $returnedIds);
    }

    /** @test */
    public function h1_eager_loading_avoids_n_plus_one_on_route_stops()
    {
        $permission = Permission::factory()->create(['name' => 'transit-data-edit']);
        $role = Role::factory()->create(['name' => 'transit-editor']);
        $role->permissions()->attach($permission);

        $editor = User::factory()->create();
        $editor->roles()->attach($role);

        for ($i = 0; $i < 6; $i++) {
            $route = Route::factory()->create();
            $variant = RouteVariant::factory()->create([
                'route_id' => $route->id,
                'name' => 'Variant ' . $i,
            ]);
            $stop = TransitStop::factory()->create();
            RouteStop::factory()->create([
                'route_variant_id' => $variant->id,
                'transit_stop_id' => $stop->id,
            ]);
        }

        Sanctum::actingAs($editor);

        DB::enableQueryLog();

        $response = $this->getJson('/api/v1/route-stops?per_page=6');

        $response->assertStatus(200);
        $queries = DB::getQueryLog();

        // Without eager loading: 1 (count) + 1 (stops) + 6*5 (relations) = 32 queries
        // With eager loading: exactly 7 queries (count, route_stops, route_variants, routes, transit_stops, areas, governorates)
        $this->assertLessThanOrEqual(8, count($queries));
    }

    /** @test */
    public function h1_eager_loading_avoids_n_plus_one_on_public_routes()
    {
        Route::factory()->count(6)->create();

        DB::enableQueryLog();

        $response = $this->getJson('/api/v1/public-routes?per_page=6');

        $response->assertStatus(200);
        $queries = DB::getQueryLog();

        // Without eager loading: 1 (count) + 1 (routes) + 6*2 (mode, operator) = 14 queries
        // With eager loading: 4 queries (count, routes, transit_modes, transit_operators)
        $this->assertLessThanOrEqual(5, count($queries));
    }
}
