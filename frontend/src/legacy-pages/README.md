# Legacy Pages Test Facade

> **Architecture Notice (Phase 3 & Phase 10):**
> 
> The active, production-grade screens for Wasel Egypt reside in `frontend/src/components/screens/*` and are mounted via Next.js App Router in `frontend/src/app/page.tsx` and `frontend/src/components/wasel-app.tsx`.
> 
> The `.jsx` files in this directory (`frontend/src/pages/`) serve as a historical test facade for Vitest test suites (`src/__tests__/*`).
> In Track 6, all legacy component tests will be progressively consolidated onto the `components/screens/*` test harness.
