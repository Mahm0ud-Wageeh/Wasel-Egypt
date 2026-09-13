<?php

namespace Tests\Feature\Transit;

use App\Models\Fare;
use App\Models\SystemConfig;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Models\User;
use Database\Seeders\FareSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FareTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->roles()->create(['name' => 'admin', 'description' => 'Administrator']);
    }

    private function seedModes(): array
    {
        $metro = TransitMode::factory()->create(['name' => 'metro', 'icon' => 'subway']);
        $bus = TransitMode::factory()->create(['name' => 'bus', 'icon' => 'bus']);

        return [$metro, $bus];
    }

    public function test_public_index_lists_fares_with_honest_status_labels(): void
    {
        [$metro, $bus] = $this->seedModes();

        Fare::create([
            'transit_mode_id' => $metro->id,
            'label' => 'Cairo Metro — Tier 1',
            'tier' => 'Tier 1',
            'amount' => 8,
            'source' => 'tfc_metro_fares',
            'confidence' => 'verified',
            'data_status' => 'real',
            'status' => 'active',
        ]);
        Fare::create([
            'transit_mode_id' => $bus->id,
            'label' => 'CTA bus — base fare (estimated)',
            'amount' => 5,
            'source' => 'demo_seed',
            'confidence' => 'estimated',
            'data_status' => 'demo_estimated',
            'status' => 'active',
        ]);

        $this->getJson('/api/v1/fares')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.data_status', 'real')
            ->assertJsonPath('data.1.data_status', 'demo_estimated')
            ->assertJsonPath('meta.data_status_legend.demo_estimated', 'Demo / Estimated — editable by administrators.');
    }

    public function test_public_index_filters_by_mode_and_hides_inactive(): void
    {
        [$metro, $bus] = $this->seedModes();

        Fare::create([
            'transit_mode_id' => $metro->id, 'label' => 'Metro tier', 'amount' => 8,
            'data_status' => 'real', 'status' => 'active',
        ]);
        Fare::create([
            'transit_mode_id' => $metro->id, 'label' => 'Metro archived', 'amount' => 99,
            'data_status' => 'real', 'status' => 'archived',
        ]);
        Fare::create([
            'transit_mode_id' => $bus->id, 'label' => 'Bus demo', 'amount' => 5,
            'data_status' => 'demo_estimated', 'status' => 'active',
        ]);

        $this->getJson('/api/v1/fares?mode=metro')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.label', 'Metro tier');
    }

    public function test_estimate_prices_verified_metro_pair_from_matrix(): void
    {
        [$metro] = $this->seedModes();
        $from = TransitStop::factory()->create(['name' => 'Mar Girgis']);
        $to = TransitStop::factory()->create(['name' => 'Saad Zaghloul']);

        SystemConfig::create([
            'config_key' => 'tfc_metro_fares',
            'config_value' => json_encode([
                'as_of' => '2024-10',
                'matrix' => [(string) $from->id => [(string) $to->id => 8]],
            ]),
            'config_type' => 'json',
        ]);

        $this->getJson("/api/v1/fares/estimate?origin={$from->id}&destination={$to->id}")
            ->assertOk()
            ->assertJsonPath('meta.available', true)
            ->assertJsonPath('data.amount', 8)
            ->assertJsonPath('data.data_status', 'real');
    }

    public function test_estimate_honestly_unavailable_for_unknown_pair(): void
    {
        [$metro] = $this->seedModes();
        $from = TransitStop::factory()->create();
        $to = TransitStop::factory()->create();

        SystemConfig::create([
            'config_key' => 'tfc_metro_fares',
            'config_value' => json_encode(['as_of' => '2024-10', 'matrix' => []]),
            'config_type' => 'json',
        ]);

        $this->getJson("/api/v1/fares/estimate?origin={$from->id}&destination={$to->id}")
            ->assertOk()
            ->assertJsonPath('meta.available', false)
            ->assertJsonPath('data', null);
    }

    public function test_estimate_validates_stop_ids(): void
    {
        $this->getJson('/api/v1/fares/estimate?origin=99999&destination=1')
            ->assertStatus(422);
    }

    public function test_admin_can_manage_fares(): void
    {
        [$metro] = $this->seedModes();
        $operator = TransitOperator::factory()->create();

        // Create
        $created = $this->actingAs($this->admin)->postJson('/api/v1/admin/fares', [
            'transit_mode_id' => $metro->id,
            'transit_operator_id' => $operator->id,
            'label' => 'Bus flat fare (estimated)',
            'amount' => 6.5,
            'currency' => 'EGP',
            'data_status' => 'demo_estimated',
            'confidence' => 'estimated',
            'status' => 'active',
            'notes' => 'Corrected by operator notice',
        ])->assertCreated()->json();

        $this->assertEquals('6.50', $created['amount']);

        // Update — administrator replaces the demo value with a real one
        $this->actingAs($this->admin)->putJson("/api/v1/admin/fares/{$created['id']}", [
            'label' => 'Bus flat fare',
            'amount' => 7,
            'data_status' => 'real',
            'confidence' => 'verified',
            'status' => 'active',
        ])->assertOk()->assertJsonPath('data_status', 'real');

        // Filter
        $this->actingAs($this->admin)->getJson('/api/v1/admin/fares?data_status=real')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Delete
        $this->actingAs($this->admin)->deleteJson("/api/v1/admin/fares/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('deleted', true);
    }

    public function test_admin_fares_reject_invalid_payload(): void
    {
        [$metro] = $this->seedModes();

        $this->actingAs($this->admin)->postJson('/api/v1/admin/fares', [
            'transit_mode_id' => $metro->id,
            'label' => '',
            'amount' => -5,
            'effective_from' => '2026-01-01',
            'effective_until' => '2025-01-01',
        ])->assertStatus(422);
    }

    public function test_admin_fares_forbidden_without_admin_role(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/admin/fares')->assertStatus(403);
    }

    public function test_seeder_separates_real_and_estimated_rows(): void
    {
        [$metro, $bus] = $this->seedModes();
        TransitMode::factory()->create(['name' => 'microbus']);
        TransitMode::factory()->create(['name' => 'minibus']);
        TransitOperator::factory()->create(['name' => 'National Authority for Tunnels']);

        // No matrix → no real rows may be fabricated.
        $this->artisan('db:seed', ['--class' => FareSeeder::class, '--force' => true]);
        $this->assertEquals(0, Fare::where('data_status', 'real')->count());
        $this->assertEquals(3, Fare::where('data_status', 'demo_estimated')->count());

        // With the imported matrix → real tier rows appear.
        SystemConfig::create([
            'config_key' => 'tfc_metro_fares',
            'config_value' => json_encode([
                'as_of' => '2024-10',
                'matrix' => ['1' => ['2' => 8, '3' => 10], '2' => ['3' => 15], '3' => ['4' => 20]],
            ]),
            'config_type' => 'json',
        ]);

        $this->artisan('db:seed', ['--class' => FareSeeder::class, '--force' => true]);
        $real = Fare::where('data_status', 'real')->orderBy('amount')->get();
        $this->assertEquals([8, 10, 15, 20], $real->pluck('amount')->map(fn ($v) => (float) $v)->all());
        $this->assertEquals('tfc_metro_fares', $real->first()->source);
    }
}
