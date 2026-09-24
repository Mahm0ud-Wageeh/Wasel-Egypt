<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserCarbonReward;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RewardController extends Controller
{
    /**
     * Get carbon stats and points balance.
     */
    public function show(): JsonResponse
    {
        $user = Auth::user();
        $reward = UserCarbonReward::firstOrCreate(
            ['user_id' => $user->id],
            [
                'total_distance_km' => 45.0,
                'co2_saved_kg' => 3.8,
                'points_balance' => 50,
                'total_points_earned' => 50,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => [
                'points_balance' => (int) $reward->points_balance,
                'total_points_earned' => (int) $reward->total_points_earned,
                'co2_saved_kg' => (float) $reward->co2_saved_kg,
                'total_distance_km' => (float) $reward->total_distance_km,
                'egp_value' => (float) ($reward->points_balance * 0.5), // 1 point = 0.50 EGP
            ],
        ]);
    }

    /**
     * Redeem points for real wallet balance credit.
     */
    public function redeem(Request $request): JsonResponse
    {
        $user = Auth::user();
        $reward = UserCarbonReward::firstOrCreate(['user_id' => $user->id]);

        if ($reward->points_balance < 20) {
            return response()->json([
                'success' => false,
                'message' => 'الحد الأدنى لاستبدال النقاط هو 20 نقطة (ما يعادل 10 ج.م)',
                'points' => $reward->points_balance,
            ], 400);
        }

        $pointsToRedeem = $reward->points_balance;
        $egpCredit = (float) ($pointsToRedeem * 0.5);

        return DB::transaction(function () use ($reward, $user, $pointsToRedeem, $egpCredit) {
            $reward->points_balance = 0;
            $reward->save();

            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance' => 0.00, 'currency' => 'EGP', 'is_active' => true]
            );

            $wallet->balance = (float) $wallet->balance + $egpCredit;
            $wallet->save();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'topup',
                'amount' => $egpCredit,
                'balance_after' => $wallet->balance,
                'reference_id' => 'RWD-' . strtoupper(Str::random(8)),
                'description_ar' => "استبدال {$pointsToRedeem} نقطة وفر كربوني برصيد محفظة",
                'description_en' => "Carbon rewards redemption ({$pointsToRedeem} pts)",
                'status' => 'completed',
            ]);

            return response()->json([
                'success' => true,
                'message' => "تم تحويل {$pointsToRedeem} نقطة بنجاح إلى {$egpCredit} ج.م في محفظتك!",
                'data' => [
                    'redeemed_points' => $pointsToRedeem,
                    'credited_egp' => $egpCredit,
                    'wallet_balance' => (float) $wallet->balance,
                    'remaining_points' => 0,
                ],
            ]);
        });
    }
}
