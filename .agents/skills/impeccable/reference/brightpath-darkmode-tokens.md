# BrightPath / Namaa Journey — Dark-Mode Token Discipline

Project-specific knowledge for running `impeccable` passes on the BrightPath
(Namaa Journey) frontend. The codebase has a recurring dark-mode-blindness bug
class that the generic detector does not catch, because it is *not* an inline
style — it is a **semantic-token resolution gap** that only breaks at runtime
in dark mode.

## The one rule that prevents 90% of regressions here

**Never introduce a UI surface that relies on undefined CSS custom properties,
and never use the legacy token names.** Resolve every color/background via a
token that the Forest Night dark theme actually overrides.

### Tokens that are DEFINED and dark-mode-safe (prefer these)
All are overridden inside `:root[data-theme="namaa-forest-night"], .dark` and
`body.dark-theme` in `frontend/src/styles/namaa-forest-night.css`:

- Surfaces/text: `--white`, `--gray-50`, `--gray-100`, `--gray-200`,
  `--gray-300`, `--gray-400`, `--gray-500`, `--gray-600`, `--gray-800`,
  `--color-gray-100..900` (the `--color-` prefixed set is the canonical one;
  the bare `--gray-N` set is legacy and partly inconsistent — prefer
  `--color-gray-*`).
- Brand/action: `--color-action` (→ `--namaa-green` in dark),
  `--color-success-600`, `--color-warning-*`, `--color-danger-*`.
- Shape: `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`,
  `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
- Forest Night direct palette: `--namaa-bg`, `--namaa-surface`, `--namaa-card`,
  `--namaa-border`, `--namaa-text`, `--namaa-text-muted`, `--namaa-green`,
  `--namaa-green-foreground` (good for high-contrast text *on* the green chip).

### Tokens that are UNDEFINED / legacy — DO NOT USE
These appear in old inline styles across the repo and silently fall back to a
hardcoded light value, breaking dark mode:

`--bg-card`, `--text-color`, `--border-color`, `--text-muted`, `--action-green`,
`--bg-surface-elevated`, `--action-green-light`, `--card-bg`, `--color-bg-surface`.

If you see `var(--text-color, #0f172a)` etc., that fallback is the bug.

### The sharp edge that bit us
`ProfessionalDatePicker.jsx` (shared, used by attendance/grades/daily-reviews)
used `var(--gray-200, #e2e8f0)` for chip backgrounds and
`var(--gray-700, #334155)` for chip text. In dark mode, inside a feature that
does NOT import `finance.css`, `--gray-700` was undefined → fell back to the
dark `#334155`, while `--gray-200` resolved to `var(--namaa-border)` = `#394235`.
Result: dark-on-dark text, **contrast 1.01** (catastrophic). The fix was to
move the component to class-based CSS (`professional-date-picker.css`) using
`--color-gray-200` / `--color-gray-400` plus explicit `body.dark-theme`
overrides, lifting the chip contrast to 6.13.

Lesson: bare `--gray-N` tokens are NOT uniformly overridden; the `--color-gray-N`
set is the reliable one. When re-skinning a shared component, add explicit
`body.dark-theme .<scope>` overrides rather than trusting bare tokens.

### The "white island" pitfall (second sharp edge)
Floating surfaces whose background is a **hardcoded light color with no dark
override** glow white on the dark page. This is the most common *remaining*
dark-mode defect after the undefined-token class is fixed, because the
background is a literal hex, not a token — so it never resolves to anything
dark. Seen this session on:

- `GlobalStudentSearch.jsx` modal + results dropdown: `background: #ffffff`,
  `color: #0f172a` inline → replaced with classes in
  `global-student-search.css` + `body.dark-theme` overrides
  (`--gss-surface: #1d231b`, ink `#eef1e8`; contrast 14.05).
- `grades.css` `.grades-publish-banner.draft` / `.published`: `background:
  #fffbeb` / `#ecfdf3` with dark `--color-hierarchy` text → added
  `body.dark-theme` overrides switching to dark surfaces + light text.

Fix pattern (reproduce): move the surface to class-based CSS, then add
explicit `body.dark-theme .<scope>` rules that set `background` to a dark
value (`var(--color-gray-100, #1d231b)` or a Forest-Night hue) and `color` to
`var(--color-gray-800, #eef1e8)` / `var(--color-gray-400, #aab29f)`. Keep the
light palette for `@media print` so exported PDFs stay light.

Lesson: when auditing a surface, grep the *background* (not just `color:` /
`var(--text`) — any literal `#fff*` / `#fdf*` / `#ecf*` with no dark override
is a white-island bug waiting to ship.

### The "stale view" trap (verification reality)
After a correct fix, `npm run build` and `detect.mjs → []` can BOTH pass while
the user still reports "لسه ما اتصلحتش" (still not fixed). Cause: they are
viewing a **stale dev server or un-refreshed build** — new CSS imports need a
full reload, not just HMR. The agent cannot self-verify live because
`browser_exec` blocks `localhost` / private addresses, and the app needs auth.
Mitigation: when you are confident the code is correct (all checks below pass),
explicitly tell the user to **hard-refresh (Ctrl+Shift+R) or restart
`npm run dev`** — do not assume the screenshot they paste is current. Do not
re-edit correct code in response to a stale screenshot; confirm with them first.

## Verification that worked (reproduce)
1. `node .agents/skills/impeccable/scripts/context.mjs --target <file>` first.
2. Inspect `frontend/src/styles/namaa-forest-night.css` for the token you plan
   to use — confirm it is overridden under `.dark` / `body.dark-theme`. If a
   bare `--gray-N` is all that exists, prefer the `--color-gray-N` equivalent.
3. Author a dedicated `<feature>.css`, import it in the component file
   (`import '../../styles/<feature>.css'`), and replace inline styles with
   classes — including the *background* on any modal/dropdown/banner. Keep
   bilingual AR/EN copy and RTL support intact (CLAUDE.md rule: brightpath.css
   classes only, no inline styles, no Tailwind in app UI).
4. Verify: `npm run build` (must pass), then
   `node .agents/skills/impeccable/scripts/detect.mjs --json <file>` → expect `[]`.
5. Contrast sanity-check: compute WCAG ratios for the resolved dark-mode colors
   with a quick Python `lum()`/`ratio()` helper (see `scripts/contrast-check.mjs`
   if present, else inline). This caught the 1.01-vs-6.13 and white-island cases
   without a live browser.
6. Tell the user to hard-refresh / restart dev server before judging the result.

## Verification gotchas
- `impeccable detect` on a `.jsx` returns `[]` when there are zero inline-style /
  dark-mode / a11y anti-patterns — that is the PASS signal, not empty output.
- The detector does NOT resolve CSS custom properties; it only flags inline
  `style=` and static patterns. Token-resolution dark-mode bugs slip past it,
  so the manual token-audit above is mandatory on this project.
- `search_files` mis-parses a leading `--` as a CLI flag; use `terminal` +
  `grep -e "--token:"` or a plain substring like `bg-card` instead.
