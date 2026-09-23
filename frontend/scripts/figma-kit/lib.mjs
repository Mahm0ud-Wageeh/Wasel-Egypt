/**
 * Wasel Egypt — Figma Kit SVG library.
 * Primitives + official design tokens. Output SVGs import into Figma as
 * fully editable layers (named groups, real text, vector icons).
 */

export const C = {
  canvas: '#FFFFFF',
  onyx: '#090C1D',
  carbon: '#2A2A2A',
  ink: '#202020',
  slateink: '#646464',
  ash: '#838383',
  fog: '#B3B3B3',
  cloud: '#D4D4D4',
  bone: '#E8E8E8',
  mist: '#F8F9FA',
  mercury: '#EEEEEE',
  brand: '#6647F0',
  interactive: '#0091FF',
  // official line tokens
  l1: '#1D4ED8', l2: '#DC2626', l3: '#16A34A', l4: '#EA580C',
  lrt: '#0284C7', mnr: '#7C3AED', brt: '#D97706', enr: '#991B1B', walk: '#64748B',
  // status tints
  mint: '#E9F7EE', amberT: '#FCF3E2', redT: '#FDECEC', blueT: '#E7F4FF',
  violetT: '#F0EBFF', grayT: '#F4F4F4', skyT: '#E5F5FB',
  ontime: '#16A34A', delay: '#D97706', closed: '#DC2626', info: '#0091FF',
  // dark panel
  dark: '#0B0E23', darkCard: '#12162E', darkLine: '#252A4E',
  darkText: '#EEF0FF', darkMute: '#8A90B8',
  nile: '#D8E9F8', paper: '#F3EFE7',
}

export const F = { ar: 'Cairo', taj: 'Tajawal', lat: 'Plus Jakarta Sans', mono: 'JetBrains Mono' }

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const r2 = (n) => Math.round(n * 100) / 100

/** sanitize for xml id */
export const uid = (s) => String(s).replace(/[^\w\-\/ .]/g, '').trim().replace(/\s+/g, '-')

/* ---------- primitives ---------- */

export function text(x, y, str, o = {}) {
  const { size = 14, w = 500, fam = F.ar, fill = C.ink, anchor = 'start', ls, op } = o
  return `<text x="${r2(x)}" y="${r2(y)}" font-family="${fam}" font-size="${size}" font-weight="${w}" fill="${fill}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}${op != null ? ` opacity="${op}"` : ''}>${esc(str)}</text>`
}

export function rect(x, y, w, h, o = {}) {
  const { fill = 'none', stroke, sw = 1, rx = 0, dash, op } = o
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}` : ''}${op != null ? ` opacity="${op}"` : ''}/>`
}

export const pill = (x, y, w, h, o = {}) => rect(x, y, w, h, { rx: h / 2, ...o })

export function circle(cx, cy, r, o = {}) {
  const { fill = 'none', stroke, sw = 1, dash, op } = o
  return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}` : ''}${op != null ? ` opacity="${op}"` : ''}/>`
}

export function lineEl(x1, y1, x2, y2, o = {}) {
  const { stroke = C.bone, sw = 1, dash, cap, op } = o
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${cap ? ` stroke-linecap="${cap}"` : ''}${op != null ? ` opacity="${op}"` : ''}/>`
}

export function pathEl(d, o = {}) {
  const { fill = 'none', stroke, sw = 2, dash, cap = 'round', join = 'round', op } = o
  return `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="${cap}" stroke-linejoin="${join}"` : ''}${op != null ? ` opacity="${op}"` : ''}/>`
}

export function polylineEl(points, o = {}) {
  const { stroke = C.ink, sw = 1.6, dash, op } = o
  return `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"${op != null ? ` opacity="${op}"` : ''}/>`
}

export function g(id, inner, o = {}) {
  const { op } = o
  return `<g id="${uid(id)}"${op != null ? ` opacity="${op}"` : ''}>${inner}</g>`
}

export function svgRoot(w, h, id, bg, defs, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><title>${esc(id)}</title>${defs ? `<defs>${defs}</defs>` : ''}${rect(0, 0, w, h, { fill: bg })}${inner}</svg>`
}

export const defsBrand = `<linearGradient id="wb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.brand}"/><stop offset="1" stop-color="${C.interactive}"/></linearGradient>`

/* ---------- icon set (lucide-style, 24x24 stroke) ---------- */

export const ICONS = {
  home: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  search: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
  pin: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  map: `<path d="M14.1 5.6a2 2 0 0 0 1.8 0l3.6-1.8A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.6 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0z"/><path d="M15 5.8v15"/><path d="M9 3.2v15"/>`,
  nav: `<polygon points="3 11 22 2 13 21 11 13 3 11"/>`,
  crosshair: `<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>`,
  bell: `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
  user: `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  history: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`,
  ticket: `<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>`,
  wallet: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>`,
  card: `<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>`,
  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  sliders: `<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>`,
  alert: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  msg: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  phone: `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`,
  mail: `<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  eye: `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>`,
  qr: `<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21h.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16h.01"/><path d="M16 12h1"/><path d="M21 12h.01"/><path d="M12 21h.01"/>`,
  wifi: `<path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><line x1="12" x2="12.01" y1="20" y2="20"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  activity: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
  gauge: `<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>`,
  calendar: `<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>`,
  train: `<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 9h14"/><path d="M9 14h.01"/><path d="M15 14h.01"/><path d="m8 21 1.5-4"/><path d="m16 21-1.5-4"/>`,
  tram: `<rect x="5" y="4" width="14" height="12" rx="2"/><path d="M5 10h14"/><path d="M12 2v2"/><path d="m8 21 1-5"/><path d="m16 21-1-5"/>`,
  cable: `<path d="M3 5h18"/><path d="M12 5v4"/><rect x="7" y="9" width="10" height="8" rx="2"/><path d="m9 21 1-4"/><path d="m15 21-1-4"/>`,
  bus: `<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 9h16"/><path d="M10 3v6"/><path d="M14 3v6"/><path d="m7 21 1-4"/><path d="m17 21-1-4"/><path d="M8 14h.01"/><path d="M16 14h.01"/>`,
  route: `<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>`,
  shield: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`,
  share: `<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>`,
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
  refresh: `<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>`,
  globe: `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>`,
  download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`,
  moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  help: `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>`,
  briefcase: `<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>`,
  walk: `<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>`,
  chevD: `<path d="m6 9 6 6 6-6"/>`,
  chevL: `<path d="m15 18-6-6 6-6"/>`,
  chevR: `<path d="m9 18 6-6-6-6"/>`,
  arrowL: `<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>`,
  arrowR: `<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`,
  updown: `<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>`,
  x: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  checkC: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  plus: `<path d="M5 12h14"/><path d="M12 5v14"/>`,
  mic: `<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>`,
  sparkle: `<path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z"/>`,
  leaf: `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`,
  signal: `<path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>`,
  battery: `<rect width="16" height="10" x="2" y="7" rx="2"/><line x1="22" x2="22" y1="11" y2="13"/>`,
  eyeOff: `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>`,
  play: `<polygon points="6 3 20 12 6 21 6 3"/>`,
  chevsL: `<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>`,
}

/** lucide-style icon, placed at x,y with visual size, consistent stroke */
export function icon(name, x, y, size = 20, color = C.ink, sw = 2) {
  const s = size / 24
  const w = r2((sw * 24) / size)
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s)})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</g>`
}

/* ---------- composite helpers ---------- */

/** mono uppercase tag (latin only) */
export function monoTag(x, y, str, o = {}) {
  const { fill = C.ash, anchor = 'start', size = 9 } = o
  return text(x, y, str.toUpperCase(), { fam: F.mono, size, w: 600, fill, anchor, ls: 1.4 })
}

/** official line badge: pill + dot + mono code */
export function lineBadge(xRight, y, code, color, o = {}) {
  const { h = 22, anchor = 'end' } = o
  const w = Math.max(40, 22 + code.length * 8.5)
  const x = anchor === 'end' ? xRight - w : xRight
  const cy = y + h / 2
  return g(`Badge-${code}`, [
    pill(x, y, w, h, { fill: '#FFFFFF', stroke: color, sw: 1.2 }),
    circle(x + w - 13, cy, 3.4, { fill: color }),
    text(x + w - 20, cy + 3.6, code, { fam: F.mono, size: 10.5, w: 700, fill: color, anchor: 'end', ls: 0.5 }),
  ].join(''))
}

/** small tinted status pill */
export function statusPill(xRight, y, label, tone, o = {}) {
  const tones = {
    ontime: { fg: C.ontime, bg: C.mint }, delay: { fg: C.delay, bg: C.amberT },
    closed: { fg: C.closed, bg: C.redT }, info: { fg: C.info, bg: C.blueT },
    neutral: { fg: C.slateink, bg: C.grayT }, brand: { fg: C.brand, bg: C.violetT },
  }
  const t = tones[tone] || tones.neutral
  const { h = 22, size = 10.5, anchor = 'end', dot = true } = o
  const tw = label.length * 5.6 + 30
  const x = anchor === 'end' ? xRight - tw : xRight
  const cy = y + h / 2
  return g(`Status-${label}`, [
    pill(x, y, tw, h, { fill: t.bg }),
    ...(dot ? [circle(x + tw - 13, cy, 2.8, { fill: t.fg })] : []),
    text(x + (dot ? tw - 20 : tw - 9), cy + 3.6, label, { fam: F.ar, size, w: 600, fill: t.fg, anchor: 'end' }),
  ].join(''))
}

/** horizontal section head: title right, action left */
export function sectionHead(y, title, action, o = {}) {
  const { W = 390, px = 20, actionIcon } = o
  const parts = [text(W - px, y, title, { size: 16, w: 800 })]
  if (action) {
    const aw = action.length * 6
    parts.push(text(px + (actionIcon ? 22 : 0), y, action, { size: 11, w: 500, fill: C.ash, anchor: 'start' }))
    if (actionIcon) parts.push(icon(actionIcon, px, y - 13, 15, C.ash, 1.8))
  }
  return g(`Section-${title}`, parts.join(''))
}

/** white flat card (ClickUp hairline) */
export const card = (x, y, w, h, id, o = {}) => g(id, rect(x, y, w, h, { fill: o.fill || '#FFFFFF', stroke: o.stroke || C.bone, sw: 1, rx: o.rx ?? 16 }))

/** dark card */
export const darkCard = (x, y, w, h, id, o = {}) => g(id, rect(x, y, w, h, { fill: o.fill || C.darkCard, stroke: o.stroke || C.darkLine, sw: 1, rx: o.rx ?? 14 }))

/** field input */
export function field(x, y, w, h, label, value, o = {}) {
  const { dot, dotColor = C.interactive, fill = '#FFFFFF', ph = C.fog, vColor = C.ink, icon: ic, idNum = 'Field' } = o
  const parts = [rect(x, y, w, h, { fill, stroke: C.bone, sw: 1, rx: 12 })]
  if (dot) parts.push(circle(x + w - 16, y + h / 2, 4, { fill: dotColor }))
  if (ic) parts.push(icon(ic, x + w - 30, y + h / 2 - 9, 18, C.ash, 1.8))
  parts.push(text(x + 14, y + h / 2 + 4.5, value, { size: 12.5, w: 600, fill: value ? vColor : ph }))
  if (label) parts.push(text(x + w - (dot ? 28 : 42), y - 6, label, { size: 10.5, w: 600, fill: C.slateink, anchor: 'end' }))
  return g(idNum, parts.join(''))
}

/** filter chip */
export function chip(xRight, y, label, o = {}) {
  const { tone = 'outline', h = 30, anchor = 'end', size = 11, icon: ic } = o
  const tones = {
    outline: { bg: '#FFFFFF', fg: C.ink, st: C.bone }, dark: { bg: C.ink, fg: '#FFFFFF' },
    mist: { bg: C.mist, fg: C.ink }, brand: { bg: C.brand, fg: '#FFFFFF' },
    blue: { bg: C.blueT, fg: C.l1 }, mint: { bg: C.mint, fg: C.ontime },
  }
  const t = tones[tone] || tones.outline
  const tw = label.length * 6.4 + (ic ? 34 : 26)
  const x = anchor === 'end' ? xRight - tw : xRight
  const cy = y + h / 2
  return g(`Chip-${label}`, [
    pill(x, y, tw, h, { fill: t.bg, stroke: tone === 'outline' ? C.bone : undefined, sw: 1 }),
    ...(ic ? [icon(ic, x + tw - 22, cy - 8, 16, t.fg, 1.8)] : []),
    text(x + (ic ? 10 : tw / 2), cy + 4, label, { size, w: 600, fill: t.fg, anchor: ic ? 'start' : 'middle' }),
  ].join(''))
}

/** primary dark pill button with optional icon */
export function pillButton(x, y, w, h, label, o = {}) {
  const { tone = 'dark', icon: ic, id: bid = 'Btn' } = o
  const tones = { dark: { bg: C.ink, fg: '#FFFFFF' }, brand: { bg: C.brand, fg: '#FFFFFF' }, outline: { bg: '#FFFFFF', fg: C.ink, st: C.bone }, ghost: { bg: C.mist, fg: C.ink } }
  const t = tones[tone] || tones.dark
  const parts = [pill(x, y, w, h, { fill: t.bg, stroke: t.st, sw: 1 })]
  const hasIcon = ic && ICONS[ic]
  if (hasIcon) parts.push(icon(ic, x + 16, y + h / 2 - 10, 20, t.fg, 2))
  parts.push(text(x + w / 2 + (hasIcon ? 8 : 0), y + h / 2 + 5.5, label, { size: 14, w: 700, fill: t.fg, anchor: 'middle' }))
  return g(bid, parts.join(''))
}

/** tiny stat: big value + small label */
export function stat(xRight, y, value, label, o = {}) {
  const { fill = C.ink, anchor = 'end', size = 20, lsize = 9.5, lfill = C.ash } = o
  return g(`Stat-${label}`, [
    text(xRight, y, value, { fam: F.lat, size, w: 800, fill, anchor }),
    text(xRight, y + 14, label, { size: lsize, w: 500, fill: lfill, anchor }),
  ].join(''))
}

/** sparkline zigzag */
export function spark(x, y, w, h, color, seed = 3, o = {}) {
  const { sw = 1.6 } = o
  const n = 10, pts = []
  for (let i = 0; i <= n; i++) {
    const v = Math.sin(i * 1.7 + seed) * 0.5 + Math.sin(i * 0.8 + seed * 2) * 0.35 + 0.5
    pts.push(`${r2(x + i * (w / n))},${r2(y + h - v * h)}`)
  }
  return g(`Spark`, polylineEl(pts.join(' '), { stroke: color, sw }))
}

/** toggle switch */
export function toggle(x, y, on, id) {
  return g(id || 'Toggle', [
    rect(x, y, 40, 22, { fill: on ? C.brand : C.cloud, rx: 11 }),
    circle(on ? x + 29 : x + 11, y + 11, 8, { fill: '#FFFFFF' }),
  ].join(''))
}

/** progress bar */
export function progress(x, y, w, h, pct, color, id) {
  return g(id || 'Progress', [
    rect(x, y, w, h, { fill: C.mercury, rx: h / 2 }),
    rect(x, y, Math.max(6, (w * pct) / 100), h, { fill: color, rx: h / 2 }),
  ].join(''))
}

/** wasel logo mark (dark rounded square + brand wave) */
export function logoMark(cx, cy, size, o = {}) {
  const { bg = C.onyx, wave = C.brand } = o
  const s = size, x = cx - s / 2, y = cy - s / 2
  return g('Logo-Mark', [
    rect(x, y, s, s, { fill: bg, rx: s * 0.3 }),
    pathEl(`M ${cx - s * 0.28} ${cy + s * 0.1} L ${cx - s * 0.1} ${cy - s * 0.22} L ${cx + s * 0.08} ${cy + s * 0.14} L ${cx + s * 0.26} ${cy - s * 0.18}`, { stroke: wave, sw: s * 0.11, cap: 'round', join: 'round' }),
    circle(cx + s * 0.26, cy + s * 0.24, s * 0.05, { fill: C.interactive }),
  ].join(''))
}

/** wordmark + mark, RTL lockup */
export function logo(xRight, cy, o = {}) {
  const { size = 34, dark = false } = o
  const fg = dark ? '#FFFFFF' : C.ink
  const mark = logoMark(xRight - size / 2, cy, size)
  return g('Logo', [
    mark,
    text(xRight - size - 8, cy + 1, 'واصل مصر', { size: 15.5, w: 800, fill: fg, anchor: 'end' }),
    monoTag(xRight - size - 8, cy + 13, 'WASEL EGYPT', { fill: dark ? C.darkMute : C.ash, anchor: 'end', size: 7.5 }),
  ].join(''))
}

/* ---------- phone chrome ---------- */

export function statusBar(dark = false) {
  const fg = dark ? '#FFFFFF' : C.ink
  const bars = [0, 1, 2, 3].map((i) => rect(296 + i * 5.5, 18 - i * 2.2, 3.4, 6 + i * 2.2, { fill: fg, rx: 1 })).join('')
  return g('Status-Bar', [
    text(26, 22, '9:41', { fam: F.lat, size: 13, w: 700, fill: fg }),
    bars,
    icon('wifi', 322, 8, 16, fg, 2),
    rect(348, 9.5, 22, 11, { stroke: fg, sw: 1, rx: 3.5, fill: 'none', op: 0.5 }),
    rect(350, 11.5, 13, 7, { fill: fg, rx: 1.5 }),
  ].join(''))
}

/** mobile app header with back chevron (RTL: back points right) */
export function appHeader(y, title, o = {}) {
  const { action = 'bell', W = 390, dark = false, actionLabel } = o
  const fg = dark ? '#FFFFFF' : C.ink
  const muted = dark ? C.darkMute : C.ash
  const parts = []
  parts.push(circle(W - 44, y + 20, 20, { fill: dark ? C.darkCard : C.mist }))
  parts.push(icon('chevR', W - 51, y + 13, 16, fg, 2))
  parts.push(text(W / 2, y + 26, title, { size: 16.5, w: 800, fill: fg, anchor: 'middle' }))
  if (actionLabel) {
    parts.push(text(30, y + 25, actionLabel, { size: 11.5, w: 600, fill: muted, anchor: 'start' }))
  } else if (action && ICONS[action]) {
    parts.push(circle(44, y + 20, 20, { fill: dark ? C.darkCard : C.mist }))
    parts.push(icon(action, 34, y + 10, 20, fg, 2))
  }
  return g('App-Header', parts.join(''))
}

/** bottom tab bar — 5 tabs, RTL order (first = rightmost) */
export function tabBar(active = 'home') {
  const tabs = [
    ['home', 'الرئيسية'], ['route', 'المسارات'], ['map', 'الخريطة'],
    ['history', 'السجل'], ['user', 'حسابي'],
  ]
  const y = 754
  const parts = [
    rect(0, y, 390, 90, { fill: '#FFFFFF', op: 0.94 }),
    lineEl(0, y, 390, y, { stroke: C.bone, sw: 1 }),
  ]
  tabs.forEach(([ic, label], i) => {
    const cx = 351 - i * 78
    const on = active === ic
    const col = on ? C.ink : C.fog
    parts.push(icon(ic === 'route' ? 'route' : ic === 'map' ? 'map' : ic === 'history' ? 'history' : ic, cx - 11, y + 16, 22, col, on ? 2.2 : 1.9))
    parts.push(text(cx, y + 56, label, { size: 9.5, w: on ? 700 : 500, fill: on ? C.ink : C.ash, anchor: 'middle' }))
  })
  parts.push(rect(127, y + 66, 136, 5, { fill: C.ink, rx: 2.5, op: 0.85 }))
  return g('Tab-Bar', parts.join(''))
}

/** FAB with conic brand ring */
export function fab(x, y, o = {}) {
  const { size = 54 } = o
  return g('FAB', [
    circle(x + size / 2, y + size / 2, size / 2 + 3, { fill: 'none', stroke: 'url(#wb)', sw: 2 }),
    circle(x + size / 2, y + size / 2, size / 2, { fill: C.onyx }),
    icon('sparkle', x + size / 2 - 11, y + size / 2 - 11, 22, '#FFFFFF', 1.8),
  ].join(''))
}
