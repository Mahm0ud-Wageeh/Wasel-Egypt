<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SavedPlace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SavedPlaceController extends Controller
{
    /**
     * Display a listing of user's saved places.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $places = SavedPlace::where('user_id', $user->id)
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $places,
        ]);
    }

    /**
     * Store a newly created or updated saved place.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'type' => ['required', 'string', 'in:home,work,favorite'],
        ]);

        $user = Auth::user();

        // If type is home or work, replace existing home or work
        if (in_array($validated['type'], ['home', 'work'], true)) {
            $place = SavedPlace::updateOrCreate(
                ['user_id' => $user->id, 'type' => $validated['type']],
                [
                    'name' => $validated['name'],
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude'],
                ]
            );
        } else {
            $place = SavedPlace::create([
                'user_id' => $user->id,
                'name' => $validated['name'],
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'type' => 'favorite',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Place saved successfully',
            'data' => $place,
        ], 201);
    }

    /**
     * Remove a saved place.
     */
    public function destroy($id): JsonResponse
    {
        $user = Auth::user();
        $place = SavedPlace::where('user_id', $user->id)->find($id);

        if (!$place) {
            return response()->json([
                'success' => false,
                'message' => 'Saved place not found',
            ], 404);
        }

        $place->delete();

        return response()->json([
            'success' => true,
            'message' => 'Saved place deleted successfully',
        ]);
    }
}
