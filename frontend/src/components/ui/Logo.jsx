import { useId } from 'react'

/**
 * Wasel Egypt brand mark.
 *
 * Concept: a route polyline folding into a "W" — origin ring at the
 * start, solid destination dot at the end. The mark reads as both a
 * route and the initial of واصل ("arrive / stay connected"), which is
 * the product promise: the journey completes.
 *
 * - `size`: square mark size in px (works 16 → 96).
 * - Works on dark and light surfaces (gradient container + white glyph).
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
      <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${gradientId})`} />
      {/* Route "W": origin ring → fold → fold → destination dot */}
      <path
        d="M10 16.5 C 14 11, 20 15, 24 20 C 28 25, 34 29, 38 24"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 16.5 L 10 31.5 C 14 36.5, 20 32.5, 24 27.5 C 28 22.5, 34 18.5, 38 23.5"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.45"
      />
      <circle cx="10" cy="16.5" r="4.4" fill="#fff" />
      <circle cx="10" cy="16.5" r="1.8" fill="var(--a600, #b98a2f)" />
      <circle cx="38" cy="23.5" r="3.4" fill="var(--a500, #d3a044)" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

/**
 * Full lockup: mark + wordmark. `inverse` renders white text for
 * dark/hero surfaces.
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
                color: inverse ? 'rgba(255,255,255,0.75)' : 'var(--ink500)',
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
