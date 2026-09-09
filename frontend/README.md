# Wasel Egypt — Frontend

React 18 + Vite SPA consuming the Wasel Egypt Laravel API (`routes/api.php`, base `/api/v1`).

- Design source of truth: `../docs/design/UIUX_DESIGN_SPEC.md` + `wasel-design-system.html`
- Tokens live in `src/styles/tokens.css` (exact values from the approved design system)
- API endpoints registry: `src/api/endpoints.js` (backend endpoints only — nothing invented)

## Commands

```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # production build → dist/
npm run preview   # serve the production build
```

Edit `src/i18n/en.json` and `src/i18n/ar.json` (source of truth), then run
`node src/i18n/gen.js` from `frontend/` to regenerate `dictionaries.js`.
The generator requires identical EN/AR keys; never edit the generated file by hand.

## Environment

Copy `.env.example` → `.env` and point `VITE_API_BASE_URL` at the Laravel backend
(default `http://127.0.0.1:8000/api/v1`, matching `php artisan serve`).

## Structure

```
src/
├─ api/        client, endpoint registry, auth API
├─ auth/       AuthContext (session, roles, 401 handling)
├─ components/ ui/ (design-system components), layout/ (shells)
├─ i18n/       en/ar dictionaries + RTL-aware language provider
├─ pages/      one file per route (feature modules extend these)
├─ routes/     route map + guards (public/guest/protected/role)
└─ styles/     tokens.css, base.css, components.css
```

Status: **foundation complete** — journey search and other feature modules land next.
