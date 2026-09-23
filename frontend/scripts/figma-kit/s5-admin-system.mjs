/** Screens: design-system board, admin ops console (desktop 1440x900) */
import {
  C, F, text, rect, pill, circle, lineEl, pathEl, polylineEl, g, svgRoot, defsBrand,
  icon, monoTag, lineBadge, statusPill, card, darkCard, chip, pillButton,
  stat, spark, progress, toggle, logo, logoMark, field, statusBar,
} from './lib.mjs'

/* ---------- 01 design system ---------- */
export function designSystem() {
  const W = 1440, px = 80
  const inner = []
  let y = 96
  inner.push(logo(W - px, y - 24, { size: 40 }))
  inner.push(monoTag(px, y - 40, 'WASEL DESIGN SYSTEM · V2.4', { anchor: 'start' }))
  inner.push(text(px, y - 12, 'Colors', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  y += 24
  // neutrals
  const neutrals = [['canvas', '#FFFFFF'], ['mist', C.mist], ['mercury', C.mercury], ['bone', C.bone], ['cloud', C.cloud], ['fog', C.fog], ['ash', C.ash], ['slateink', C.slateink], ['carbon', C.carbon], ['ink', C.ink], ['onyx', C.onyx], ['brand', C.brand]]
  inner.push(g('Swatches-Neutrals', neutrals.map(([n, c], i) => {
    const sx = W - px - (i % 12) * 107 - 96
    const sy = y + Math.floor(i / 12) * 96
    return [
      rect(sx, sy, 96, 60, { fill: c, stroke: C.bone, sw: 1, rx: 12 }),
      text(sx + 48, sy + 78, n, { fam: F.mono, size: 10, w: 600, fill: C.slateink, anchor: 'middle' }),
    ].join('')
  }).join('')))
  y += 200
  // line colors
  const lines = [['L1', C.l1, '#1D4ED8'], ['L2', C.l2, '#DC2626'], ['L3', C.l3, '#16A34A'], ['L4', C.l4, '#EA580C'], ['LRT', C.lrt, '#0284C7'], ['MNR', C.mnr, '#7C3AED'], ['BRT', C.brt, '#D97706'], ['ENR', C.enr, '#991B1B'], ['WALK', C.walk, '#64748B']]
  inner.push(g('Swatches-Lines', lines.map(([code, c, hex], i) => {
    const sx = W - px - i * 142 - 132
    return [
      rect(sx, y, 132, 74, { fill: c, rx: 14 }),
      text(sx + 66, y + 96, code, { fam: F.mono, size: 12, w: 700, fill: C.ink, anchor: 'middle' }),
      text(sx + 66, y + 112, hex, { fam: F.mono, size: 9.5, w: 500, fill: C.ash, anchor: 'middle' }),
    ].join('')
  }).join('')))
  y += 156
  inner.push(lineEl(px, y, W - px, y, { stroke: C.bone, sw: 1 }))
  y += 40
  // typography
  inner.push(text(px, y - 12, 'Typography', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  inner.push(g('Type-Scale', [
    text(W - px, y + 26, 'واصل مصر — القاهرة كلها في جيبك', { size: 40, w: 900, anchor: 'end' }),
    text(px, y + 26, 'Cairo Black 900 · 40', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 74, 'خطط رحلتك عبر القاهرة الكبرى', { size: 28, w: 800, anchor: 'end' }),
    text(px, y + 74, 'Cairo ExtraBold 800 · 28', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 112, 'رادار حالة الشبكة والمغادرات اللحظية', { size: 20, w: 700, anchor: 'end' }),
    text(px, y + 112, 'Cairo Bold 700 · 20', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 144, 'مواعيد حية لكل خطوط الشبكة — مترو، قطار خفيف، مونوريل وحافلات سريعة', { size: 15, w: 500, fill: C.slateink, anchor: 'end' }),
    text(px, y + 144, 'Cairo Medium 500 · 15 — Body', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 174, 'وزارة النقل: تسعيرة موحدة على خطوط المترو اعتباراً من أكتوبر', { fam: F.taj, size: 14, w: 400, fill: C.slateink, anchor: 'end' }),
    text(px, y + 174, 'Tajawal Regular 400 · 14', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 210, 'Aa Bb Cc 0123456789 — WSL-1JO4', { fam: F.lat, size: 18, w: 800, anchor: 'end' }),
    text(px, y + 210, 'Plus Jakarta Sans 800 · 18 — Latin', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
    text(W - px, y + 244, '09:52:14  01:36  16.00 EGP', { fam: F.mono, size: 16, w: 600, anchor: 'end', fill: C.ink }),
    text(px, y + 244, 'JetBrains Mono 600 · 16 — Numeric', { fam: F.mono, size: 10, w: 500, fill: C.fog, anchor: 'start' }),
  ].join('')))
  y += 284
  inner.push(lineEl(px, y, W - px, y, { stroke: C.bone, sw: 1 }))
  y += 40
  // buttons
  inner.push(text(px, y - 12, 'Buttons', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  inner.push(g('Buttons', [
    pillButton(W - px - 210, y, 210, 54, 'ابدأ رحلتك الآن', { tone: 'dark', icon: 'arrowL', id: 'Btn-Primary' }),
    pillButton(W - px - 440, y, 200, 54, 'اشحن المحفظة', { tone: 'brand', id: 'Btn-Brand' }),
    pillButton(W - px - 660, y, 190, 54, 'استكشف الشبكة', { tone: 'outline', id: 'Btn-Outline' }),
    pillButton(W - px - 870, y, 180, 54, 'متابعة', { tone: 'ghost', id: 'Btn-Ghost' }),
    circle(W - px - 950, y + 27, 27, { fill: C.mist }),
    icon('bell', W - px - 960, y + 17, 20, C.ink, 1.9),
    circle(W - px - 1020, y + 27, 27, { fill: C.ink }),
    icon('search', W - px - 1030, y + 17, 20, '#FFFFFF', 1.9),
  ].join('')))
  y += 88
  // badges + status
  inner.push(text(px, y - 12, 'Badges & Status', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  inner.push(g('Badges', lines.map(([code, c], i) => lineBadge(W - px - i * 120, y, code, c, { anchor: 'end' })).join('')))
  y += 56
  inner.push(g('Status-Pills', [
    statusPill(W - px, y, 'تداول طبيعي', 'ontime'),
    statusPill(W - px - 150, y, 'ازدحام مرتفع', 'delay'),
    statusPill(W - px - 310, y, 'صيانة مجدولة', 'info'),
    statusPill(W - px - 460, y, 'متأخر 3 د', 'delay'),
    statusPill(W - px - 590, y, 'مغلقة', 'closed'),
    statusPill(W - px - 690, y, 'مكتملة', 'neutral'),
  ].join('')))
  y += 76
  // inputs & cards
  inner.push(text(px, y - 12, 'Inputs & Cards', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  inner.push(g('Inputs', [
    field(W - px - 380, y + 10, 380, 48, '', 'إلى أين رايح النهارده؟', { ph: C.fog, icon: 'search', idNum: 'Input-Search' }),
    field(W - px - 820, y + 10, 380, 48, 'من', 'المعادي', { dot: true, dotColor: C.interactive, idNum: 'Input-Filled' }),
    chip(W - px, y + 74, 'مترو', { tone: 'dark', h: 34 }),
    chip(W - px - 70, y + 74, 'قطار خفيف', { tone: 'outline', h: 34 }),
    chip(W - px - 180, y + 74, 'مشي', { tone: 'outline', h: 34 }),
    toggle(160, y + 84, true, 'Sample-Toggle'),
    text(216, y + 100, 'إشعارات', { size: 11, w: 600, fill: C.slateink, anchor: 'start' }),
  ].join('')))
  y += 132
  inner.push(g('Card-Samples', [
    card(W - px - 360, y, 360, 120, 'Sample-Card-Flat'),
    text(W - px - 24, y + 34, 'بطاقة بيضاء — حد شعري 1px', { size: 13, w: 700, anchor: 'end' }),
    text(W - px - 24, y + 58, 'الظل ممنوع — التسلسل بالحدود والمسافات', { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }),
    card(W - px - 740, y, 360, 120, 'Sample-Card-Mist', { fill: C.mist, stroke: C.mercury }),
    text(W - px - 404, y + 34, 'بطاقة ضبابية — Mist', { size: 13, w: 700, anchor: 'end' }),
    text(W - px - 404, y + 58, 'للإحصاءات والمناطق الثانوية', { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }),
    darkCard(W - px - 1120, y, 360, 120, 'Sample-Card-Dark', { rx: 16 }),
    text(W - px - 784, y + 34, 'لوحة داكنة — Dark Panel', { size: 13, w: 700, fill: C.darkText, anchor: 'end' }),
    text(W - px - 784, y + 58, 'للكونسول واللوحات الحية', { size: 10.5, w: 500, fill: C.darkMute, anchor: 'end' }),
    pill(W - px - 1470, y + 30, 310, 60, { fill: 'none', stroke: 'url(#wb)', sw: 2 }),
    text(W - px - 1315, y + 66, 'Conic Border — Brand', { size: 12, w: 700, fill: C.brand, anchor: 'middle' }),
  ].join('')))
  y += 152
  inner.push(lineEl(px, y, W - px, y, { stroke: C.bone, sw: 1 }))
  y += 40
  // icons
  inner.push(text(px, y - 12, 'Icons — Lucide Stroke 2px', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  const iconSet = ['home', 'search', 'pin', 'map', 'nav', 'bell', 'user', 'clock', 'history', 'ticket', 'wallet', 'card', 'star', 'sliders', 'alert', 'msg', 'phone', 'lock', 'eye', 'logout', 'qr', 'wifi', 'zap', 'activity', 'gauge', 'calendar', 'train', 'tram', 'cable', 'bus', 'route', 'shield', 'share', 'heart', 'users', 'sparkle', 'leaf', 'crosshair', 'updown', 'walk']
  inner.push(g('Icon-Grid', iconSet.map((n, i) => {
    const ix = W - px - (i % 20) * 66 - 40
    const iy = y + Math.floor(i / 20) * 66
    return [
      circle(ix, iy, 22, { fill: C.mist }),
      icon(n, ix - 11, iy - 11, 22, C.ink, 1.8),
    ].join('')
  }).join('')))
  y += 158
  // radii
  inner.push(text(px, y - 12, 'Radii', { fam: F.lat, size: 26, w: 800, anchor: 'start', fill: C.ink }))
  inner.push(g('Radii', [['8', 8], ['12', 12], ['16', 16], ['20', 20], ['24', 24], ['999', 999]].map(([r, v], i) => {
    const rx = W - px - i * 150 - 120
    const h = v === 999 ? 56 : Math.min(56, v * 2)
    return [
      rect(rx, y + (56 - h) / 2, 120, h, { stroke: C.ink, sw: 1.4, rx: Math.min(v, h / 2), fill: C.mist }),
      text(rx + 60, y + 80, r + 'px', { fam: F.mono, size: 10, w: 600, fill: C.slateink, anchor: 'middle' }),
    ].join('')
  }).join('')))
  return svgRoot(W, y + 130, 'Wasel / 01 Design System', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 19 admin (desktop 1440x900, dark) ---------- */
export function admin() {
  const W = 1440, H = 900, px = 48
  const inner = []
  // top bar
  inner.push(g('Top-Bar', [
    rect(0, 0, W, 64, { fill: '#05070F' }),
    logo(W - px, 32, { size: 30, dark: true }),
    monoTag(W - px - 190, 28, 'NETWORK OPERATIONS CENTER', { anchor: 'end', fill: C.darkMute, size: 8.5 }),
    text(px, 30, '10:05:25', { fam: F.mono, size: 15, w: 700, fill: '#FFFFFF', anchor: 'start' }),
    monoTag(px, 46, 'CAIRO · UTC+2', { anchor: 'start', fill: C.darkMute, size: 7.5 }),
    pill(px + 150, 18, 96, 28, { fill: 'rgba(22,163,74,0.14)' }),
    circle(px + 166, 32, 3, { fill: C.ontime }),
    text(px + 196, 36.5, 'OK · 100%', { fam: F.mono, size: 10, w: 700, fill: C.ontime, anchor: 'middle' }),
    text(px + 266, 36, 'عودة للتطبيق ←', { size: 11, w: 600, fill: C.darkMute, anchor: 'start' }),
  ].join('')))
  // heading
  let y = 106
  inner.push(g('Heading', [
    text(W - px, y, 'مركز عمليات الشبكة — لوحة القياس الحية', { size: 27, w: 900, fill: '#FFFFFF', anchor: 'end' }),
    monoTag(px, y - 20, 'RESTRICTED · ROLE ADMIN', { anchor: 'start', fill: C.darkMute, size: 8.5 }),
    text(W - px, y + 26, 'مراقبة لحظية لضغط الأحمال والانقطاعات — بمزامنة تلقائية مع بيانات GTFS', { size: 11, w: 500, fill: C.darkMute, anchor: 'end' }),
  ].join('')))
  // KPI cards ×5
  y += 48
  const kpis = [
    ['التزام الشبكة', '94.6%', '+2.1%', C.ontime, C.interactive, 1],
    ['ركاب اليوم', '1,284', '+1.4%', C.ontime, C.brand, 2],
    ['إجمالي الشهر', '4.82M', '+1.4%', C.ontime, C.ontime, 3],
    ['حوادث مفتوحة', '6', '-2', C.info, C.delay, 5],
    ['متوسط التأخير', '3.2 د', '-0.3%', C.ontime, C.interactive, 4],
  ]
  const kw = (W - px * 2 - 4 * 14) / 5
  inner.push(g('KPI-Row', kpis.map(([label, value, delta, dTone, sparkColor, seed], i) => {
    const kx = W - px - (i + 1) * kw - i * 14
    return [
      darkCard(kx, y, kw, 128, `KPI-${i + 1}`, { rx: 14 }),
      text(kx + kw - 16, y + 26, label, { size: 10.5, w: 600, fill: C.darkMute, anchor: 'end' }),
      pill(kx + 16, y + 14, 62, 20, { fill: dTone === 'ontime' ? 'rgba(22,163,74,0.14)' : dTone === 'delay' ? 'rgba(217,119,6,0.14)' : 'rgba(0,145,255,0.14)' }),
      text(kx + 47, y + 28, delta, { fam: F.mono, size: 9, w: 700, fill: dTone, anchor: 'middle' }),
      text(kx + kw - 16, y + 62, value, { fam: F.lat, size: 25, w: 800, fill: '#FFFFFF', anchor: 'end' }),
      spark(kx + 14, y + 78, kw - 28, 34, sparkColor, seed, { sw: 1.8 }),
    ].join('')
  }).join('')))
  // ops table
  y += 152
  inner.push(darkCard(px, y, W - px * 2, 560, 'Panel-Ops', { fill: C.dark, rx: 16 }))
  inner.push(g('Ops-Head', [
    text(W - px - 24, y + 32, 'حالة الخطوط — بت حي', { size: 14.5, w: 800, fill: '#FFFFFF', anchor: 'end' }),
    circle(W - px - 226, y + 27, 4, { fill: C.ontime }),
    monoTag(px + 24, y + 32, 'LIVE OPERATIONS · DENSITY 7/10', { anchor: 'start', fill: C.darkMute, size: 8.5 }),
  ].join('')))
  // table header — columns (RTL, right to left)
  const cols = [
    ['الخط', W - px - 24, 'end'], ['الحالة', W - px - 290, 'end'], ['الالتزام', W - px - 440, 'end'],
    ['الانقطاع', W - px - 560, 'end'], ['قطارات عاملة', W - px - 680, 'end'], ['مؤشر الحمل', px + 60, 'start'],
  ]
  inner.push(g('Ops-Table-Head', cols.map(([label, x, anchor]) => text(x, y + 66, label, { size: 10, w: 600, fill: '#5A6090', anchor })).join('')))
  const data = [
    ['L1', C.l1, 'الخط الأول — المترو', 'تداول طبيعي', 'ontime', '98.3%', '3.2 د', '22', '92%', 92, C.l1],
    ['L2', C.l2, 'الخط الثاني — المترو', 'ازدحام مرتفع', 'delay', '93.0%', '3.5 د', '44', '85%', 85, C.l2],
    ['L3', C.l3, 'الخط الثالث — المترو', 'تداول طبيعي', 'ontime', '90.4%', '3.0 د', '101', '46%', 46, C.l3],
    ['L4', C.l4, 'الخط الرابع — المترو', 'صيانة مجدولة', 'info', '95.6%', '3.0 د', '39', '69%', 69, C.l4],
    ['LRT', C.lrt, 'القطار الكهربائي الخفيف', 'تداول طبيعي', 'ontime', '96.8%', '2.7 د', '114', '81%', 81, C.lrt],
    ['MNR', C.mnr, 'المونوريل — النيل الشرقي', 'تداول طبيعي', 'ontime', '91.1%', '5.2 د', '43', '83%', 83, C.mnr],
    ['BRT', C.brt, 'الحافلات السريعة — الدائري', 'تداول طبيعي', 'ontime', '93.7%', '2.5 د', '24', '82%', 82, C.brt],
    ['ENR', C.enr, 'السكك الحديدية المصرية', 'تداول طبيعي', 'ontime', '89.6%', '2.7 د', '120', '92%', 92, C.enr],
  ]
  inner.push(g('Ops-Rows', data.map(([code, color, name, sLabel, tone, commit, drop, trains, load, pct, loadColor], i) => {
    const ry = y + 88 + i * 55
    const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
    const parts = [rect(px + 16, ry - 10, W - px * 2 - 32, 50, { fill: rowBg, rx: 10 })]
    parts.push(lineBadge(W - px - 24, ry - 6, code, color, { h: 24 }))
    parts.push(text(W - px - 90, ry + 10, name, { size: 11.5, w: 700, fill: C.darkText, anchor: 'end' }))
    const tones = { ontime: [C.ontime, 'rgba(22,163,74,0.13)'], delay: [C.delay, 'rgba(217,119,6,0.14)'], info: [C.info, 'rgba(0,145,255,0.13)'] }
    const [fg, bg] = tones[tone]
    parts.push(pill(W - px - 396, ry - 2, 106, 26, { fill: bg }))
    parts.push(circle(W - px - 386, ry + 11, 2.8, { fill: fg }))
    parts.push(text(W - px - 308, ry + 15, sLabel, { size: 9.5, w: 700, fill: fg, anchor: 'end' }))
    parts.push(text(W - px - 440, ry + 10, commit, { fam: F.mono, size: 11.5, w: 700, fill: C.darkText, anchor: 'end' }))
    parts.push(text(W - px - 560, ry + 10, drop, { fam: F.mono, size: 11, w: 600, fill: C.darkMute, anchor: 'end' }))
    parts.push(text(W - px - 680, ry + 10, trains, { fam: F.lat, size: 11.5, w: 700, fill: C.darkText, anchor: 'end' }))
    // load bar
    parts.push(rect(px + 60, ry + 4, 150, 12, { fill: 'rgba(255,255,255,0.06)', rx: 6 }))
    parts.push(rect(px + 60, ry + 4, Math.max(10, 150 * pct / 100), 12, { fill: loadColor, rx: 6 }))
    parts.push(text(px + 226, ry + 10, load, { fam: F.mono, size: 10.5, w: 700, fill: C.darkMute, anchor: 'start' }))
    if (i < data.length - 1) parts.push(lineEl(px + 16, ry + 44, W - px - 16, ry + 44, { stroke: C.darkLine, sw: 1 }))
    return parts.join('')
  }).join('')))
  // footer
  inner.push(g('Footer', [
    monoTag(px, H - 26, 'WASEL OPS · GTFS-RT FEED · LAST SYNC 00:00:04', { anchor: 'start', fill: '#3A4070', size: 8.5 }),
    monoTag(W - px, H - 26, 'STAGE 5 — NETWORK CONTROL', { anchor: 'end', fill: '#3A4070', size: 8.5 }),
  ].join('')))
  return svgRoot(W, H, 'Wasel / 19 Admin Ops Console', C.dark, defsBrand, inner.join(''))
}
