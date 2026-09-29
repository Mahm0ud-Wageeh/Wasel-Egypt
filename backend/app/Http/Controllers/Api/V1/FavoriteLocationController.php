<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FavoriteLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class FavoriteLocationController extends Controller
{
    /**
     * Display a listing of the user's favorite locations.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $favorites = FavoriteLocation::where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $favorites,
        ]);
    }

    /**
     * Store a newly created favorite location.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'address' => 'nullable|string|max:255',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'place_type' => 'nullable|in:home,work,school,other',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $data = $validator->validated();
        $data['user_id'] = $user->id;
        $data['place_type'] = $data['place_type'] ?? 'other';

        // Upsert by user_id and name
        $favorite = FavoriteLocation::updateOrCreate(
            ['user_id' => $user->id, 'name' => $data['name']],
            $data
        );

        return response()->json([
            'success' => true,
            'message' => 'Favorite location saved successfully',
            'data' => $favorite,
        ], 201);
    }

    /**
     * Remove the specified favorite location.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = Auth::user();
        $favorite = FavoriteLocation::where('user_id', $user->id)->where('id', $id)->first();

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Location not found',
            ], 404);
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Favorite location deleted successfully',
        ]);
    }
}
