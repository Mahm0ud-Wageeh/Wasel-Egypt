# UI Redesign — Phase 1 Report (Public Home, Navigation, Footer, Foundation)

**Date:** 2026-09-06 · Decision record: `docs/frontend/REDESIGN_DECISION.md`

## 1. UI/UX Pro Max searches used

| Query | Domain | Key output applied |
|---|---|---|
| "public transit journey planner civic mobility trustworthy" | `--design-system` | "Accessible & Ethical" style (civic/public products): 4.5:1 contrast, keyboard nav, visible focus, 44px targets; **avoid** emoji-as-icons, motion effects, template look |
| "transportation dashboard hero landing civic" | `landing` | 0 results (fallback: Hero + Features + CTA structure used, stated) |
| "icon button accessible label" | `icons` | Phosphor/Heroicons guidance → semantic icon registry, decorative icons `aria-hidden` |

## 2. 21st.dev components searched

- **Navbar** (6): Header Navbar #18258, Navbar 1 #2046, Navbar Menu #1024, Centered Nav Header #21220, Header 1/3 #8964/#8971
- **Hero** (6): incl. Real Estate Search Hero #19080, Hero Section #8439/#8737
- **Footer** (4): Agency Footer #21474, Stacked Circular #1522, Social Links #860, Flip Links #2777
- **Source inspected in full (1)**: Real Estate Search Hero #19080 — dependencies verified: `motion/react`, `lucide-react`, `react-wrap-balancer`, `@radix-ui/react-slot`, `class-variance-authority`, Tailwind/shadcn Button+Input.

## 3. Components adopted

| Adoption | Form | License |
|---|---|---|
| **lucide-react** icon library (from #19080's stack; matches spec §2.7 "24px, 1.5px stroke, rounded caps") | Real dependency (`lucide-react@1.41.0`), wrapped in `Icon.jsx` product-meaning registry | MIT |
| **Pill search-form hero pattern** (#19080) | Pattern rebuilt in Wasel token CSS (`.planner-cta`) — zero of its dependencies imported | — |
| **Multi-column footer structure** (#21474 pattern) | Rebuilt: brand + Product/Account/attribution columns + legal row | — |

## 4. Components rejected and why

- All Tailwind/shadcn component **code** — architecture conflict with the approved custom token system (would invalidate 51 tests + the design spec); 5 dependency chains for one section.
- `motion/react`, `react-wrap-balancer`, `cva`, Radix Slot — animation/wrapper deps with no product need (Pro Max: avoid motion for this style).
- Blur/glass navbars, floating navs, circular footer, flip links — decoration without function.

## 5. Design decisions (full detail in REDESIGN_DECISION.md)

Kept: approved tokens (Cairo typeface — Arabic/RTL requirement beats Pro Max's Atkinson suggestion — institutional blue, gold, sand, mode colors). Changed: emoji→SVG iconography everywhere in scope, editorial section rhythm (`.eyebrow/.section-title/.section-lede`), hero journey-planner CTA, sticky navbar with mobile disclosure, footer component with license attributions, RTL logical properties throughout new CSS.

## 6. Files changed

- `src/components/ui/Icon.jsx` (new — icon registry)
- `src/pages/Landing.jsx` (rebuilt: navbar + hero planner CTA + sections + footer, 26 SVG icons, 0 emoji)
- `src/components/layout/PassengerLayout.jsx` (tab icons ⌂🔍📣🔔👤 → lucide; brand 🚌 → icon)
- `src/styles/components.css` (redesign foundation: site-nav, drawer, section rhythm, planner-cta, feature/mode cards, footer — logical properties for RTL)
- `package.json` (+ `lucide-react`)
- `docs/frontend/REDESIGN_DECISION.md` (new)

## 7. Tests & build

- `npx vitest run`: **13 files / 51 tests passed** (no test weakened; none asserted emoji).
- `npm run build`: clean (6.8s; one lucide icon-name fix — `RouteSplit` → `Waypoints` — caught by the build).

## 8. Browser verification (live Vite :5174)

- **390px**: no horizontal overflow; hamburger visible + drawer opens/closes; nav links collapsed; planner CTA stacked; footer present; **0 emoji text chars, 26 lucide SVGs**; live stats render (3,025 stops / 1,014 routes from the API).
- **1440px**: nav links visible, hamburger hidden, 4-column footer, planner CTA inline row, no overflow.
- **Console**: no runtime errors; page renders fully on load and reload.
- **API integrity**: unchanged endpoints only; landing stats + alerts from live public API; planner CTA navigates to the untouched `/search` which mounts with map + form (verified post-click).

## 9. Remaining work (per REDESIGN_DECISION.md §14)

1. Journey Search + Results token-consistency polish
2. Journey Details + Active Journey micro-polish
3. Admin dashboard (desktop rail + charts)
4. Dark-mode evaluation
5. Full Arabic copy pass (RTL foundation already in place)

**READY FOR NEXT DESIGN PHASE: YES**
