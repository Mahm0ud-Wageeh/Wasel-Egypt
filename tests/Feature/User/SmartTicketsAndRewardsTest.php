<?php

namespace Tests\Feature\User;

use App\Models\TransitTicket;
use App\Models\User;
use App\Models\Wallet;
use App\Models\UserCarbonReward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartTicketsAndRewardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_purchase_and_validate_smart_qr_ticket(): void
    {
        $user = User::factory()->create();

        // 1. Initial wallet topup
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/wallet/topup', [
            'amount' => 100.00,
            'payment_method' => 'instapay',
        ]);

        // 2. Purchase ticket
        $purchaseRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/tickets/purchase', [
            'origin' => 'السادات',
            'destination' => 'جامعة القاهرة',
            'fare_amount' => 10.00,
            'transit_mode' => 'metro',
            'zones_count' => 2,
        ]);

        $purchaseRes->assertStatus(201);
        $purchaseRes->assertJson([
            'success' => true,
            'data' => [
                'wallet_balance' => 90.00,
                'carbon_points_earned' => 10,
            ],
        ]);

        $ticketCode = $purchaseRes->json('data.ticket.ticket_code');
        $this->assertNotEmpty($ticketCode);

        // 3. List active tickets
        $listRes = $this->actingAs($user, 'sanctum')->getJson('/api/v1/tickets/active');
        $listRes->assertStatus(200);
        $this->assertCount(1, $listRes->json('data'));

        // 4. Validate / Scan ticket at gate
        $validateRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/tickets/validate/{$ticketCode}");
        $validateRes->assertStatus(200);
        $validateRes->assertJson([
            'success' => true,
            'valid' => true,
        ]);

        // 5. Scanning again should reject (already used)
        $validateAgainRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/tickets/validate/{$ticketCode}");
        $validateAgainRes->assertStatus(400);
    }

    public function test_user_can_redeem_carbon_points_for_wallet_credit(): void
    {
        $user = User::factory()->create();

        // Seed carbon points
        $reward = UserCarbonReward::create([
            'user_id' => $user->id,
            'points_balance' => 40,
            'total_points_earned' => 40,
            'co2_saved_kg' => 3.4,
            'total_distance_km' => 50.0,
        ]);

        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/rewards/redeem');
        $res->assertStatus(200);
        $res->assertJson([
            'success' => true,
            'data' => [
                'redeemed_points' => 40,
                'credited_egp' => 20.00, // 40 * 0.50 EGP
                'wallet_balance' => 20.00,
            ],
        ]);

        $reward->refresh();
        $this->assertEquals(0, $reward->points_balance);
    }
}
