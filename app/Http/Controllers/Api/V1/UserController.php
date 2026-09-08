<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     * Only for admins.
     */
    public function index()
    {
        $users = User::with('roles.permissions')->get();

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    /**
     * Display the specified user.
     */
    public function show($id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user can view this user (self or admin)
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        if ($authUser->id !== $user->id && !$authUser->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $user->load('roles.permissions')
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user can update this user (self or admin)
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        if ($authUser->id !== $user->id && !$authUser->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20',
            'status' => 'sometimes|required|in:active,inactive,suspended',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $user->load('roles.permissions')
        ]);
    }

    /**
     * Remove the specified user from storage.
     * Only for admins.
     */
    public function destroy(User $user)
    {
        // Prevent deleting yourself
        if ($user->id === Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete yourself'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Get user preferences.
     */
    public function preferences($id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user can view this user's preferences (self or admin)
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        if ($authUser->id !== $user->id && !$authUser->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $preferences = $user->preferences;

        return response()->json([
            'success' => true,
            'data' => $preferences
        ]);
    }

    /**
     * Update user preferences.
     */
    public function updatePreferences(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Check if the authenticated user can update this user's preferences (self or admin)
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        if ($authUser->id !== $user->id && !$authUser->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'notify_journey_planned' => 'sometimes|boolean',
            'notify_journey_started' => 'sometimes|boolean',
            'notify_deviation_detected' => 'sometimes|boolean',
            'notify_recovery_available' => 'sometimes|boolean',
            'notify_journey_completed' => 'sometimes|boolean',
            'notify_report_status_change' => 'sometimes|boolean',
            'notify_service_alert_affected' => 'sometimes|boolean',
            'notify_weekly_summary' => 'sometimes|boolean',
            'quiet_hours_enabled' => 'sometimes|boolean',
            'quiet_hours_start' => 'sometimes|nullable|date_format:H:i:s',
            'quiet_hours_end' => 'sometimes|nullable|date_format:H:i:s',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Get or create preferences
        $preferences = $user->preferences ?? $user->preferences()->create([]);
        $preferences->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Preferences updated successfully',
            'data' => $preferences
        ]);
    }
}