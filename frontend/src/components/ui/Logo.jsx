import { useId } from 'react'

/**
 * Wasel Egypt brand mark (design system v3 §2 — "the route is the letter").
 *
 * A route polyline drawn as a W: origin dot at the start of the path, a
 * rising-and-falling transit route, and a gold destination dot at the
 * highest vertex — the journey ends at gold. Solid --p900 badge (no
 * gradient), white route, origin ring bottom-left, gold destination top.
 *
 * - `size`: square mark size in px (works 16 → 96; legible at 24).
 * - Works on dark and light surfaces.
 * - `title` renders a tooltip/accessibility label.
 */
export function LogoMark({ size = 32, className = '', title }) {
  const gradientId = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      {...(title ? { 'aria-label': title } : {})}
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--p900, #0e3a5f)" />
          <stop offset="1" stopColor="var(--p600, #1a6bb0)" />
        </linearGradient>
      </defs>
      {/* Badge — solid Nile Blue, no gradient (design v3) */}
      <rect x="1" y="1" width="46" height="46" rx="11" fill={`url(#${gradientId})`} />
      {/* Route "W": origin → fold → fold → destination at the apex */}
      <path
        d="M12 34 L18 15 L25 31 L33 15"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Origin: white core ring at the path start */}
      <circle cx="12" cy="34" r="2.6" fill="#fff" />
      {/* Destination: gold dot with white ring — the journey ends at gold */}
      <circle cx="33" cy="15" r="3.6" fill="var(--a500, #d3a044)" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * Full lockup: mark + wordmark. `inverse` renders white text for
 * dark/hero surfaces. Subtitle uses Desert Gold on dark surfaces and
 * AA-safe --a800 on light surfaces (design v3 §3.2).
 */
export function Logo({ size = 30, inverse = false, showWordmark = true, subtitle, className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <LogoMark size={size} />
      {showWordmark && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: size * 0.58,
              letterSpacing: '-0.02em',
              color: inverse ? '#fff' : 'var(--p900)',
            }}
          >
            Wasel
          </span>
          {subtitle && (
            <span
              style={{
                fontWeight: 600,
                fontSize: size * 0.3,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: inverse ? 'var(--a500)' : 'var(--a800, #7d5c1e)',
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
