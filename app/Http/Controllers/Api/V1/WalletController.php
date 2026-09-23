<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    /**
     * Get or initialize current user's wallet.
     */
    public function show(): JsonResponse
    {
        $user = Auth::user();
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0.00, 'currency' => 'EGP', 'is_active' => true]
        );

        $recentTransactions = $wallet->transactions()->take(20)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $wallet->id,
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
                'is_active' => (bool) $wallet->is_active,
                'transactions' => $recentTransactions,
            ],
        ]);
    }

    /**
     * Top up wallet balance.
     */
    public function topUp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:5|max:5000',
            'payment_method' => 'nullable|string|in:fawry,vodafone_cash,instapay,credit_card,demo',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات شحن المحفظة غير صحيحة',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $amount = (float) $request->input('amount');
        $method = $request->input('payment_method', 'instapay');

        return DB::transaction(function () use ($user, $amount, $method) {
            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                ['balance' => 0.00, 'currency' => 'EGP', 'is_active' => true]
            );

            $wallet->balance = (float) $wallet->balance + $amount;
            $wallet->save();

            $tx = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'topup',
                'amount' => $amount,
                'balance_after' => $wallet->balance,
                'reference_id' => 'TOP-' . strtoupper(Str::random(10)),
                'description_ar' => "شحن رصيد المحفظة عبر {$method}",
                'description_en' => "Wallet top-up via {$method}",
                'status' => 'completed',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم شحن المحفظة بنجاح',
                'data' => [
                    'balance' => (float) $wallet->balance,
                    'currency' => $wallet->currency,
                    'transaction' => $tx,
                ],
            ]);
        });
    }

    /**
     * Deduct fare or pay for ticket from wallet.
     */
    public function pay(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1|max:500',
            'description' => 'required|string|max:255',
            'journey_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات الدفع غير صحيحة',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $amount = (float) $request->input('amount');
        $desc = $request->input('description');

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0.00, 'currency' => 'EGP', 'is_active' => true]
        );

        if ((float) $wallet->balance < $amount) {
            return response()->json([
                'success' => false,
                'message' => 'رصيد المحفظة غير كافٍ لإتمام الرحلة. يرجى الشحن أولاً.',
                'required' => $amount,
                'balance' => (float) $wallet->balance,
            ], 402);
        }

        return DB::transaction(function () use ($wallet, $user, $amount, $desc) {
            $wallet->balance = (float) $wallet->balance - $amount;
            $wallet->save();

            $tx = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'trip_fare',
                'amount' => -$amount,
                'balance_after' => $wallet->balance,
                'reference_id' => 'FARE-' . strtoupper(Str::random(10)),
                'description_ar' => $desc,
                'description_en' => 'Transit fare payment',
                'status' => 'completed',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم خصم الأجرة بنجاح من المحفظة',
                'data' => [
                    'balance' => (float) $wallet->balance,
                    'transaction' => $tx,
                ],
            ]);
        });
    }
}
