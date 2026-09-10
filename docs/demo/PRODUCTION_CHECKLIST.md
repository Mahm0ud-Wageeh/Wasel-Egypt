# Wasel Egypt — Production Checklist

**Audience:** whoever deploys this project beyond local demo.
**Principle:** no code change needed to deploy — only environment, secrets,
and operating decisions below. Verify each box before going live.

## 1. Environment
- [ ] Copy `.env.example` → `.env` (never commit `.env`; it is git-ignored).
- [ ] `APP_ENV=production`, **`APP_DEBUG=false`**.
- [ ] `APP_URL` = public backend origin (https).
- [ ] Generate a fresh `APP_KEY` (`php artisan key:generate`); never reuse
      the local/dev key.
- [ ] `DB_*` point at the production database (not XAMPP defaults);
      run `php artisan migrate --force`.
- [ ] Frontend: set `VITE_API_BASE_URL` to the public API origin and
      `VITE_MAP_TILES_URL` to the production tile endpoint (or keep OSM
      within its usage policy), then `npm run build`.

## 2. Secrets & accounts
- [ ] **Rotate the seeded admin** (`admin@example.com` / `password` from
      `DatabaseSeeder`): change the password immediately, or seed with a
      strong one. The seeder comment already flags this.
- [ ] Sanctum tokens currently **do not expire** (package default; no
      `config/sanctum.php` published). For production, publish the config
      (`php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"`)
      and set a token lifetime (e.g. `SANCTUM_EXPIRATION=1440`); confirm the
      client's 401 → re-login path (already implemented) covers expiry UX.
      Deliberately NOT enabled by default: expiry without a refresh flow
      would force logouts.
- [ ] Confirm no `.env`, `*.key`, or `auth.json` files are tracked
      (`git ls-files | grep -i env` should show only `*.example`).
- [ ] Remove or restrict dev artisan tooling (`debug:logout` creates and
      deletes `test@%` users — harmless without shell access, but it has no
      production purpose).

## 3. CORS & frontend origins
- [ ] Set `FRONTEND_URL` to the production SPA origin; add any extra origins
      via `CORS_EXTRA_ORIGIN_1/2`. Dev Vite hosts stay baked into
      `config/cors.php` and are harmless in production (allow-list only).

## 4. External services
- [ ] **OSRM:** run the self-hosted foot-profile server and set `OSRM_URL`.
      If unreachable, the planner degrades to straight-line walk estimates
      (labeled in UI) — decide whether that fallback is acceptable live.
- [ ] **Photon geocoder:** default public instance is throttled + cached
      server-side (10/min/IP). For real traffic, self-host per
      `LICENSES_AND_ATTRIBUTIONS.md` §5c.
- [ ] **Map tiles:** OSM standard tiles are fine for demo volume; production
      traffic needs a keyed provider (`VITE_MAP_TILES_URL`) or self-hosted
      tileserver. Never use `{r}` tokens (MapLibre requests them literally).
- [ ] `GTFS_RT_*` stay empty/disabled — no Egyptian realtime feed exists;
      the reader is inert until configured.

## 5. Data & licenses (all documented in `docs/demo/LICENSES_AND_ATTRIBUTIONS.md`)
- [ ] TfC GTFS (mdb-3355) CC-BY-NC-SA-2.0 — non-commercial use only; footer
      attribution present; share-alike covers derived schedule data.
- [ ] Metro fares (mdb-3354, Oct-2024 8/10/15/20 EGP) — UI attribution
      ("TfC via Mobility Database") present on every metro fare.
- [ ] OSM data/tiles ODbL — map attribution control + footer present.
- [ ] Confirm footer + map attribution survive any re-theme.

## 6. Operations
- [ ] Do NOT serve the API with single-threaded `php artisan serve` in
      production (it serializes long planning requests). Use php-fpm/Octane
      or equivalent concurrent PHP.
- [ ] `php artisan schedule`/`queue` only if notifications move off sync
      dispatch (currently synchronous — fine for demo scale).
- [ ] `storage/` and `bootstrap/cache/` writable by the web user.
- [ ] Backups for MySQL (GTFS + fares + user data).

## 7. Pre-launch verification (repeatable)
- [ ] `php artisan test` green · `npm test` green · `npm run build` green.
- [ ] Walk `docs/demo/DEMO_CHECKLIST.md` end-to-end on the production build.
- [ ] Spot-check EN + AR at 390 / 768 / 1440 with zero console errors.
