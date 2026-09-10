# WASEL EGYPT — Design System MASTER (v3)
**Source of truth for every Wasel surface.** Built on the production token file
`frontend/src/styles/tokens.css` — same names, same values, extended where noted.
Interactive companion: `design-system/wasel-egypt/prototype.html`.

---

## 1. Identity

**Wasel (وصل)** — Egyptian Arabic: "to connect, to arrive."
**Promise:** Cairo transit without the guesswork.
**Personality:** intelligent · calm · trustworthy · Egyptian without cliché.

Egyptian identity is expressed through **substance, not costume**:
- **Nile Blue** primary — the river that connects Egypt, the route that connects the city.
- **Desert Gold** accent — light on sand; reserved for the *destination* (the journey ends at gold).
- **Cairo typeface** — a bilingual Egyptian type family (Latin + Arabic), by an Egyptian designer.
- Mode colors echo the real network (metro red, rail purple, bus blue…).
No pyramids, no hieroglyphs, no papyrus textures, no scarab logos.

**Anti-aesthetic (explicitly banned):** generic SaaS/dashboard look, gradient washes,
large empty hero areas, over-rounded everything, random decoration, emoji icons,
mixed icon styles, floating-shadow soup (cards on page level use borders, not shadows).

---

## 2. Logo & wordmark

**Concept — "the route is the letter".** The mark draws **W** as a transit route:
an origin dot, a path that rises and falls like a line on the map, and a gold
destination point at the highest vertex — *origin → destination, arrival elevated*.

```
Construction (48×48 grid):
- Badge: rounded square, radius 11, fill --p900 (or white in dark contexts)
- Route: polyline 12,34 → 18,15 → 25,31 → 33,15, stroke --p50/white, 3px, round caps/joins
- Origin: circle r 2.6 at (12,34), fill white
- Destination: circle r 3.6 at (33,15), fill --a500 with white ring 1.5px
```

- **Horizontal lockup:** mark + `Wasel` (Cairo 700) + `EGYPT` (13px, letter-spacing 2.5px, --a600).
- **Arabic lockup:** mark + `وصل` (Cairo 700) + `مصر` (13px, --a600). Arabic lockup is not a mirror — it is re-set natively.
- **App icon / favicon:** badge only. Route must stay legible at 24px (verified in prototype).
- **Clear space:** half badge width on all sides. Minimum sizes: 24px badge, 120px lockup.
- **Don'ts:** no gradients on the badge, no rotating the mark, no recoloring the gold
  destination, no placing the mark on busy imagery without the p900 badge.

---

## 3. Color

All values live in `tokens.css`. **Never hardcode hex in components — tokens only.**

### 3.1 Primary — Nile Blue (interactive, structure, focus)
| Token | Hex | Use |
|---|---|---|
| `--p900` | #0e3a5f | hero band, dark surfaces, footer, badge |
| `--p800/p700` | #124675 / #14558b | links & text-on-light (p700 = 7.7:1 on white) |
| `--p600` | #1a6bb0 | **primary buttons** (white text 5.6:1), selected route line |
| `--p500/p400` | #2280cc / #4d9bd8 | hover/active fills, focus rings |
| `--p300` | #8fbfe8 | focus ring on dark, hairline accents |
| `--p100/p50` | #d8e9f7 / #eff6fc | tinted info surfaces, map land |

### 3.2 Accent — Desert Gold (destination, premium moments)
`--a500 #d3a044` is **graphic-only** on light surfaces (2.2:1 — never body text).
Gold text on light uses `--a700 #9a7226` (4.9:1). Gold shines on `--p900` (7.4:1).
Uses: destination marker, destination fields' icon, "recovery" highlights, verified badges, stats numbers on dark.

### 3.3 Secondary accent — Nile teal `--nile #0e7c7b`
Live-current-location system color (the "you are here" river), recovery route lines. 5.1:1 on white.

### 3.4 Semantic
Success `--s600 #3a8f3f` / `--s50`, text `--s800 #256b29`; Warning `--w600 #c97f10`, text `--w800 #9a5b00` (AA on `--w50` 4.95:1); Error `--e600 #d32f2f` / `--e50`, text `--e700 #c62828` (AA 4.82:1); Info = `--p50` + `--p700` text; Gold text on tint `--a800 #7d5c1e` (AA on `--a100` 5.22:1).
**Rule (audited):** colored text on tinted surfaces uses the `-800` pair, never the `-600/-700` graphic tone. Every semantic state pairs **color + icon + text** — never color alone.

### 3.5 Neutrals
`--ink900 #16222e` (headings) · `--ink700 #3d4c5c` (body, 8.7:1) · `--ink500 #64748b` (secondary, 4.9:1) · `--ink400` (placeholders only) · `--line` borders · `--surface` white · `--surface-2` · `--bg #f7f9fb` · `--sand #faf6ef` (warm Egyptian surface for hero/CTA bands — used sparingly, ≤1 band per page).

### 3.6 Transit mode palette (the product's "line colors" — sacred)
| Mode | Token | Hex | Notes |
|---|---|---|---|
| Metro | `--mode-metro` | #c62828 | Metro Line 1 red heritage |
| Rail | `--mode-rail` | #6a3fa0 | |
| Bus | `--mode-bus` | #1565c0 | |
| Minibus | `--mode-minibus` | #e07c00 | 2.9:1 on white — graphics only |
| Microbus | `--mode-microbus` | #00897b | |
| Walking | `--mode-walking` | #6b7280 | |

Mode **text** labels are always `--ink800` with a colored **dot/icon** (contrast-safe + color-not-alone).

### 3.7 Dark mode (spec now, ship later)
Map "night mode" for Active Journey: land #101a26, roads #1b2836, water #0f2e2e,
labels #8fbfe8, route line `--p400`, live marker `--nile`. Component dark tokens
to be derived in tokens.css `[data-theme="dark"]` when scheduled — do not hand-roll per page.

---

## 4. Typography

**One family for both scripts: Cairo** (Google Fonts, by Mohamed Gaber — designed
bilingual). Latin fallback Inter. This is a real advantage: EN and AR share metrics,
weight rhythm and personality — no font-switching jank on language toggle.

```css
--font: 'Cairo', Inter, system-ui, sans-serif;
/* weights: 400 body · 600 labels/numbers/semantics · 700 headings/buttons · 800 display */
```

| Role | Token | Size | Weight | Line-height (EN/AR) |
|---|---|---|---|---|
| Display LG | `--fs-display-lg` **new** (56px; 40px <768) | 56 | 800 | 1.15 / 1.35 |
| Display | `--fs-display` | 40 | 800 | 1.2 / 1.4 |
| H1 | `--fs-h1` | 28 | 700 | 1.3 / 1.55 |
| H2 | `--fs-h2` | 22 | 700 | 1.35 / 1.6 |
| H3 | `--fs-h3` | 18 | 700 | 1.4 / 1.65 |
| Body LG | `--fs-body-lg` | 16 | 400 | 1.55 / 1.75 |
| Body | `--fs-body` | 14 | 400 | 1.55 / 1.75 |
| Label | `--fs-label` | 13 | 600 | 1.4 |
| Caption | `--fs-caption` | 12 | 400/600 | 1.4 |

**Arabic rules (non-negotiable):**
- `letter-spacing: 0` for ALL Arabic text (tracking breaks Arabic script joins). Tracking allowed on Latin labels only (e.g. EGYPT, 2.5px).
- Arabic line-heights are +0.2 higher than EN (set per-language, not mirrored guesswork).
- Numerals stay Western digits (product data uses them); tabular alignment `font-feature-settings: 'tnum'` for times, fares, stats.
- Arabic buttons/chips get `padding-inline +2px` — Arabic glyph overshoot needs air.

---

## 5. Spacing, layout & breakpoints

**4-pt scale** (`--sp-0…16` = 0/4/8/12/16/20/24/32/40/48/64).
Component padding 12–20, card padding 16–20, section rhythm 24 (mobile) → 48/64 (≥1024).

**Breakpoints (tested intentionally, not shrink-to-fit):**
| BP | Width | Character |
|---|---|---|
| M1 | 390px | single column, bottom tab bar, sheets full-bleed, planner stacked, map = hero |
| M2 | 430px | same as M1 + comfortable two-up chips, larger CTA (52px) |
| T | 768px | two-column results (list 40% / map 60%), timeline+map split, admin becomes usable (sidebar collapses to icon rail) |
| L | 1024px | persistent sidebars, 3-col landing grids, sticky rail navigation |
| D | 1440px | content max-width 1120px (`--content-max`) centered, generous whitespace outside |
| XL | 1920px | content stays 1120px; map results get 1280px max; never stretch text lines |

**Mobile-first transformations (real changes, not shrinks):** dialogs → bottom sheets;
result cards → full-width with inline mini-map strip; admin sidebar → drawer;
hero planner → single-column with sticky CTA; tabs → horizontally scrollable pill row.

Safe areas: `env(safe-area-inset-bottom)` on tab bars & sheets. Scroll content gets
`padding-bottom: calc(tab-bar + safe-area + 16px)` so nothing hides behind fixed bars.

---

## 6. Radii & elevation

**Radii:** `--r-xs 4` small inline controls · `--r-sm 8` inputs, chips, map controls, buttons · `--r-md 12` nested elements, timeline cards · `--r-lg 16` cards, sheets · `--r-xl 24` hero planner, dialogs, drawer tops · `--r-pill` markers/pins only. Cards never exceed `--r-lg`.

**Elevation discipline — the anti-SaaS rule:**
- Page-level cards: **1px `--line` border, no shadow**; hover may raise to `--sh-xs`.
- Floating/overlay surfaces only (`--sh-sm/md/lg`): sticky headers, dropdowns, sheets, dialogs, map controls (`--sh-map-ctl`).
- One elevation level per layer — no shadow-stacked shadows.
- New token: `--scrim: rgba(22,34,46,.48)` for dialog/drawer scrims.

---

## 7. Iconography

**One family only: lucide-react via `Icon.jsx` registry.** No emojis anywhere (audited, enforced).
Sizes: `--icon-sm 14` inline · `--icon-md 17` buttons/rows · `--icon-lg 20` nav/sections · `--icon-xl 24` feature tiles. Stroke 2px default, 1.5px for xl on light.

- **RTL:** directional icons flip — `arrowRight↔arrowLeft`, chevrons, "back". Non-directional (search, crosshair, bell) never flip. Map never mirrors (north stays north).
- **A11y:** decorative icons `aria-hidden="true"`; icon-only controls get `aria-label` + visible `:focus-visible` ring; state icons pair with text.
- **Transit iconography:** metro `TrainFront`, rail `TrainTrack`, bus `BusFront`, minibus/microbus `Van` (differentiated by color+label), walking `Footprints` — same names as production registry.

---

## 8. Motion — restrained, meaningful

```css
--dur-fast: 120ms; --dur-med: 200ms; --dur-slow: 320ms; /* new */
--ease: cubic-bezier(0.2, 0.6, 0.25, 1);
```

| Interaction | Spec |
|---|---|
| Page/route change | content fade+8px rise, 200ms in / 120ms out (exit faster than enter) |
| Navbar (scroll) | transparent → `--surface` + border + `--sh-sm`, 200ms, triggers at 24px scroll |
| Search suggestions | list stagger 30ms/item, 120ms, translateY(4px→0), origin-anchored |
| Card entrance | once per page: fade+rise 240ms, stagger 60ms; never loop |
| Route selection on map | line recolor+width 240ms; camera ease 500ms; selected card scrolls into view + rail indicator slides |
| Route draw (details/active) | stroke-dashoffset draw, 700ms, once — not on every render |
| Active leg flow | dash marching 1.2s linear infinite (the only infinite loop; stops on arrival) |
| Drawers/sheets | slide-up 320ms `--ease`; scrim fade 200ms; ESC + scrim-click close |
| Notifications | new item slide-in 240ms + unread dot pulse (2s, ≤3 pulses) |
| Journey progress | progress bar width 400ms; stop dots pop scale 1→1.15→1 |
| Deviation alert | banner slide-down 280ms + one gold halo pulse on deviation point; no shake, no red flashing |
| Geolocation | locating: crosshair spinner; success: accuracy circle 400ms fade-in from 0 |

`@media (prefers-reduced-motion: reduce)`: all transforms/transitions → `0.01ms` opacity-only;
route draw renders final state; infinite loops removed. Verified in prototype.

---

## 9. Components

### Buttons
Primary `--p600` bg / white text / `--r-sm`; hover `--p700`; active `--p800` + scale .98;
focus-visible 2px `--p300` ring offset 2; disabled 45% opacity + no-shadow + `disabled` attr.
Secondary: `--surface` + 1px `--line-strong` + `--ink700`; Ghost: transparent, `--ink700`, hover `--surface-2`.
Destructive: `--e600`. Sizes: sm 36 / md 44 / lg 52. Icon buttons ≥44×44.
CTA pattern: label + directional arrow that nudges 4px inline-start on hover (flips in RTL).

### Inputs
Height `--ctl-md 44` (mobile `--ctl-lg 52` for hero planner), `--r-sm`, 1px `--line-strong`,
bg `--surface`; focus: border `--p500` + 3px `--p100` ring; error: `--e600` border + 12px
message below with icon; **visible labels always** (placeholder is hint, `--ink400`).
Location comboboxes: prefix mode-colored icon, clear button, suggestion dropdown
(stops section + places section + "Use my location" row with crosshair icon, sticky).

### Cards
`--surface`, 1px `--line`, `--r-lg`, padding 16–20. Section header = eyebrow (12/600 tracked, `--a600` or `--p600`) + H2 + lede. Result cards carry a 4px inline-start mode-colored bar.

### Chips & badges
Chip: pill, 1px border, icon+label, 32px; selected = `--p600` bg white text.
Mode chip: colored dot 8px + `--ink800` text. Status badges: verified `--s600` on `--s50`; pending `--w700` on `--w50`; resolved `--ink700` on `--ink100`; deviation `--e600` on `--e50`; count badge: `--e600` pill on bells, ≥20→"20+".

### Alerts
Icon + title (600) + body on tinted surface (`--s50/--w50/--e50/--p50`), `--r-md`,
inline-start 4px semantic bar. Roles: error `role=alert`, others `role=status`.

### Dialogs & drawers
Dialog: `--r-xl`, `--sh-lg`, `--scrim`, max-width 480 / mobile bottom-sheet `--r-xl` top corners, swipe-down close. Drawer: mobile sheet (bottom, 72vh) / desktop side panel (inline-end, 400px) — map info panels, filters, admin nav. All: focus trap, restore focus on close, ESC works.

### Navigation
- **Landing navbar:** 60px, transparent over hero → solid on scroll; links + language chip + Login + primary Get started; mobile drawer.
- **App header:** 60px, current screen title + language + bell (with badge) + avatar; bottom tab bar (mobile, 5 max): Home · Search(center, elevated) · Reports · Alerts · Profile — labels always visible, active = `--p600` + icon fill.
- **Admin:** 260px sidebar `--p900` (dark rail — deliberately different from passenger light UI), white text, active item `--p600` bar + gold inline-start marker; collapses to 56px icon rail at 1024, drawer <1024.

### Map controls (44px system)
Vertical stack inline-end: zoom + / − / divider / layers (popover with checkboxes) / locate (state machine icon: idle crosshair / locating spinner / active filled `--nile`). White bg, `--r-sm`, `--sh-map-ctl`, 1px `--line`. Legend: collapsible card bottom-inline-start, shows only layers currently visible.

### Loading / error / empty
Loading: route-line shimmer for maps (a path with moving dash), list skeletons (card shapes, `--surface-2`, pulse 1.5s), buttons keep width + spinner.
Error: icon in tinted circle + title + one-line body + Retry (primary sm). Offline variant adds "saved route still available" note.
Empty: friendly illustration-lite (lucide icon composition in `--p50` circle), title + body + one action ("Search to plan your first journey"). Never a dead end.

---

## 10. Map design system (core product surface)

The map is the product. Rich, but with strict visual hierarchy — 5 depth layers:

**L1 Base (quiet):** land `--p50`-tinted #eef3f8; minor roads white 3px with #dfe6ee casing; major roads #ffe0a3 warm sand 5px; rail corridors `--ink200` dashes. **L2 Water:** Nile band `--nile-50` fill with #bfe0e0 1px shore. **L3 Context labels:** place names Cairo 12 `--ink700`, white 2px halo; never compete with stop labels (halo + 13px at zoom≥13 only). **L4 Network (the product):** transit lines 4px mode-colored with white 6px casing; stops per §below; selected journey on L5. **L5 Journey & live (loudest):** selected route 6px `--p600` + white 10px casing + animated dash on the active leg; origin/destination/live markers top the stack.

**Markers (visual grammar — position types, not just colors):**
| Element | Design |
|---|---|
| Origin | white 14px circle, 3px `--p600` ring, 4px `--p600` core |
| Destination | **gold teardrop pin** 28px, `--a500` fill, white core dot (the journey ends at gold) |
| Current location | 12px `--nile` dot + 3px white ring + accuracy circle `--nile` 18% + pulse; distinct from EVERYTHING |
| Metro station | 10px white circle + 3px `--mode-metro` ring |
| Bus/minibus/microbus stop | 8px white circle + 2.5px mode-color ring |
| Interchange/transfer | 14px white circle + double ring (two mode colors), slight vertical stretch (stadium) |
| Selected stop | scales 1.3 + `--p300` halo pulse (one pulse) + info panel opens |
| Deviation point | `--e600` ring + gold halo pulse (the one red element on canvas) |
| Recovery routes | solid `--nile` (recommended) / `--p400` (alt) — clearly different from original dashed `--ink400` |

**Alternatives:** 4px `--ink300`, casing on hover only; selected-synchronization both ways
(hover card → route lifts to 5px; select route → card scrolls into view + rail indicator).

**Route summary overlay:** floating strip bottom-center (mobile above tab bar):
mode chips sequence + duration + fare (only when data exists — pure-metro honesty) + expand chevron → full summary.

**Interactions:** stop tap → info panel (sheet bottom / card inline-end 360px desktop):
name, mode chips, lines served, "Set as origin/destination" buttons, next departures.
Route tap → route info card. Long-press map → context "route from/to here". All panels close via X + scrim tap (mobile).

---

## 11. Geolocation UX contract (states are real, never silent)

Permission prompt → **locating** (crosshair spins, "Locating…" status, fields stay editable)
→ **success** (accuracy circle + `--nile` dot drops in, origin field shows "My location · ±35m",
chips "Use as origin") OR **denied** (warning alert: "Location denied — pick your starting point instead",
field keeps manual value) OR **timeout** (warning + Retry action) OR **unavailable** (info alert).
**Never silently replace a manually entered origin** — location fills the field only when it is empty or user pressed the locate button on that field. Recenter control recenters camera only, does not touch fields.

---

## 12. Bilingual & RTL rules

`<html lang dir>` flips the whole app via logical CSS properties (`margin-inline-start`, `inset-inline-end` — refactor away left/right in new code). What **flips**: layout order, directional icons, card rail indicators, timeline flow, sheet slide direction, breadcrumb separators, step arrows. What **never flips**: the map (north-up), numerals, code/IDs, brand lockup LTR (Arabic lockup is separate, not mirrored), phone numbers.
Arabic typography per §4. Mixed-direction strings (URLs inside Arabic) get `dir="auto"` spans. Forms: labels inline-start, right-aligned in AR; inputs keep LTR directionality for numbers/times.

---

## 13. Accessibility standard (gate, not garnish)

Contrast ≥4.5:1 body/labels (pairs in §3 verified), ≥3:1 large text/UI graphics.
Visible `:focus-visible` everywhere (2px ring + 2px offset). Full keyboard: planner (arrow keys in suggestions, Enter selects, Esc closes), results (Tab through cards, Enter opens), map fallbacks (stop list mirrors map stops; route list mirrors map routes — map is never the only path). Touch targets ≥44px. `aria-hidden` decorative icons; `aria-live="polite"` for geolocation status & search progress; `role="alert"` errors. Semantic headings, landmarks, skip-link. `prefers-reduced-motion` per §8. Color never sole indicator (§3.4). Font sizes rem-based.

---

## 14. Screen specs

### 14.1 Landing `/`
Navbar → hero band (`--p900` base with map-line motif at 6% opacity, NOT a photo): eyebrow, display headline, lede, **functional planner** (origin/destination comboboxes + swap + locate + primary CTA "Plan your journey" 52px), geo status line, feature chips, **live stats strip** (stops & routes totals from `/stops` & `/public-routes` `meta.total` — no fake numbers), search-hint line. Then: live service alerts (only if API returns any), How Wasel works (4 steps: Plan/Track/Detect/Recover — numbered rail connecting them, the "journey" motif), Modes grid (6, mode-colored dots + real notes: Metro "Lines 1–3"), Community trust (2 cards: moderated, trust compounds), CTA band (`--sand`), footer (4 cols + data attribution TfC/OSM + language toggle).
Mobile: planner single column, swap rotates 90°, stats 2-up, footer stacks, nav → drawer.

### 14.2 Search `/search`
Purpose page for picking origin/destination. Search combobox (autofocus, server autocomplete), suggestions grouped: Current location (crosshair), Recent (clock icon, per-field), Stops (mode dot + line chips), Places (pin). Map context strip (mini-map, tap-to-verify location of highlighted suggestion). Preferences: depart/arrive + time, max transfers, avoided modes (chips with mode dots), walking tolerance. Sticky primary "Find journeys". Mobile: map strip collapses behind a "Show on map" toggle; recents 3 visible + "More".

### 14.3 Journey Results `/journeys/results`
Desktop ≥768: split — results list (40%, scrollable) + map (60%, sticky). Mobile: tabbed "List / Map" (segmented control above content, map full-bleed). Each result card: rank badge (1 recommended — gold "Recommended" tag), duration (H:MM, tnum), mode chips sequence with transfer glyphs, metrics row (walking · transfers · fare **only when pure-metro**), reliability pill (s600/w600 by ≥80%), depart/arrive times. Selected card: `--p600` rail + bg `--p50`; map syncs route. Alternatives visually secondary (smaller, `--ink300` routes on map). Empty: "No journeys found" + tips (loosen filters). Loading: skeleton cards + map shimmer.

### 14.4 Journey Details
Timeline (inline-start rail with mode-colored segments, walk = dashed gray) + map sync (hovering a leg highlights route section; active leg animated). Legs: icon, "Metro · Line 1" + direction, from→to stops, intermediate stops collapsed (n, expandable), duration, walk legs show distance + OSRM-derived path. Transfer visual: interchange node + "Wait 4 min" chip. Route summary card (modes, duration, fare-if-metro, reliability). Actions: Save journey (bookmark→saved state) + **Start journey** (primary lg, becomes the active header once started).

### 14.5 Active Journey `/active-journeys/:id`
Live navigation surface. Mobile: map full-bleed top 55% + status sheet bottom 45% (grabbable, expands). Desktop: map right 60%, live panel left. Status card: "On the move · Metro Line 1" + next stop (bold) + ETA countdown (large, tnum) + progress bar with stop ticks + transfer warning ("Transfer in 2 stops — get off at Sadat"). Live marker on map with accuracy; upcoming segment pre-highlighted. Controls: recenter (auto-follow default, manual pan breaks follow with "Recenter" chip), end journey (destructive ghost, confirm sheet), simulate-deviation (demo, labeled clearly). Deviation navigates to §14.6.

### 14.6 Deviation / Recovery `/active-journeys/:id/deviation`
Instantly comprehensible warning: "You're off the planned route" (e600 on e50, banner) + one-line reason. Map: original route dashed `--ink400` + deviation point e600 + user live dot; recovery routes solid `--nile`/`--p400` with time labels. Recovery cards: each with from-current-position mode sequence, new duration, **delay comparison vs original ("+6 min vs plan")**, fare-if-metro, "Use this route" primary. Recommended recovery gets gold tag. Trust note: "Rerouted from where you actually are." "Keep original plan" ghost always available.

### 14.7 Reports `/reports`
Create card: what happened (chip select: delay/crowding/breakdown/accident/closure/other — lucide icons), related stop (combobox), free text, optional photo, submit (validates, optimistic state "sending…"). List: cards with status badge (pending w / verified s with ShieldCheck / resolved ink), age ("12 min ago"), community confirms ("3 confirmations" — trust indicators with Users icon), stop chip, moderation note when resolved. Filter segmented: All / Mine / Nearby. Empty: "No reports yet — be the first to help riders today."

### 14.8 Notifications `/notifications`
Header: title + "Mark all read" ghost. Grouped: Today / Earlier. Item rows: lifecycle icon in tinted circle (journey started p / deviation e / recovered s / report verified s / system ink), title 600, body, time caption, unread = 2.5px `--p600` inline-start bar + dot; tap → mark read + deep link (journey/report). Unread count badge on app bell mirrors. Empty state: bell icon, "You're all caught up."

### 14.9 Profile `/profile`
Header: avatar (initials, `--p900` circle), name, email, edit. Sections (cards, not dashboard tiles): Saved journeys (route mini-chips + duration, Start re-run, remove), Preferences (language segmented EN/العربية — live dir switch; units; default avoided modes), Location & privacy (precise location toggle with plain-language explanation, clear recent locations, location used only during active journeys note). Sign out ghost at bottom. Mobile: single column; ≥768 two-col asymmetric (2fr/1fr).

### 14.10 Admin `/admin*` (desktop-first, deliberately distinct)
Dark `--p900` sidebar rail (Dashboard, Analytics, Moderation, Users — icons + labels, active = `--p600` + gold marker) + light content on `--bg`. **Not a generic admin template:** stat tiles carry mode-colored sparklines (metro red, bus blue) with real counts (users, journeys, reports pending, active now); analytics uses line colors from the SAME mode palette (no new chart colors); tables are dense (13px, `--fs-label` headers tracked, row hover `--p50`) with status pills from the SAME badge system; moderation queue reuses passenger status grammar (pending/verified/resolved) so one language across the product. Breadcrumb + H2 + primary action per page. ≥1440 content max 1280; <1024 sidebar → drawer.

---

## 15. File map & adoption

- Tokens (production): `frontend/src/styles/tokens.css` — add `--fs-display-lg`, `--dur-slow`, `--scrim`, and AA text-on-tint tokens `--w800/--s800/--a800` (v3 additions, all verified ≥4.5:1 in the prototype audit).
- This spec: `design-system/wasel-egypt/MASTER.md` (replaces the auto-generated draft; screen-level rules live in §14).
- Interactive prototype (all 10 screens, EN/AR, responsive): `design-system/wasel-egypt/prototype.html`.
- Components to implement against: `frontend/src/components/ui/*` (Button, Card, Alert, Icon registry, Logo) + `components/map/*`, `components/journey/*`.
- i18n: `frontend/src/i18n/{en,ar}.json` — prototype reuses real keys; new keys needed: `planner.depart_now`, `planner.arrive_by`, `results.eta`, `profile.saved_title` (listed for extraction).

*Every screen, every state, both directions — one system. Wasel: one journey, four safety nets.*
