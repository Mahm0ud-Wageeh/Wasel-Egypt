<?php

namespace App\Services\Notifications;

use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * In-app notification creation and read-state management.
 *
 * Notifications are stored in the existing notifications table with
 * sent_via = 'inapp'. Each notification carries a machine-readable 'type'
 * inside its data_payload along with context ids, which is also used for
 * deterministic de-duplication via an optional dedupe key.
 *
 * Only the type registry below defines titles/bodies/priorities — identical
 * inputs always produce identical notifications.
 */
class NotificationService
{
    /** type => [title, body template, default priority]. Body supports :placeholder substitution from the payload. */
    public const TYPES = [
        'journey_started' => [
            'title' => 'Journey started',
            'body' => 'Your journey has started. Safe travels!',
            'priority' => 'normal',
        ],
        'journey_deviation' => [
            'title' => 'Deviation detected',
            'body' => 'An :label deviation (severity: :severity) was detected on your active journey.',
            'priority' => 'high',
        ],
        'recovery_options_ready' => [
            'title' => 'Recovery options ready',
            'body' => ':count recovery option(s) are available for your deviated journey.',
            'priority' => 'high',
        ],
        'journey_rerouted' => [
            'title' => 'Journey rerouted',
            'body' => 'Your journey was rerouted onto a new plan. Keep tracking from your device.',
            'priority' => 'normal',
        ],
        'journey_completed' => [
            'title' => 'Journey completed',
            'body' => 'Your journey is complete. Planned duration: :duration minutes.',
            'priority' => 'normal',
        ],
        'journey_cancelled' => [
            'title' => 'Journey cancelled',
            'body' => 'Your active journey was cancelled.',
            'priority' => 'normal',
        ],
        'report_verified' => [
            'title' => 'Report verified',
            'body' => 'Your community report was verified by a moderator and is now publicly visible.',
            'priority' => 'normal',
        ],
        'report_rejected' => [
            'title' => 'Report rejected',
            'body' => 'Your community report was rejected by a moderator.',
            'priority' => 'normal',
        ],
        'report_resolved' => [
            'title' => 'Report resolved',
            'body' => 'Your community report was marked as resolved. Thank you for helping improve transit!',
            'priority' => 'normal',
        ],
    ];

    /**
     * Create an in-app notification.
     *
     * @param string $type One of the registered types.
     * @param array $payload Context merged into data_payload (plus 'type').
     * @param string|null $dedupeKey When given, a notification with the same
     *                               dedupe key for the user is not duplicated
     *                               and null is returned instead.
     */
    public function send(int $userId, string $type, array $payload = [], ?string $dedupeKey = null, ?Carbon $sentAt = null): ?Notification
    {
        if (!isset(self::TYPES[$type])) {
            throw new \InvalidArgumentException("Unknown notification type '{$type}'.");
        }

        if ($dedupeKey !== null) {
            $exists = Notification::where('user_id', $userId)
                ->where('data_payload->dedupe_key', $dedupeKey)
                ->exists();

            if ($exists) {
                return null;
            }
        }

        $spec = self::TYPES[$type];
        $body = str_replace(
            collect($payload)->keys()->map(fn ($key) => ':'.$key)->all(),
            array_map(fn ($value) => (string) $value, array_values($payload)),
            $spec['body'],
        );

        return Notification::create([
            'user_id' => $userId,
            'title' => $spec['title'],
            'body' => $body,
            'data_payload' => array_merge($payload, [
                'type' => $type,
                'dedupe_key' => $dedupeKey,
            ]),
            'sent_via' => 'inapp',
            'sent_at' => $sentAt ?? Carbon::now(),
            'read_at' => null,
            'priority' => $payload['priority'] ?? $spec['priority'],
        ]);
    }

    /**
     * Unread count for a user.
     */
    public function unreadCount(int $userId): int
    {
        return Notification::where('user_id', $userId)->whereNull('read_at')->count();
    }

    /**
     * Mark a single notification as read (idempotent).
     */
    public function markRead(Notification $notification): Notification
    {
        if ($notification->read_at === null) {
            $notification->update(['read_at' => Carbon::now()]);
        }

        return $notification->refresh();
    }

    /**
     * Mark every unread notification of a user as read.
     */
    public function markAllRead(int $userId): int
    {
        return Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => Carbon::now()]);
    }
}
