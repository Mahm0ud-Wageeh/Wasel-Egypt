# BrightPath Notifications System — Verified Wiring (2026-08-21)

The BrightPath/Namaa Journey app already has a **complete, real notification
system** on the backend. The recurring user misconception is that
notifications are "just decoration" — they are not. This file records the
verified architecture so a future session audits before rebuilding.

## Backend (all under `backend/src/`)

### Models (`prisma/schema.prisma`)
- `Notification` — fields: `schoolId`, `senderId`, `type`, `titleAr`/`titleEn`,
  `bodyAr`/`bodyEn`, `metadata` (JSON), `targetRole`, `targetUserId`,
  `isBroadcast`, `sentAt`.
- `NotificationRead` — join `{ notificationId, userId, readAt }`; read state is
  tracked per-user, so the same broadcast can be read by one user and unread
  for another.

### Service (`modules/notifications/notifications.service.js`)
- `createNotification(input)` — single write entry point used by every event.
- `listForUser(userId, query)` — query supports `page`, `limit`, `unreadOnly`.
  Returns `{ data, meta: { total, page, totalPages, hasNextPage, hasPrevPage } }`.
- `markRead` / `markAllRead` — upsert into `NotificationRead`.
- `visibilityWhere(ctx)` — the scoping rule:
  - `SUPER_ADMIN` → sees everything.
  - everyone else → `targetUserId === ctx.userId` OR
    (`isBroadcast` AND `schoolId` in user's schools AND
    (`targetRole` is null OR matches user's db role)).

### Routes (`modules/notifications/notifications.routes.js`, `authenticate` guarded)
- `GET /notifications` (query: page/limit/unreadOnly)
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`

### Real events that already call `createNotification`
| Source | target | type |
|---|---|---|
| `attendance/attendance.service.js` (daily-review note) | `targetUserId: guardian.userId` | `DAILY_REVIEW` |
| `attendance/attendance.service.js` (absence/late) | `targetUserId: guardian.userId` | `ATTENDANCE_ALERT` |
| `announcements/announcements.service.js` (school/staff) | `isBroadcast: true` + `targetRole` | `ANNOUNCEMENT` |
| `announcements/announcements.service.js` (class) | per `classAudienceUserIds` → `targetUserId` | `ANNOUNCEMENT` |
| `messages/messages.service.js` | `targetUserId: receiverId` | `NEW_MESSAGE` |
| `assignments/assignments.service.js`, `dashboard/`, `jobs/assignmentReminders.job.js` | mixed | various |

### Live delivery (WebSocket)
- `server.js` + `messages/messages.controller.js` emit `notification:push` on
  room `user:<id>`.
- Frontend `features/messaging/api.js` `createMessagingSocket` listens on
  `notification:push`; `AppHeader` and `Dashboard` consume it to prepend
  live notifications and bump the unread count. No polling hack needed.

## Frontend (all under `frontend/src/`)

### Existing (already present)
- `shared/components/NotificationDropdown.jsx` — header bell; calls
  `apiListNotifications`, `apiMarkNotificationRead`, `apiMarkAllNotificationsRead`
  (from `app/api/schoolClient.js`). Shows last ~10 with icons + routing.
- `shared/layout/AppHeader.jsx` — loads unread count + opens socket.
- `app/api/schoolClient.js` — `apiListNotifications({ page, limit, unreadOnly })`,
  `apiMarkNotificationRead(id)`, `apiMarkAllNotificationsRead()`.

### Added this session — Notifications Center
- `features/notifications/NotificationsCenter.jsx` (route `/dashboard/notifications`):
  - Loads via `apiListNotifications`; **server-side** pagination (`Load more`
    button; backend `page`/`limit`/`unreadOnly`).
  - **Client-side** filters: status (all/unread/read), type (message/
    announcement/assignment/attendance/grade), and free-text search — because
    the backend query does NOT support type/search.
  - Mark-all-read + mark-single-on-click + navigate to the item's route.
  - Dark-mode safe (Tailwind `dark:` classes, same as the dropdown).
- `App.jsx` — added `<Route path="notifications" element={<NotificationsCenter />} />` inside the `/dashboard` layout.
- `AppSidebar.jsx` — added a Notifications nav item in `othersItems` (visible to
  **every** role).
- `NotificationDropdown.jsx` — added a footer `View all` button →
  `navigate('/dashboard/notifications')`.
- `i18n.js` — added EN/AR keys: `notificationsCenterTitle`, `notificationsCenterDesc`,
  `noNotificationsMatch`, `viewAllNotifications`, `filterAll/Unread/Read`,
  `searchNotifications`, `typeAll/Message/Announcement/Assignment/Attendance/Grade`,
  `loadMore`, `resultsCount`, `pageInfo`.

## Gotchas
- Demo mode (no `bpProfile`) → no notifications: the socket/API need a logged-in
  token, and `AppSidebar` deliberately leaves demo unread badges at 0. Tell the
  user to log in (api mode) to see real notifications.
- The `visibilityWhere` `targetRole` comparison uses `toDbRole(ctx.role)` — keep
  db-role enums (`TEACHER`, `PARENT`, `STUDENT`, `ADMIN`, `SUPER_ADMIN`) aligned
  between sender and viewer when adding a new event type.
- If asked to "add notifications", almost always the task is a **new event**
  calling the existing `createNotification`, or a **new UI surface** — not a new
  backend module.
