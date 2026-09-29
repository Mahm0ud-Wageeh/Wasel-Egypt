<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TransitTicket;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\UserCarbonReward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    /**
     * Get active tickets for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $tickets = TransitTicket::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('valid_until', '>', now())
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }

    /**
     * Purchase a transit ticket using wallet balance.
     */
    public function purchase(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'origin' => 'required|string|max:100',
            'destination' => 'required|string|max:100',
            'fare_amount' => 'required|numeric|min:5|max:100',
            'transit_mode' => 'nullable|string|in:metro,lrt,monorail,brt,train',
            'zones_count' => 'nullable|integer|min:1|max:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'بيانات التذكرة غير صحيحة',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $fare = (float) $request->input('fare_amount');
        $mode = $request->input('transit_mode', 'metro');
        $origin = $request->input('origin');
        $dest = $request->input('destination');
        $zones = (int) $request->input('zones_count', 1);

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0.00, 'currency' => 'EGP', 'is_active' => true]
        );

        if ((float) $wallet->balance < $fare) {
            return response()->json([
                'success' => false,
                'message' => 'رصيد المحفظة غير كافٍ لإصدار التذكرة. يرجى الشحن أولاً.',
                'required' => $fare,
                'balance' => (float) $wallet->balance,
            ], 402);
        }

        return DB::transaction(function () use ($wallet, $user, $fare, $mode, $origin, $dest, $zones) {
            // Deduct from wallet
            $wallet->balance = (float) $wallet->balance - $fare;
            $wallet->save();

            $tx = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'type' => 'trip_fare',
                'amount' => -$fare,
                'balance_after' => $wallet->balance,
                'reference_id' => 'TKT-' . strtoupper(Str::random(8)),
                'description_ar' => "شراء تذكرة ذكية: {$origin} ↔ {$dest}",
                'description_en' => "Transit ticket: {$origin} to {$dest}",
                'status' => 'completed',
            ]);

            $code = 'EG-' . strtoupper(Str::random(12));
            $validUntil = now()->addHours(3); // Valid for 3 hours
            $qrPayload = json_encode([
                'app' => 'WaselEgypt',
                'tkt' => $code,
                'u' => $user->id,
                'm' => $mode,
                'from' => $origin,
                'to' => $dest,
                'fare' => $fare,
                'exp' => $validUntil->timestamp,
            ]);

            $ticket = TransitTicket::create([
                'user_id' => $user->id,
                'ticket_code' => $code,
                'qr_payload' => $qrPayload,
                'transit_mode' => $mode,
                'origin_station' => $origin,
                'destination_station' => $dest,
                'fare_amount' => $fare,
                'zones_count' => $zones,
                'status' => 'active',
                'valid_until' => $validUntil,
            ]);

            // Award carbon reward points (e.g., 10 points per ticket)
            $reward = UserCarbonReward::firstOrCreate(
                ['user_id' => $user->id],
                ['total_distance_km' => 0, 'co2_saved_kg' => 0, 'points_balance' => 0, 'total_points_earned' => 0]
            );
            $reward->points_balance += 10;
            $reward->total_points_earned += 10;
            $reward->co2_saved_kg += 0.85; // 0.85 kg CO2 saved per transit trip
            $reward->total_distance_km += 12.5;
            $reward->save();

            return response()->json([
                'success' => true,
                'message' => 'تم إصدار التذكرة الذكية بنجاح',
                'data' => [
                    'ticket' => $ticket,
                    'wallet_balance' => (float) $wallet->balance,
                    'carbon_points_earned' => 10,
                ],
            ], 201);
        });
    }

    /**
     * Validate/Scan ticket at station gate simulator.
     */
    public function validateTicket(Request $request, string $code): JsonResponse
    {
        $ticket = TransitTicket::where('ticket_code', $code)->first();

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'التذكرة غير موجودة أو غير صالحة',
            ], 404);
        }

        if ($ticket->status !== 'active') {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => "التذكرة مستخدمة مسبقاً أو غير فعالة (الحالة: {$ticket->status})",
                'ticket' => $ticket,
            ], 400);
        }

        if (now()->isAfter($ticket->valid_until)) {
            $ticket->status = 'expired';
            $ticket->save();

            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'انتهت صلاحية التذكرة (تجاوزت فترة الـ 3 ساعات)',
            ], 400);
        }

        $ticket->status = 'used';
        $ticket->used_at = now();
        $ticket->save();

        return response()->json([
            'success' => true,
            'valid' => true,
            'message' => 'تم التحقق من التذكرة بنجاح — فُتحت البوابة',
            'ticket' => $ticket,
        ]);
    }
}
