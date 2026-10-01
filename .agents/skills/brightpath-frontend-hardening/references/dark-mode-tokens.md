# BrightPath Dark-Mode Token Map (verified 2026-08-21)

How dark mode is applied: `ThemeContext.jsx` adds class `dark` to `<html>` and `dark-theme` to `<body>`. `namaa-forest-night.css` overrides tokens under both `:root[data-theme="namaa-forest-night"], .dark` and `body.dark-theme`.

## Dark-safe tokens (use these in new code)
- Surfaces / text:
  - `--white` → namaa-surface
  - `--gray-50` → namaa-bg
  - `--gray-100`, `--gray-200` → namaa-border
  - `--gray-300` → namaa-input
  - `--gray-400`, `--gray-500` → namaa-text-muted
  - `--gray-600`, `--gray-800` → namaa-text
  - `--color-gray-50` .. `--color-gray-950` (same swap family)
- Brand / action:
  - `--color-action` → namaa-green `#74d84a`
  - `--color-action-strong` → `#23312c`
  - `--color-action-soft` → use `rgba(116,216,74,0.14)` in dark
  - `--color-paper` → namaa-bg
- Accents: `--green-500` → namaa-green, `--amber-500` → namaa-amber, plus `--green-100/200`, `--amber-100/200`.
- Shape / shadow: `--radius` (0.75rem), `--radius-sm` (8px — defined in `brightpath.css`), `--shadow-sm` (darkened), `--shadow-md`, `--shadow-lg`.
- Status: `--color-success-600` (`#039855`, in `index.css`), `--color-warning-*`, `--color-danger-*`.

## Forbidden tokens (undefined anywhere → light-only fallbacks → dark-mode blindness)
Never use in new code:
`--bg-card`, `--text-color`, `--border-color`, `--text-muted`, `--action-green`, `--bg-surface-elevated`, `--action-green-light`, `--card-bg`, `--color-bg-surface`.

If you see any of these in a component, that component is dark-mode blind and must be migrated to the dark-safe tokens above.

## Legacy (has its own dark override — reuse the class, don't copy the raw values)
- `ProfessionalDatePicker` label uses `var(--text-color, #0f172a)`.
- `bp-form-control` (forms.css) uses hardcoded `#f8fafc` / `#0f172a` but is corrected by `body.dark-theme .bp-form-control`.
- `.dark` and `body.dark-theme` both activate the theme; override selectors under either.
