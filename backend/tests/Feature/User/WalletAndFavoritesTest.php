<?php

namespace Tests\Feature\User;

use App\Models\User;
use App\Models\Wallet;
use App\Models\FavoriteLocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletAndFavoritesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_and_topup_wallet(): void
    {
        $user = User::factory()->create();

        // 1. Get initial wallet with welcome bonus
        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/wallet');
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'balance' => 100.00,
                'currency' => 'EGP',
            ],
        ]);

        // 2. Top up wallet
        $topUpRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wallet/topup', [
            'amount' => 150.00,
            'payment_method' => 'instapay',
        ]);
        $topUpRes->assertStatus(200);
        $topUpRes->assertJson([
            'success' => true,
            'data' => [
                'balance' => 250.00,
            ],
        ]);

        // 3. Pay fare from wallet
        $payRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/wallet/pay', [
            'amount' => 20.00,
            'description' => 'تذكرة مترو الخط الثالث',
        ]);
        $payRes->assertStatus(200);
        $payRes->assertJson([
            'success' => true,
            'data' => [
                'balance' => 230.00,
            ],
        ]);
    }

    public function test_user_can_manage_favorite_locations(): void
    {
        $user = User::factory()->create();

        // 1. Save new favorite location
        $storeRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/favorite-locations', [
            'name' => 'المنزل',
            'address' => 'المعادي - شارع 9',
            'latitude' => 29.9592,
            'longitude' => 31.2612,
            'place_type' => 'home',
        ]);
        $storeRes->assertStatus(201);
        $favId = $storeRes->json('data.id');

        // 2. List favorite locations
        $listRes = $this->actingAs($user, 'sanctum')->getJson('/api/v1/favorite-locations');
        $listRes->assertStatus(200);
        $this->assertCount(1, $listRes->json('data'));

        // 3. Delete favorite location
        $delRes = $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/favorite-locations/{$favId}");
        $delRes->assertStatus(200);

        // 4. Verify empty list
        $listAfterRes = $this->actingAs($user, 'sanctum')->getJson('/api/v1/favorite-locations');
        $this->assertCount(0, $listAfterRes->json('data'));
    }
}
