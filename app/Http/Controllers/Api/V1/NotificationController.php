<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Requests\NotificationListRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends AuthController
{
    public function __construct(private NotificationService $notifications)
    {
    }

    /**
     * List the authenticated user's notifications with filters.
     */
    public function index(NotificationListRequest $request)
    {
        $query = Notification::where('user_id', Auth::id());

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        if ($request->filled('type')) {
            $query->where('data_payload->type', $request->input('type'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        $notifications = $query->orderBy('sent_at', 'desc')->orderBy('id', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => NotificationResource::collection($notifications->items()),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread_count' => $this->notifications->unreadCount(Auth::id()),
            ],
        ]);
    }

    /**
     * Unread count for the authenticated user.
     */
    public function unreadCount()
    {
        return response()->json([
            'success' => true,
            'data' => ['count' => $this->notifications->unreadCount(Auth::id())],
        ]);
    }

    /**
     * Mark a single notification as read (owner only, idempotent).
     */
    public function markRead($id)
    {
        $notification = $this->authorizeNotification($id);
        if ($notification instanceof JsonResponse) {
            return $notification;
        }

        $this->notifications->markRead($notification);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'data' => new NotificationResource($notification),
        ]);
    }

    /**
     * Mark every unread notification as read.
     */
    public function markAllRead()
    {
        $count = $this->notifications->markAllRead(Auth::id());

        return response()->json([
            'success' => true,
            'message' => 'Notifications marked as read',
            'data' => ['marked_read' => $count],
        ]);
    }

    /**
     * Delete a notification (owner only).
     */
    public function destroy($id)
    {
        $notification = $this->authorizeNotification($id);
        if ($notification instanceof JsonResponse) {
            return $notification;
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted successfully',
        ]);
    }

    /**
     * Ownership guard: notifications are strictly personal.
     *
     * @return Notification|JsonResponse
     */
    private function authorizeNotification($id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $notification = Notification::find($id);

        if (!$notification) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        if ($notification->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return $notification;
    }
}
