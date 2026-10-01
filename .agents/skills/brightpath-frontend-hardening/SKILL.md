---
name: brightpath-frontend-hardening
description: Use when hardening, shaping, optimizing, or polishing a BrightPath (Namaa Journey) frontend page — or fixing dark-mode text-visibility, inline-style, or broken-layout issues in this React+Vite bilingual (AR/EN, RTL) school platform. Covers the project styling contract, the Forest Night dark-theme token mapping (which tokens are dark-safe vs forbidden), the class-based CSS migration workflow, and the build+detector+eslint verification sequence.
version: 1.0.0
---

# BrightPath (Namaa Journey) Frontend Hardening

Use this skill when you are asked to `impeccable harden` / `shape` / `optimize` / `polish` / `distill` / `colorize` / `adapt` a BrightPath frontend page, or when you find a BrightPath React component with dark-mode text-visibility problems, inline styles, or a broken/unstyled layout. The product is a bilingual (Arabic/English, RTL) K-12 school platform and **dark-mode correctness is a repeatedly-stated hard requirement** — broken dark text is a known, reported pain point.

## Project styling contract (from CLAUDE.md — enforced, not optional)
- Style with the project's CSS classes only. **No inline `style={...}` objects in components, and no Tailwind utility classes in component JSX.** Tailwind/PostCSS are kept only for the separate marketing landing build.
- Each feature owns a dedicated stylesheet `frontend/src/styles/<feature>.css`, imported once in the feature's entry component (e.g. `AttendancePage.jsx` does `import '../../styles/attendance.css'`). There is no global per-feature CSS import; the entry component must import it.
- Global CSS is loaded in `src/app/main.jsx`: `brightpath.css`, `rtl.css`, `responsive.css`, `index.css`, `forms.css`, `namaa-forest-night.css`.
- `DESIGN.md` (repo root) is the canonical token spec; `frontend/src/styles/index.css` holds the Tailwind `@theme` tokens, `brightpath.css` is the Namaa token bridge, `namaa-forest-night.css` is the dark theme. Read these before inventing visual values.

## The dark-mode token system (the part that breaks)
Dark mode is activated by `ThemeContext.jsx`, which adds `dark` (on `<html>`) and `dark-theme` (on `<body>`). `namaa-forest-night.css` provides overrides under both `:root[data-theme="namaa-forest-night"], .dark` AND `body.dark-theme`. So the dark theme swaps a specific set of semantic tokens; anything else keeps its light-only hardcoded value and goes invisible/broken in dark mode.

**Dark-safe tokens — defined AND overridden in namaa-forest-night.css. Use these:**
- Surfaces/text: `--white` (→ namaa-surface), `--gray-50` (→ namaa-bg), `--gray-100`/`--gray-200` (→ namaa-border), `--gray-300` (→ namaa-input), `--gray-400`/`--gray-500` (→ namaa-text-muted), `--gray-600`/`--gray-800` (→ namaa-text). The `--color-gray-50`..`-950` set is likewise swapped.
- Brand/action: `--color-action` (→ namaa-green `#74d84a`), `--color-action-strong` (`#23312c`), `--color-action-soft` (use `rgba(116,216,74,0.14)` in dark), `--color-paper` (→ namaa-bg).
- Accents: `--green-500` (→ namaa-green), `--amber-500` (→ namaa-amber), plus `--green-100/200`, `--amber-100/200`.
- Shape/shadow: `--radius` (0.75rem), `--radius-sm` (8px — defined in `brightpath.css`, NOT index.css), `--shadow-sm` (darkened in dark), `--shadow-md`, `--shadow-lg`.
- Status: `--color-success-600` (`#039855`, in `index.css`), `--color-warning-*`, `--color-danger-*`.

**Forbidden tokens — NEVER use in new code.** They are undefined in every CSS file, so they render only via their hardcoded light fallbacks → guaranteed dark-mode blindness:
`--bg-card`, `--text-color`, `--border-color`, `--text-muted`, `--action-green`, `--bg-surface-elevated`, `--action-green-light`, `--card-bg`, `--color-bg-surface`.

> Legacy note: project components like `ProfessionalDatePicker` (label uses `var(--text-color, #0f172a)`) and `bp-form-control` (forms.css, hardcoded `#f8fafc`/`#0f172a`) still do this, but they carry their own `body.dark-theme .bp-form-control` overrides. Reuse the *class*, don't replicate the raw values in new code.

See `references/dark-mode-tokens.md` for the full verified mapping.

## Migration workflow (inline styles → class-based)
1. Run `node .agents/skills/impeccable/scripts/context.mjs --target <entry-file>` to load PRODUCT.md / DESIGN.md context. Then read `CLAUDE.md`, the feature's files, and `namaa-forest-night.css`.
2. Before editing, load `reference/craft-floor.md` from the impeccable skill (quality floor + absolute bans).
3. Create `frontend/src/styles/<feature>.css`. Define classes using ONLY dark-safe tokens. Include: card surfaces, inputs (reuse `.bp-form-control` where sensible), buttons, chips, avatar circles, explicit states (loading / empty / disabled / saved), `:focus-visible` rings, a mobile breakpoint, and a `prefers-reduced-motion` block.
4. Import the CSS in the feature's entry component.
5. Replace every inline `style={...}` with a class. **Preserve all logic, copy, i18n (AR/EN + RTL), and behavior exactly** — hardening fixes tokens/structure, it does not rewrite product truth.

## Verification sequence (all must pass)
```sh
cd frontend
npm run build                                                  # vite build + prepare-sites-static; must exit 0
node .agents/skills/impeccable/scripts/detect.mjs --json <file>   # expect [] (no anti-patterns)
npx eslint <dir>                                              # 0 errors; react-hooks/exhaustive-deps warnings are acceptable
```
Then confirm the built CSS actually contains the new classes and the dark override, e.g.:
```sh
grep "dr-student-card\|body.dark-theme .daily-reviews-page" dist/assets/app-*.css
```

## Pitfalls
- The Hermes `search_files` tool parses a leading `--` in `pattern`/`path` as a CLI flag and errors ("unrecognized flag"). To find CSS custom properties, either drop the leading dashes or use the terminal: `grep -rn -e "--token:" src/styles/`.
- The impeccable detector CLI is `node .agents/skills/impeccable/scripts/detect.mjs`; `.claude/skills/impeccable` is only a symlink to it. Pass one file at a time for a clean `[]` JSON result.
- Don't "split the difference": keep the incumbent look but FIX the tokens; don't rewrite copy or add claims (brand voice is calm/encouraging; no fabricated testimonials or pilot schools).
- `--radius-sm` lives in `brightpath.css` (8px), not `index.css` — it IS available; just don't search for it only in index.css.
- ESLint's `react-hooks/exhaustive-deps` will warn (not error) about deps intentionally omitted to preserve original behavior — leave those as-is.
- **"White island" trap on shared components.** Modals, search dropdowns, and pickers rendered by a shared component (e.g. `GlobalStudentSearch`, `ProfessionalDatePicker`) often default to a hardcoded light surface (`#ffffff` / `#fdfbf7`). Each shared component needs its OWN `body.dark-theme .<scope>` overrides — the page-wide dark theme does not reach into a component that defines its own light background. Migrate the component to a dedicated `<feature>.css` (or append to an existing one) and add explicit dark overrides; do not rely on the page theme alone.
- **"Stale view" trap.** After editing a component's CSS (especially a NEW css file import added to a component), the running app keeps showing the old (light) version until a full reload. `npm run build` succeeding does NOT mean the user sees it — if they report "still white / still broken" with a screenshot, the fix is almost always correct in the build; tell them to **hard-refresh (Ctrl+Shift+R) or restart the dev server**. Do not re-edit correct code. Verify your change actually landed in `dist/assets/app-*.css` via grep before concluding the fix failed.
- **Student-list API trap (recurring, high-impact).** Several pages (attendance, daily-reviews, grades) hardcode mock rosters (`DEMO_STUDENTS`, `STUDENT_ROSTERS`) and decide mock-vs-API by the **class-id prefix** (`startsWith('demo-') || startsWith('class-')`), NOT by `sessionMode`. Because global search / cross-page navigation passes ids like `class-3b`, logged-in (api-mode) users get forced into mock mode and see only ~22 hardcoded students instead of the 74+ in the DB. **Fix pattern:** branch on `sessionMode === 'demo'` (or presence of an API token), not on id prefix; in api mode call `getClassStudents(classId)` / `apiListStudents({ search })` and fall back to mock only on error. For the `all` class scope, also hit the API (`apiListStudents`) rather than `Object.values(STUDENT_ROSTERS)`. See `references/student-list-api-wiring.md`.
- **Student-list "All Classes" sub-trap (the one that kept re-breaking).** Fixing the id-prefix branch is NOT enough: the `selectedClassId === 'all'` branch in daily-reviews / grades / attendance STILL fell through to `STUDENT_ROSTERS` / `DEMO_STUDENTS`, so a search for a DB-only student (e.g. "آية فتحي") returned "no students match" even after the prefix fix. The `all` branch must call `apiListStudents({ limit: 200 })` **first** (works in both demo and api mode when a backend is reachable) and fall back to mock only on failure. Concrete pattern in `references/student-list-api-wiring.md`.
- **graphify is NOT installed in this environment** — `node scripts/graphify-cli.js update .` prints `graphify update is unavailable: install graphify first.` Do not treat this as a blocker or retry-loop it; skip the graphify refresh during push (per push-workflow, a missing/unavailable graphify is not a failure). The repo's `push-workflow` skill still expects `graphify update .` when available, so only skip when the CLI reports unavailable.
- The DB is real and reachable: Prisma against `DATABASE_URL` in `backend/.env` returns live counts (e.g. 74 students). So "show all DB students" is achievable whenever the page actually calls the API.
- **Notifications are already REAL — do not reinvent them.** The backend already has a complete notification system; the only missing piece was a UI surface. Before building fake/mock notifications, audit what exists:
  - `backend/src/modules/notifications/` — `Notification` + `NotificationRead` Prisma models, a service (`createNotification`, `listForUser` with role/school-scoped `visibilityWhere`, `markRead`, `markAllRead`), controller, and routes (`GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`) all under `authenticate`.
  - **Real events already call `createNotification`**: attendance (daily-review note to guardian; absence/late alert to guardian), announcements (broadcast by audience or per-class userIds), messages (`targetUserId: receiverId`), assignments, dashboard, and `assignmentReminders.job`. So a teacher's note, a director's announcement, and a message ALL become real notifications.
  - **Live delivery**: `backend/src/server.js` + `src/modules/messages/messages.controller.js` emit a `notification:push` socket event on `user:<id>` rooms; the frontend `createMessagingSocket` (in `features/messaging/api.js`) listens on `notification:push` and `AppHeader`/`Dashboard` consume it. Notifications arrive in real time over WebSocket — no polling hack needed.
  - **Visibility is correct for every role**: `visibilityWhere` returns everything for `SUPER_ADMIN`, otherwise `targetUserId === user.id` OR (`isBroadcast` AND school match AND `targetRole` match/null). Guardians see guardian-targeted; staff see role/school broadcasts; students see student-targeted. Verified end-to-end this session.
  - **What was actually missing (and is now added)**: a `Notifications Center` page. Added `frontend/src/features/notifications/NotificationsCenter.jsx` at route `/dashboard/notifications` (pagination via `Load more`, status filter all/unread/read, type filter, search, Mark-all-read), wired the dropdown's `View all` button to it, and added a sidebar link visible to every role. The backend `listForUser` supports `page`/`limit`/`unreadOnly` only — type/search filtering is done client-side on the returned list. See `references/notifications-system.md` for the full wiring map.
- **Stale-view verification command (proven this session).** When the user reports "still broken / still white" after a build+detector pass, verify the change actually reached the bundle BEFORE concluding the fix failed:
  ```sh
  cd frontend
  grep -o "body.dark-theme <selector>{[^}]*}" dist/assets/app-*.css | head -c 300
  ```
  If the override is present, the running app is on a cached/old view → instruct **hard-refresh (Ctrl+Shift+R) or restart the dev server**. A NEW css-file import added to a component needs a full reload (HMR will NOT pick it up). Re-editing correct code wastes turns and frustrates the user.
- **Dark-mode audit trick for shared/modal components.** When a modal/search/picker shows white in dark mode, grep the component's own CSS for the offending selector and confirm the `body.dark-theme` override exists AND is in the bundle. Use the selector-based grep above rather than re-reading every file. Reused this session on `GlobalStudentSearch`, `NotificationDropdown`, and the attendance `student-picker-card.active`.

## References
- `references/dark-mode-tokens.md` — verified light/dark token map for this project.
- `references/student-list-api-wiring.md` — how student rosters are loaded per page and the canonical API-first fix for the mock trap.
- `references/notifications-system.md` — the existing real notification backend (models, service, events, WebSocket delivery) and the added Notifications Center page; read before touching notifications.
