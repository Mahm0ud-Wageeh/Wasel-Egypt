# Wasel Egypt — UI/UX Design Specification

Version 1.0 · Source of truth: Wasel Egypt backend (Laravel 12 API, audited 2026-09-04, 218 tests green)

---

## 1. Product Visual Direction

- **Modern** — flat surfaces, generous whitespace, soft elevation; no skeuomorphism.
- **Clean** — one primary action per screen, progressive disclosure, 8-pt spacing grid.
- **Trustworthy** — calm institutional blue for structure and actions, verified-check visual language for moderated content, always-visible state (loading / empty / error).
- **Egypt-focused** — warm sand-tinted neutrals, a gold accent inspired by Egyptian sandstone, and the "Cairo" typeface (free Google Font, full Latin + Arabic support) as the brand face. Transit mode colors echo Cairo's visual transit language (red metro, blue bus).
- **Mobile-first & responsive** — every passenger screen is designed at 390×844 first, then expanded to a 1440 desktop shell (two-column where useful). Admin is desktop-first (1440) with a usable tablet fallback (1024).

## 2. Design System

### 2.1 Color tokens (Figma variables: `color/*`)

| Token | Value | Use |
|---|---|---|
| primary/900 | #0E3A5F | Headings on light, pressed states |
| primary/700 | #14558B | App bar, nav active |
| primary/600 | #1A6BB0 | **Primary buttons, links, focus** |
| primary/500 | #2280CC | Hover, icons |
| primary/100 | #D8E9F7 | Focus ring, selected chips |
| primary/50 | #EFF6FC | Selected row bg, subtle fills |
| accent/600 | #B98A2F | Gold accent — highlights, brand details |
| accent/100 | #F6ECD4 | Accent fills |
| nile/600 | #0E7C7B | Secondary accent (map water/route alt) |
| success/700 | #2E7D32 | Success text/icon |
| success/50 | #E6F2E7 | Success bg |
| warning/700 | #B26A00 | Warning text/icon |
| warning/50 | #FFF3E0 | Warning bg |
| error/700 | #C62828 | Error text/icon, destructive |
| error/50 | #FDE9E9 | Error bg |
| ink/900 | #16222E | Body text |
| ink/700 | #3D4C5C | Secondary text, labels |
| ink/500 | #64748B | Muted text, icons |
| ink/300 | #B8C2CE | Disabled, placeholders |
| line | #E3E8EE | Borders, dividers |
| surface | #FFFFFF | Cards, sheets |
| bg/page | #F7F9FB | App background |
| bg/sand | #FAF6EF | Warm section background (Egypt touch) |

**Transit mode colors** (chips, map lines, leg badges — Figma variables `color/mode/*`):

| Mode | Hex | | Mode | Hex |
|---|---|---|---|---|
| metro | #C62828 | | minibus | #E07C00 |
| rail | #6A3FA0 | | microbus | #00897B |
| bus | #1565C0 | | walking | #6B7280 |

**Status colors:** report → `pending` warning, `verified` success, `rejected` error, `resolved` nile/600. Active journey → `active` primary, `deviated` error, `rerouted` accent/600, `completed` success, `cancelled` ink/500. Deviation severity → low success, medium warning, high error. Notification priority → normal ink/500, high warning, urgent error.

### 2.2 Typography ("Cairo", Google Font, Latin + Arabic; fallback Inter, system-ui)

| Style | Size/Line | Weight | Use |
|---|---|---|---|
| display | 36/44 | 700 | Landing hero |
| h1 | 24/32 | 700 | Screen titles |
| h2 | 20/28 | 600 | Section titles, card titles |
| h3 | 18/26 | 600 | List item titles |
| body-lg | 16/24 | 400 | Primary body |
| body | 14/22 | 400 | Default body |
| label | 13/18 | 500 | Input labels, nav labels |
| caption | 12/16 | 500 | Timestamps, badges, meta |
| mono-num | 14/20 | 600 | Times, distances, fares (tabular) |

### 2.3 Spacing (4-pt scale)

`4, 8, 12, 16, 20, 24, 32, 40, 48` — screen gutter 16 (mobile) / 40 (desktop); card padding 16; section gap 24; list item padding 12×16.

### 2.4 Radius

`sm 8` (inputs, chips) · `md 12` (buttons, small cards) · `lg 16` (cards, sheets) · `xl 24` (modals, hero cards) · `pill 999` (badges, FAB) · phone frame 40.

### 2.5 Shadows (Figma effects)

- `shadow/sm`: 0 1px 2px rgba(22,34,46,.06)
- `shadow/md`: 0 4px 12px rgba(22,34,46,.08) — cards, app bar
- `shadow/lg`: 0 12px 32px rgba(22,34,46,.14) — bottom sheets, modals
- Focus: 3px primary/100 ring + 1.5px primary/600 border

### 2.6 Components

- **Buttons** — primary (primary/600 bg, white text), secondary (surface bg, 1px line border, ink/900 text), ghost (transparent, primary/600 text), danger (error/700). Sizes: sm 32, md 44, lg 52. States: default, hover (+4% darken), pressed (−6%), disabled (ink/300 bg/40% text), loading (spinner + label).
- **Inputs** — 44px, radius md, 1px line border; label above (13/500 ink/700); placeholder ink/300; focus ring; error (error/700 border + 12px helper below); success (check icon); disabled.
- **Cards** — surface, radius lg, shadow/sm, 16 padding; variant `interactive` (shadow/md, pressed scale .98); variant `flat` (1px line border).
- **Badges** — pill, 12/600, 4×8 padding, tinted bg + 700 text (status/severity/priority/mode sets above).
- **Alerts** — radius md, tinted 50 bg, 700 icon, title 14/600, body 13; four severities; optional action button; `inline` and `banner` variants.
- **Navigation** — Mobile: top app bar (title + back + overflow) and bottom tab bar (5 tabs: Home, Search, Reports, Notifications [badge dot], Profile; active = primary/700 icon+label, inactive ink/500; center Search raised as a pill FAB). Desktop: top navbar (logo, nav links, notification bell, avatar menu) + optional left rail in admin.
- **Map UI elements** — map canvas (bg #E8ECEF, roads #FFFFFF, water nile/100 #D5ECEC, parks #E6F2E7); route polyline 5px in mode color (dashed grey for walking, red dashed for deviation corridor); stop marker (10px white dot, 2px mode-color ring; selected = 14px + shadow); user location (primary/600 dot + pulsing 24px halo); deviation marker (error triangle pin); next-stop banner; bottom sheet (radius xl top, drag handle, snap points 30%/60%); map controls (44px white round buttons: recenter, layers); ETA pill (floating, mono-num).

### 2.7 Iconography
24px grid, 1.5px stroke, rounded caps (Material Symbols style). Custom mode glyphs: metro (M in circle), bus, walking figure, recovery (route split), verified check.

---

## 3. User Flows (Passenger)

```
Auth:    Landing → Register | Login → (forgot/reset) → Home
Journey: Home → Journey Search (origin/dest/time/prefs) → Search Results (map+list, scored options)
       → Journey Details (legs, transfers, fare, score) → Start Journey (POST journeys/{id}/start)
Track:  Active Journey (map, current leg, next stop, progress %, location auto-post)
       → [off-route / late] Deviation screen (severity, can_continue)
            → Resume (POST resume) if can_continue
            → Recovery Options (GET/POST recovery-options) → select → Reroute accepted (POST accept) → continues on new plan
       → Complete (POST complete) → Summary → Home
Reports: Reports tab → Submit report (type, description, location, media, target stop/route)
       → pending → [moderator verifies] → verified → appears in public feed → resolved
Notifications: bell → list (unread badge) → mark read / read all / delete
Profile: user info, trust score, preferences (max walk, max transfers, preferred/avoided modes, walk speed, wheelchair), my reports, logout
```

## 4. Admin Flow

```
Login (role=admin) → Admin Dashboard (KPIs) → Analytics (8 metric pages, date range)
Reports Moderation (queue pending → verify/reject/resolve with notes; history)
Users (list, search, view trust, delete)
Roles & Permissions (roles list, permission matrix, assign/remove)
```

Admin routes use `role:admin`; moderation uses `role:moderator,admin` — UI hides these areas for other roles and renders a 403 state if deep-linked.

## 5. Screen-by-Screen Specification

> Each screen: purpose / user actions / API dependency / navigation / states. All endpoints prefixed `/api/v1`, Bearer token auth (Sanctum).

### 5.1 Landing / Home (passenger home)
- **Purpose:** launchpad — start a search, see active journey, active service alerts, quick links.
- **Actions:** tap search bar, tap active-journey card (resume tracking), view alert banners, open tabs.
- **API:** `GET /service-alerts/active`, `GET /active-journeys` (resume card), `GET /notifications/unread-count` (badge), `GET /public-routes` (explore chips).
- **Navigation:** → Journey Search, → Active Journey, → Alerts detail, tabs.
- **States:** loading skeletons; empty (no active journey → "Plan your first trip" card; no alerts → hidden section); error (retry banner); logged-out variant (hero + login/register CTAs).

### 5.2 Login
- **Purpose:** authenticate.
- **Actions:** enter email/password, submit, forgot password, go to register.
- **API:** `POST /auth/login` → `{data:{user, token}}`; token stored, `GET /auth/user` to hydrate.
- **Navigation:** → Home; → Register; → Forgot Password.
- **States:** validation (inline field errors), submitting (button loading), 401 error alert ("Invalid credentials"), success → redirect. Desktop: split layout with brand panel.

### 5.3 Register
- **Purpose:** create account.
- **Actions:** name, email, phone (optional), password + confirm; submit; link to login.
- **API:** `POST /auth/register` (validates `password confirmed`, unique email; auto-assigns `user` role, returns token).
- **Navigation:** → Home on success; → Login.
- **States:** field validation (min 8 password, confirmed), 422 server errors mapped to fields, submitting, success.

### 5.4 Forgot / Reset Password
- **Purpose:** recover access.
- **Actions:** request reset link (email); open link → new password + confirm → reset.
- **API:** `POST /auth/forgot-password`; `POST /auth/reset-password` (token from email).
- **Navigation:** → Login (success state shows confirmation).
- **States:** success confirmation, invalid/expired token error, validation, submitting.

### 5.5 Journey Search
- **Purpose:** define origin/destination and constraints.
- **Actions:** set origin/destination (map picker or saved/typed location → lat/lng), departure time (default now), toggles/overrides: max transfers (0–5), max walk (100–10000 m), preferred/avoided modes (chips), alternatives count (1–5). Run search.
- **API:** `POST /journeys/search` (returns ranked options; not persisted). Location search uses public `GET /stops` + `GET /governorates`/`GET /areas` for pickers.
- **Navigation:** → Search Results.
- **States:** validation (required coords, ranges), locating (GPS spinner), searching (map skeleton + shimmer list), no results (empty state with advice: widen walk radius / allow transfers), error.

### 5.6 Search Results
- **Purpose:** compare scored journey options.
- **Actions:** list ⇄ map toggle; tap option → details; sort implicit (score ascending); re-search; save option (POST journeys).
- **API:** options from `POST /journeys/search`; save via `POST /journeys` with same params + `option_index`.
- **Navigation:** → Journey Details; back → Search.
- **States:** loading shimmer cards; empty (see 5.5); each option card shows: total duration, transfers badge, walk distance, fare (if present), score, mode strip (colored dots per leg mode), departure/arrival times. Error alert with retry.

### 5.7 Journey Details
- **Purpose:** inspect one option leg by leg and start it.
- **Actions:** expand legs (mode icon, from/to stop, times, duration), transfers section (waiting / transfer_walk), fare, reliability, score; **Save journey**; **Start journey**; view alternatives (`GET journeys/{id}/alternatives`).
- **API:** `POST /journeys` (persist chosen `option_index`), `GET /journeys/{id}` (legs, transfers), `GET /journeys/{id}/alternatives`, `POST /journeys/{id}/start`.
- **Navigation:** → Active Journey (on start); back → Results.
- **States:** loading; saved confirmation; already-active conflict (409 → "You already have an active journey" alert with Go to Active Journey action); map preview with full polyline.

### 5.8 Active Journey (tracking)
- **Purpose:** live progress on the saved plan.
- **Actions:** view map (user dot, route, next stop), progress %, current leg, next stop card; **Complete**; **Cancel** (confirm); location auto-posted (device GPS → `POST /active-journeys/{id}/location`).
- **API:** `GET /active-journeys` / `GET /active-journeys/{id}` (tracking block: current_leg, progress_percent, nearest_stop, is_stop_event, next_stop, deviation), `POST .../location`, `POST .../complete`, `POST .../cancel`, `GET .../progress` (history).
- **Navigation:** → Deviation/Recovery (pushed when `status=deviated`); Home on complete/cancel.
- **States:** active (default); deviated banner → auto-navigate; rerouted (accent banner "New plan active", leg index reset); completed summary; cancelled confirmation; permission-denied for location (manual "I'm at stop" fallback note — GPS optional).

### 5.9 Deviation / Recovery
- **Purpose:** explain the deviation and recover the trip.
- **Actions:** read deviation card (type badge off_route/missed_stop, severity, description, expected stop, can_continue); **Resume journey** (if can_continue) or **View recovery options**; each option card: delay estimate, legs summary, score → **Use this route** (accept); cancel journey.
- **API:** `POST /active-journeys/{id}/resume` (409 when high severity), `POST .../recovery-options` (generate; returns ranked options w/ `estimated_delay_sec`), `POST .../recovery-options/{recoveryId}/accept` (→ status rerouted), `GET .../deviations` (history + recovery routes).
- **Navigation:** accept/resume → Active Journey (rerouted); stay → options list.
- **States:** deviated banner (error); high severity locks Resume (tooltip "Reroute required"); generating options (skeleton ×3); no options generated (empty state: "No recovery options from this point — cancel or wait"); already-accepted (409 → return to Active Journey); zero recovery options message from API.

### 5.10 Community Reports
- **Purpose:** submit and track crowd-sourced transit reports.
- **Actions:** filter (All/My), submit report (type picker grid of the 11 types, description ≥10 chars, auto location + optional stop/route target, ≤3 media URLs), view status badges + moderation notes, delete own pending report.
- **API:** `POST /reports` (409 duplicate/spam surfaced as friendly alert), `GET /reports` (own; moderators see all), `DELETE /reports/{id}`, `GET /reports/{id}/moderations` (history), public feed `GET /community-reports`.
- **Navigation:** detail → moderation history; tab-level.
- **States:** pending (warning badge "Under review"), verified (success + public), rejected (error + note), resolved (nile); duplicate alert (409); spam limit alert (409); empty list; loading; type grid with icons.

### 5.11 Notifications
- **Purpose:** event inbox.
- **Actions:** open item (marks read), mark all read, delete (swipe), filter unread/type/priority, tap payload → deep link (active journey / report).
- **API:** `GET /notifications` (meta.unread_count), `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}`.
- **Navigation:** journey notifications → Active Journey; report notifications → Reports.
- **States:** unread dot + tinted row, priority badges (high/urgent), empty inbox, loading, delete undo not available (confirm on delete).

### 5.12 Profile
- **Purpose:** identity, trust, preferences, account actions.
- **Actions:** view name/contact + trust score card (score, level badge, verified/rejected counts); edit preferences (max walk, max transfers, walk speed slow/average/fast, preferred/avoided modes, wheelchair accessible); change password (update user); logout.
- **API:** `GET /auth/user`, `GET /users/{id}/trust`, `PUT /users/{id}/preferences`, `PUT /users/{id}` (self), `POST /auth/logout`.
- **Navigation:** → Notifications; → My Reports; logout → Login.
- **States:** loading, saved confirmation toast, validation, 403 (viewing another user's trust), logout confirm.

### 5.13 Admin Dashboard (desktop)
- **Purpose:** operational overview.
- **Actions:** view KPI cards (users, journeys, in-flight, searches, deviations, pending reports, notifications), rates (completion/cancellation/approval), avg trust; jump to section; date-range filter.
- **API:** `GET /admin/analytics/dashboard`.
- **Navigation:** → Analytics pages, → Admin Reports, → Admin Users.
- **States:** loading skeletons; zero data ("No activity yet"); date filter applied; 403 for non-admin.

### 5.14 Admin Analytics (8 tabs)
- **Purpose:** drill into journeys, deviations, usage, reports, trust, notifications, modes.
- **Actions:** switch metric tabs, set from/to, read tables + simple bar/line visualizations (built from returned series/maps), export later.
- **API:** `GET /admin/analytics/{journeys,deviations,usage,reports,trust,notifications,modes}` (exact payloads documented in §6).
- **States:** loading, empty (`[]` → "No data in range"), invalid range 422 inline.

### 5.15 Admin Reports Moderation
- **Purpose:** verify/reject/resolve queue with full context.
- **Actions:** filter by status/type; open report (author trust card, media, location, moderation history); **Verify / Reject / Resolve** with notes; view audit trail.
- **API:** `GET /reports` (staff view incl. all users + filters), `GET /reports/{id}`, `POST /reports/{id}/moderate` (verify/reject/resolve + notes; 409 terminal/self/invalid-transition), `GET /reports/{id}/moderations`.
- **Navigation:** queue → detail → back.
- **States:** empty queue, terminal state (action buttons disabled with reason), 409 alert (already moderated), 403 (non-moderator), author trust shown, moderation history timeline.

### 5.16 Admin Users / Roles & Permissions
- **Purpose:** user management and RBAC.
- **Actions:** users list (search, view trust via user detail), delete user (confirm; cannot delete self); roles CRUD, assign/remove permissions.
- **API:** `GET /admin/users`, `DELETE /admin/users/{id}`, `GET/POST/PUT/DELETE /admin/roles…`, `POST /admin/roles/{role}/assign-permission`, `DELETE /admin/roles/{role}/remove-permission/{permission}`, `/admin/permissions`.
- **States:** empty, confirm dialogs, 403 self-delete error, validation for role names.

### State matrix (applies to every screen)

| State | Treatment |
|---|---|
| Loading | Skeleton cards / spinner in button; never blank |
| Empty | Illustration + one-line reason + primary suggestion action |
| Error | Inline alert (error/50) with retry; 422 field errors under inputs |
| Success | Toast (top) + state change; key confirmations also inline |
| Validation | Red border + helper text; first error focused |
| Unauthorized 401 | Redirect to Login with return path |
| Forbidden 403 | "No access" illustration + explanation (role-gated areas, admin deep links) |
| Conflict 409 | Warning alert with the exact API message + corrective action (e.g., "Go to active journey") |

## 6. Backend/API ↔ Screen Mapping (summary)

| Screen | Endpoints |
|---|---|
| Landing/Home | service-alerts/active, active-journeys, notifications/unread-count, public-routes |
| Login/Register/Forgot/Reset | auth/login, auth/register, auth/forgot-password, auth/reset-password, auth/user |
| Journey Search | journeys/search, stops, governorates, areas |
| Search Results | journeys/search, journeys (POST) |
| Journey Details | journeys/{id}, journeys/{id}/alternatives, journeys/{id}/start |
| Active Journey | active-journeys, active-journeys/{id}, …/location, …/complete, …/cancel, …/progress |
| Deviation/Recovery | active-journeys/{id}/deviations, …/resume, …/recovery-options (GET/POST), …/recovery-options/{id}/accept |
| Reports | reports (GET/POST), reports/{id} (GET/DELETE), reports/{id}/moderations, community-reports (public) |
| Notifications | notifications, notifications/unread-count, notifications/{id}/read, notifications/read-all, notifications/{id} (DELETE) |
| Profile | auth/user, users/{id}/trust, users/{id}/preferences (PUT), users/{id} (PUT), auth/logout |
| Admin Dashboard | admin/analytics/dashboard |
| Admin Analytics | admin/analytics/{journeys,deviations,usage,reports,trust,notifications,modes} |
| Admin Reports | reports (staff GET), reports/{id}, reports/{id}/moderate, reports/{id}/moderations |
| Admin Users/RBAC | admin/users, admin/roles, admin/permissions, assign/remove-permission |

Enum values the UI must use verbatim: report types (`delay, early_arrival, overcrowding, cleanliness, safety, stop_damage, signage_issue, accessibility, suggestion, complaint, other`); statuses; journey statuses (`active, deviated, rerouted, completed, cancelled`); modes (`walking, metro, bus, minibus, microbus, rail`); deviation severity (`low, medium, high`); priorities (`low, normal, high, urgent`); walk speeds (`slow, average, fast`).

## 7. Figma Structure (recreate 1:1)

```
Wasel Egypt — UI/UX
├─ 00 Cover & Changelog
├─ 01 Foundations
│  ├─ Variables: color/*, color/mode/*, radius/*, spacing/* (Figma variables)
│  ├─ Type Scale (Cairo)
│  ├─ Elevation & Radius
│  └─ Components (buttons, inputs, cards, badges, alerts, nav, map kit)
├─ 02 Passenger / Mobile (390×844 frames, 40 spacing)
│  ├─ Onboarding: Landing (guest), Landing (logged-in), Login, Register, Forgot, Reset
│  ├─ Journey: Search, Search – Loading, Search – No results, Results, Details, Start sheet
│  ├─ Tracking: Active, Deviation (medium), Deviation (high), Recovery Options, Rerouted, Completed, Cancelled
│  ├─ Reports: List (empty/loaded), Submit, Detail + History
│  ├─ Notifications: List (unread/read), Empty
│  └─ Profile: Profile, Preferences, Trust card, 403 state
├─ 03 Admin / Desktop (1440×900 frames)
│  ├─ Dashboard, Analytics–Journeys, Analytics–Reports, Reports Moderation Queue,
│  │  Moderation Detail, Users, Roles & Permissions, 403 state
├─ 04 States Gallery (loading/empty/error/success/validation/403 per pattern)
└─ 05 Prototype Flows (wired: search→results→details→start→track→deviation→recovery→reroute→complete)
```
Component naming: `Btn/Primary/Md`, `Input/Default`, `Card/Journey/Option`, `Badge/Status/Verified`, `Map/RouteLine`, `Nav/Tabbar`, `AppBar/Back`.

## 8. Missing Design Items / Open Questions

- Arabic (RTL) localization is typography-ready (Cairo) but RTL mirrored layouts are not yet drawn — recommend phase 2.
- Saved trips / favorite locations: backend tables exist (`saved_trips`, `favorite_locations`) but no API endpoints yet — screens intentionally omitted until the backend exposes them.
- Offline/low-connectivity tracking behavior (background GPS policy) needs a product decision.
- Media upload for reports: backend stores URLs only — file picker + uploader design pending a storage endpoint.
- Real map tiles/SDK choice (e.g., Mapbox/MapLibre) affects exact map styling tokens.
