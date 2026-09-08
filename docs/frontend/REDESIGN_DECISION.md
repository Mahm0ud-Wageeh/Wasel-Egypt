# Wasel Egypt — Frontend Redesign Decision

**Date:** 2026-09-06 · **Scope:** design-system decision record for the UI upgrade
**Research inputs:** UI/UX Pro Max skill (design-system, landing, icons searches), 21st.dev MCP component catalog (10 components searched, 1 source-inspected in full), existing `docs/design/UIUX_DESIGN_SPEC.md`, current implementation audit.

---

## 1. Problems in the current UI

| # | Problem | Evidence |
|---|---|---|
| P1 | **Emoji as primary iconography** (violates the approved spec's "24px, 1.5px-stroke Material-Symbols-style" iconography and the Pro Max checklist "No emojis as icons") | Bottom tabs (⌂ 🔍 📣 🔔 👤), landing hero/features (🚌 🔎 📍 ⚠️ 🔄), buttons ("🏁 Complete Journey"), empty states |
| P2 | **No journey-planner CTA in the hero** — the product's core action (search a journey) is one click away instead of front-and-center | Landing hero has only auth buttons |
| P3 | **Landing navbar is not a real product navbar** — inline anchor links, no brand presence, no sticky behavior, collapses without a mobile menu | `.landing-nav` inline styles |
| P4 | Footer is a row of ad-hoc inline-styled columns, not a designed component | Landing footer |
| P5 | Decorative fake map controls existed (fixed in Phase C), but visual language still mixes emoji, text glyphs (⌖, −) and ad-hoc styled spans | MapPanel controls (now real buttons), tab icons |
| P6 | Sections lack a consistent editorial rhythm (spacing/eyebrow/headline scale drifts between landing sections) | Landing `style={{ paddingTop: 'var(--sp-6)' }}` ad-hoc |
| P7 | Icon-only buttons in the tab bar rely on emoji + label, but emoji rendering differs per platform and breaks the "serious transit product" tone | PassengerLayout tabbar |

## 2. New visual direction

**Keep** (approved, tested, and correct):
- The full token system in `tokens.css` — institutional blue primary (`#1A6BB0`), gold accent, sand background, Cairo typeface (full Arabic support — non-negotiable for RTL), mode colors, 4-pt spacing, radii, shadows.
- The "Accessible & Ethical" posture UI/UX Pro Max recommends for civic/public products: high contrast (4.5:1), visible focus, keyboard nav, reduced-motion, 44px touch targets. Most already implemented in Phase C; this phase completes it with the icon system.

**Change**:
- **SVG icon system** — adopt `lucide-react` (MIT, tree-shakeable, 24px/1.5px-stroke/rounded-cap style that exactly matches the approved spec §2.7). One dependency, zero CSS-framework impact. All navigation, tab bar, feature sections, footer, and buttons move from emoji to semantic SVG icons.
- **Editorial section rhythm** for the public site: eyebrow label → headline → lede → content grid, using a new `.section` / `.section-head` / `.eyebrow` utility set so every landing section shares one composition.
- **Journey-planner CTA in the hero**: a pill-style planner card (origin/destination affordances + primary CTA) that deep-links into the existing `/search` flow — visual pattern adopted from 21st.dev's search-hero component, rebuilt entirely in Wasel token CSS (see §6).
- **Sticky landing navbar** with real mobile disclosure menu (no scroll-blur effects — Pro Max flags motion effects as an avoid for this style).
- **Footer as a component**: brand block + 3 link columns + attribution strip (license obligations) + language switch.

## 3. Design-system decisions

| Decision | Choice | Rationale |
|---|---|---|
| Type | **Keep Cairo** (not Pro Max's Atkinson Hyperlegible suggestion) | Approved spec; Atkinson has **no Arabic glyphs** — RTL requirement wins. |
| Palette | **Keep approved tokens** (Pro Max's navy/blue palette is close but redefining would break 51 tests + spec) | Institutional blue ≈ their `#0369A1` recommendation; sand/gold gives the Egypt identity. |
| Icons | **lucide-react** (MIT) | Spec §2.7 style match, MIT license, tree-shakeable, React-native support. |
| Motion | CSS transitions 150–300ms only; no scroll-reveal libraries | Pro Max "Accessible & Ethical" style: avoid motion effects; reduced-motion already global. |
| Density | Marketing pages spacious; app screens keep current 4-pt scale | `--density` guidance from Pro Max. |
| Elevation | Existing shadow tokens (sm/md/lg); no glow/blur effects | Template-look avoidance. |

## 4. Navigation architecture

**Public (guest):** sticky top navbar — brand (icon + wordmark) · How it works · Modes · Community · language switch · Log in · **Plan a journey** (primary CTA). Mobile (<768px): brand + hamburger → disclosure panel with the same links + CTAs.

**Passenger app:** unchanged top bar + bottom tab bar structure (5 tabs, ≤5 rule from Pro Max), but tab icons become lucide (`House`, `Search`, `Megaphone`, `Bell`, `UserCircle`), active state = primary/700 with filled variant, badge count on Alerts unchanged. Search stays the raised center pill (per spec §2.6).

**Admin (later phase):** desktop-first left rail + topbar (documented in §11 order).

## 5. Homepage structure (public)

1. **Navbar** (§4)
2. **Hero** — eyebrow "WASEL EGYPT" · headline · lede · **planner CTA card** (pill form: From / To / button → `/search`) · feature badges (icon chips) · live coverage stats (real API: stops, routes) · primary/secondary buttons
3. **Live service alerts** (real data, renders nothing when empty)
4. **How it works** — Plan / Track / Detect / Recover (lucide icons: `Map`, `LocateFixed`, `TriangleAlert`, `RouteSplit`)
5. **Modes** — 6 mode chips with mode-color dots (unchanged data, iconized)
6. **Community trust** — 2 cards (`ShieldCheck`, `Users`)
7. **CTA band** — headline + buttons
8. **Footer** (§7)

## 6. Passenger app structure

Unchanged screen inventory (Home, Search, Results, Details, Active Journey, Deviation, Reports, Notifications, Profile) — this phase only touches **shared shell** (tab icons) and **Landing**. Journey Search redesign is explicitly out of scope for this task. Future phases follow the implementation order in §11.

## 7. Footer structure

`footer` component with: brand column (logo, one-liner, license note) · Product links · Data & attribution (T4C CC-BY-NC-SA, © OSM contributors — license obligations) · legal row (© year Wasel Egypt — graduation project) + language switch. Responsive: 4 columns → stacked.

## 8. Recommended 21st components (searched: navbar ×6, hero ×6, footer ×4)

| Component | Verdict | Reason |
|---|---|---|
| **Real Estate Search Hero** (id 19080, felipemenezes098) — **source inspected** | **ADOPT PATTERN, not code** | The pill search-form (icon + input + pill button + focus-within ring) is exactly the journey-planner CTA shape. Rebuilt in token CSS; rejects its deps: `motion/react`, `react-wrap-balancer`, `class-variance-authority`, `@radix-ui/react-slot`, Tailwind/shadcn Button+Input — 5 dependency chains + a CSS framework for one section, and serif/real-estate imagery is the wrong vertical. |
| Header Navbar (18258), Centered Nav Header (21220), Header 1/3 (8964/8971) | **REJECT** (pattern-level reference only) | All are Tailwind/shadcn-based; blur/animated variants conflict with "avoid motion effects" direction. Our navbar needs ~60 lines of token CSS, not a framework port. |
| Agency Footer (21474) | **ADOPT PATTERN** (multi-column structure: brand summary + sitemap + legal + attribution) — rebuilt in token CSS. Not copying: Tailwind-based, adds nothing structural we can't express in 80 lines. |
| Stacked Circular Footer (1522), Social Links (860), Flip Links (2777) | **REJECT** | Decoration without function — violates "every component needs a reason to exist". |

**Dependency actually adopted from 21st research: `lucide-react`** (MIT — the icon library the inspected component itself uses). Everything else is pattern-level.

## 9. Components rejected and why (summary)

- **Tailwind/shadcn component code**: architecture conflict with the approved token system; importing a CSS framework now would invalidate 51 tests, the design spec, and every existing screen.
- **Animation libraries (motion/react, GSAP)**: Pro Max flags motion as "avoid" for this accessible-civic style; existing CSS transitions suffice.
- **Blur/glass navbars, floating navs, circular footers, flip links**: template-look decoration explicitly banned by the brief.

## 10. API mapping (unchanged — verified before implementation)

| Landing feature | Endpoint (existing) |
|---|---|
| Coverage stats | `GET /api/v1/stops?per_page=1` → `meta.total`; `GET /api/v1/public-routes?per_page=1` → `meta.total` (via `apiRequest` to reach `meta`) |
| Live alerts | `GET /api/v1/service-alerts/active` |
| Planner CTA | navigates to `/search` (existing route) |
| Unread badge | `GET /api/v1/notifications/unread-count` (already in PassengerLayout) |

No new endpoints; no response-shape changes.

## 11. Responsive strategy

- Mobile-first CSS; breakpoints 640 / 768 / 900 / 1024 / 1440 (consistent with existing media queries).
- Navbar: links collapse <768px into a disclosure panel (button + aria-expanded, no JS animation lib).
- Hero planner card: stacked fields on mobile, inline pill on ≥768px.
- Footer: grid `1fr` → `repeat(4, 1fr)` at ≥900px.
- Touch targets ≥44px; horizontal-overflow checked at 390px.

## 12. RTL strategy

- Cairo already Arabic-capable; `LanguageContext` sets `document.documentElement.dir/lang`.
- New CSS uses **logical properties** (`margin-inline-start`, `padding-inline`, `inset-inline`) so RTL flips without extra rules; icon-only buttons keep `aria-label`s; icons that imply direction (arrows) swap via `[dir='rtl']` transform where needed.
- Language switch moves into the navbar (persistent, both mobile + desktop).

## 13. Map strategy (unchanged from Phase C, referenced for completeness)

MapLibre + OSM raster tiles via `VITE_MAP_TILES_URL`, real route polylines, honest fallbacks. The landing keeps its real stats + alerts; it does **not** embed a decorative map (no fake map visuals allowed) — the map lives where it has data (Search/Results/Active Journey).

## 14. Implementation order (this doc's plan, subsequent phases)

1. **This task**: shared UI foundation (icons) → Landing navbar → Hero + planner CTA → sections → Footer → tab-bar icons. *(tests + build + 390/1440 verification)*
2. Journey Search + Results polish (token-consistent form controls, chips).
3. Journey Details + Active Journey micro-polish.
4. Admin dashboard (desktop-first rail + charts).
5. Dark-mode evaluation (tokens already support it structurally).
6. Full AR copy pass.
