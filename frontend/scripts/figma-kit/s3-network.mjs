/** Screens: metro, lrt, monorail, brt, train, map */
import {
  C, F, text, rect, pill, circle, lineEl, pathEl, polylineEl, g, svgRoot, defsBrand,
  icon, monoTag, lineBadge, statusPill, card, darkCard, chip, pillButton,
  stat, statusBar, appHeader, tabBar, spark, progress, fab,
} from './lib.mjs'

/* ---------- shared network hero ---------- */
function networkHero({ tag, heading, sub, stats, hero }) {
  const W = 390, px = 20, CW = W - px * 2
  const out = []
  let y = 104
  out.push(monoTag(W - px, y, tag, { anchor: 'end' }))
  out.push(text(W - px, y + 34, heading, { size: 23, w: 900, anchor: 'end' }))
  out.push(text(W - px, y + 56, sub, { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }))
  // stats band
  y += 74
  out.push(card(px, y, CW, 74, 'Card-Network-Stats', { fill: C.mist, stroke: C.mercury }))
  stats.forEach(([v, l, accent], i) => {
    const cx = W - px - 22 - i * ((CW - 32) / 4)
    out.push(text(cx, y + 38, v, { fam: F.lat, size: 17, w: 800, anchor: 'end', fill: accent ? C.brand : C.ink }))
    out.push(text(cx, y + 56, l, { size: 8.5, w: 500, fill: C.ash, anchor: 'end' }))
  })
  // line hero card
  y += 90
  out.push(card(px, y, CW, 118, 'Card-Line-Hero', { fill: C.mist, stroke: C.mercury }))
  out.push(lineBadge(W - px - 16, y + 14, hero.code, hero.color, { h: 24 }))
  out.push(statusPill(px + 16, y + 14, hero.status, hero.tone, { h: 24 }))
  out.push(text(W - px - 16, y + 64, hero.title, { size: 15, w: 800, anchor: 'end' }))
  out.push(text(W - px - 16, y + 84, hero.note, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
  hero.stats.forEach(([v, l], i) => {
    const cx = W - px - 16 - i * ((CW - 32) / hero.stats.length)
    out.push(text(cx, y + 104, v, { fam: F.mono, size: 11, w: 700, anchor: 'end', fill: C.slateink }))
    out.push(text(cx - v.length * 6.4 - 6, y + 104, l, { size: 8.5, w: 500, fill: C.fog, anchor: 'end' }))
  })
  return { out, y: y + 134 }
}

/* ---------- line diagram card ---------- */
function diagramCard(y, W, px, CW, color, stations, xLabel = 'المخطط الشبكي للخط') {
  const out = []
  const h = 132
  out.push(card(px, y, CW, h, 'Card-Diagram'))
  out.push(text(W - px - 14, y + 22, xLabel, { size: 11.5, w: 800, anchor: 'end' }))
  out.push(monoTag(px + 14, y + 22, 'SCHEMATIC · NOT TO SCALE', { anchor: 'start', size: 7.5 }))
  const lx = y + 78
  const x0 = px + 30, x1 = W - px - 30
  out.push(lineEl(x0, lx, x1, lx, { stroke: color, sw: 3.5, cap: 'round' }))
  const n = stations.length
  stations.forEach(([name, inter], i) => {
    const sx = x1 - 14 - i * ((x1 - x0 - 28) / (n - 1))
    if (inter) {
      out.push(circle(sx, lx, 7, { fill: '#FFFFFF', stroke: color, sw: 2 }))
      out.push(circle(sx, lx, 3, { fill: '#FFFFFF', stroke: C.ink, sw: 1.4 }))
    } else {
      out.push(circle(sx, lx, 5, { fill: '#FFFFFF', stroke: color, sw: 2 }))
    }
    const above = i % 2 === 0
    out.push(text(sx, above ? lx - 14 : lx + 24, name, { size: 8, w: 600, fill: C.slateink, anchor: 'middle' }))
  })
  out.push(text(W - px - 14, y + h - 10, '○ المحطة المزدوجة = محطة تبديل مع خط آخر', { size: 8, w: 500, fill: C.fog, anchor: 'end' }))
  return out
}

/* ---------- 09 metro ---------- */
export function metro() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'مترو القاهرة', { action: 'train' }))
  const { out, y } = networkHero({
    tag: 'CAIRO METRO NETWORK',
    heading: 'شبكة مترو القاهرة الكبرى',
    sub: 'أول شبكة مترو أنفاق في أفريقيا — أربعة خطوط تخدم أكثر من 100 محطة عاملة.',
    stats: [['4', 'خطوط عاملة'], ['100+', 'محطة'], ['1987', 'بدء التشغيل'], ['4M+', 'راكب يومياً', true]],
    hero: { code: 'L1', color: C.l1, status: 'تداول طبيعي', tone: 'ontime', title: 'الخط الأول — المرج ↔ حلوان', note: '1987 — أول مترو في أفريقيا والشرق الأوسط', stats: [['44.3', 'كم'], ['35', 'محطة'], ['~3', 'د ذروة'], ['1.9M', 'يومياً']] },
  })
  inner.push(...out)
  // line selector pills
  let yy = y
  const lines = [['L1', C.l1, true], ['L2', C.l2], ['L3', C.l3], ['L4', C.l4]]
  lines.forEach(([code, color, active], i) => {
    const w = 66, x = W - px - w - i * (w + 10)
    inner.push(pill(x, yy, w, 32, { fill: active ? color : '#FFFFFF', stroke: active ? color : C.bone, sw: 1 }))
    inner.push(circle(x + w - 14, yy + 16, 3.4, { fill: active ? '#FFFFFF' : color }))
    inner.push(text(x + w / 2 - 6, yy + 20.5, code, { fam: F.mono, size: 11, w: 700, fill: active ? '#FFFFFF' : C.ink, anchor: 'middle' }))
  })
  yy += 46
  // diagram
  inner.push(...diagramCard(yy, W, px, CW, C.l1, [
    ['حلوان'], ['المعادي'], ['دار السلام'], ['الزهراء'], ['الشهداء'], ['السادات', true], ['أنور السادات'], ['المرج'],
  ]))
  yy += 148
  // fares
  inner.push(card(px, yy, CW, 128, 'Card-Fares'))
  inner.push(text(W - px - 14, yy + 24, 'التسعيرة الرسمية — أكتوبر 2024', { size: 12.5, w: 800, anchor: 'end' }))
  const tiers = [['1 – 9 محطات', '8'], ['10 – 16 محطة', '10'], ['17 – 23 محطة', '15'], ['24+ محطة', '20']]
  tiers.forEach(([range, fare], i) => {
    const ry = yy + 40 + i * 21
    inner.push(text(W - px - 14, ry + 10, range, { size: 10.5, w: 600, fill: C.slateink, anchor: 'end' }))
    inner.push(text(px + 14, ry + 10, `${fare} ج.م`, { fam: F.mono, size: 11, w: 700, anchor: 'start', fill: C.ink }))
    if (i < 3) inner.push(lineEl(px + 14, ry + 17, W - px - 14, ry + 17, { stroke: C.mercury, sw: 1 }))
  })
  yy += 144
  // service note
  inner.push(g('Service-Note', [
    pill(px, yy, CW, 38, { fill: C.blueT }),
    icon('clock', W - px - 24, yy + 11, 16, C.info, 1.9),
    text(W - px - 42, yy + 24, 'التداول يومياً من 5:15 ص حتى 12:35 ص تقريباً', { size: 10.5, w: 700, fill: C.info, anchor: 'end' }),
  ].join('')))
  yy += 54
  inner.push(pillButton(px, yy, CW, 48, 'خطط رحلة على الخط الأول', { tone: 'dark', id: 'Btn-Plan-L1' }))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 09 Cairo Metro', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 10/11/12 LRT · Monorail · BRT ---------- */
export function lrt() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'القطار الكهربائي الخفيف', { action: 'tram' }))
  const { out, y } = networkHero({
    tag: 'LIGHT RAIL TRANSIT · LRT',
    heading: 'القطار الكهربائي الخفيف',
    sub: 'يربط القاهرة الجديدة والعاصمة الإدارية بمحور شرقي سريع ومكيف بالكامل.',
    stats: [['19', 'محطة'], ['2022', 'التشغيل'], ['90', 'كم/س'], ['2', 'خطوط مخططة', true]],
    hero: { code: 'LRT', color: C.lrt, status: 'تداول طبيعي', tone: 'ontime', title: 'عدلي منصور ↔ مدينة الفنون والثقافة', note: 'محور شرقي يخدم التجمع والعاصمة الإدارية', stats: [['19', 'محطة'], ['~5', 'د ذروة'], ['12', 'قطار'], ['2022', 'التشغيل']] },
  })
  inner.push(...out)
  inner.push(...diagramCard(y, W, px, CW, C.lrt, [
    ['عدلي منصور'], ['العدل'], ['أبو زعبل'], ['مدينتي'], ['التجمع', true], ['الحي الأول'], ['الفنون'],
  ]))
  let yy = y + 148
  // features
  inner.push(g('Features', [
    text(W - px, yy, 'ليه تختار الـ LRT؟', { size: 13, w: 800, anchor: 'end' }),
    chip(W - px, yy + 12, 'تكييف كامل', { tone: 'mist', h: 30, size: 10, icon: 'zap' }),
    chip(W - px - 122, yy + 12, 'تردد 5 دقائق', { tone: 'mist', h: 30, size: 10, icon: 'clock' }),
    chip(px, yy + 12, 'ربط مباشر للمترو', { tone: 'mist', h: 30, size: 10, icon: 'route' }),
  ].join('')))
  yy += 66
  inner.push(g('Service-Note', [
    pill(px, yy, CW, 38, { fill: C.skyT }),
    icon('clock', W - px - 24, yy + 11, 16, C.lrt, 1.9),
    text(W - px - 42, yy + 24, 'أول قطار 5:30 ص — وأخير قطار 11:30 م', { size: 10.5, w: 700, fill: C.lrt, anchor: 'end' }),
  ].join('')))
  yy += 54
  inner.push(pillButton(px, yy, CW, 48, 'خطط رحلة على الـ LRT', { tone: 'dark', id: 'Btn-Plan-LRT' }))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 10 LRT', C.canvas, defsBrand, inner.join(''))
}

export function monorail() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'المونوريل', { action: 'cable' }))
  const { out, y } = networkHero({
    tag: 'EAST NILE MONORAIL · MNR',
    heading: 'المونوريل — النيل الشرقي',
    sub: 'خط علوي عربي الاتجاه يربط محور محمد نجيب بالعاصمة الإدارية الجديدة.',
    stats: [['22', 'محطة'], ['2023', 'التشغيل'], ['80', 'كم/س'], ['45K', 'راكب/ساعة', true]],
    hero: { code: 'MNR', color: C.mnr, status: 'تداول طبيعي', tone: 'ontime', title: 'محور محمد نجيب ↔ العاصمة الإدارية', note: 'أطول خط مونوريل في العالم — 78 كم مربوطة', stats: [['22', 'محطة'], ['~6', 'د ذروة'], ['78', 'كم'], ['2023', 'التشغيل']] },
  })
  inner.push(...out)
  inner.push(...diagramCard(y, W, px, CW, C.mnr, [
    ['محور محمد نجيب'], ['النادي الأهلي'], ['الميريلاند'], ['التجمع', true], ['الحي الأول'], ['الوزارة'], ['العاصمة'],
  ], 'المخطط الشبكي للخط'))
  let yy = y + 148
  inner.push(g('Features', [
    text(W - px, yy, 'مميزات الخط', { size: 13, w: 800, anchor: 'end' }),
    chip(W - px, yy + 12, 'علوي بالكامل', { tone: 'mist', h: 30, size: 10, icon: 'nav' }),
    chip(W - px - 138, yy + 12, 'قطارات مزدوجة', { tone: 'mist', h: 30, size: 10, icon: 'train' }),
    chip(px, yy + 12, 'إطلالة على القاهرة', { tone: 'mist', h: 30, size: 10, icon: 'eye' }),
  ].join('')))
  yy += 66
  inner.push(pillButton(px, yy, CW, 48, 'خطط رحلة على المونوريل', { tone: 'dark', id: 'Btn-Plan-MNR' }))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 11 Monorail', C.canvas, defsBrand, inner.join(''))
}

export function brt() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'الحافلات السريعة', { action: 'bus' }))
  const { out, y } = networkHero({
    tag: 'RING ROAD BRT',
    heading: 'الحافلات السريعة — الدائري',
    sub: 'مسار سريع حصري على الطريق الدائري بمحطات تفتيش مسبق و أبواب مستوية.',
    stats: [['42', 'محطة'], ['2024', 'التوسعة'], ['24/7', 'التشغيل'], ['120K', 'راكب يومياً', true]],
    hero: { code: 'BRT', color: C.brt, status: 'تداول طبيعي', tone: 'ontime', title: '15 مايو ↔ السلام', note: 'محور دائري حصري — أولوية إشارات على طول المسار', stats: [['42', 'محطة'], ['~4', 'د ذروة'], ['100', 'حافلة'], ['2024', 'التوسعة']] },
  })
  inner.push(...out)
  // ring road visualizer
  const ry = y, rw = CW, rh = 148
  inner.push(card(px, ry, rw, rh, 'Card-Ring-Road'))
  inner.push(text(W - px - 14, ry + 22, 'المسار الدائري', { size: 11.5, w: 800, anchor: 'end' }))
  inner.push(monoTag(px + 14, ry + 22, 'LOOP · 42 STATIONS', { anchor: 'start', size: 7.5 }))
  const cx = W / 2, cy = ry + 84, rrx = 118, rry = 44
  inner.push(rect(cx - rrx, cy - rry, rrx * 2, rry * 2, { stroke: C.brt, sw: 3, rx: 34, dash: '1 0' }))
  const hubs = [['15 مايو', -rrx, 0], ['السلام', rrx, 0], ['التجمع', 0, -rry], ['6 أكتوبر', 0, rry]]
  hubs.forEach(([name, dx, dy]) => {
    inner.push(circle(cx + dx, cy + dy, 7, { fill: '#FFFFFF', stroke: C.brt, sw: 2.4 }))
    inner.push(circle(cx + dx, cy + dy, 2.6, { fill: C.brt }))
    inner.push(text(cx + dx + (dx === 0 ? 12 : dx > 0 ? 14 : -14), cy + dy + (dy === 0 ? 4 : dy < 0 ? -12 : 18), name, { size: 8.5, w: 700, fill: C.slateink, anchor: dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle' }))
  })
  let yy = ry + rh + 14
  inner.push(g('Features', [
    text(W - px, yy, 'مميزات النظام', { size: 13, w: 800, anchor: 'end' }),
    chip(W - px, yy + 12, 'مسار حصري', { tone: 'mist', h: 30, size: 10, icon: 'route' }),
    chip(W - px - 112, yy + 12, 'دفع قبل الصعود', { tone: 'mist', h: 30, size: 10, icon: 'card' }),
    chip(px, yy + 12, 'موقف داخلي', { tone: 'mist', h: 30, size: 10, icon: 'pin' }),
  ].join('')))
  yy += 66
  inner.push(pillButton(px, yy, CW, 48, 'خطط رحلة على الـ BRT', { tone: 'dark', id: 'Btn-Plan-BRT' }))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 12 BRT', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 13 train (ENR) ---------- */
export function train() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'القطارات القومية', { action: 'train' }))
  let y = 104
  inner.push(monoTag(W - px, y, 'EGYPTIAN NATIONAL RAILWAYS', { anchor: 'end' }))
  inner.push(text(W - px, y + 34, 'قطارات وطنية لكل المحافظات', { size: 23, w: 900, anchor: 'end' }))
  inner.push(text(W - px, y + 56, 'من رمسيس وقطاع القاهرة — رحلات يومية للدلتا والصعيد والقناة.', { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }))
  // departures board (dark)
  y += 74
  inner.push(darkCard(px, y, CW, 196, 'Card-Board', { fill: C.dark, rx: 18 }))
  inner.push(monoTag(W - px - 16, y + 24, 'RAMSES · DEPARTURES', { anchor: 'end', fill: C.darkMute }))
  inner.push(text(W - px - 16, y + 46, 'مغادرات اليوم', { size: 14, w: 800, fill: '#FFFFFF', anchor: 'end' }))
  inner.push(pill(px + 16, y + 30, 64, 22, { fill: C.darkLine }))
  inner.push(circle(px + 74, y + 41, 2.6, { fill: C.ontime }))
  inner.push(text(px + 26, y + 45, 'حية', { size: 9.5, w: 700, fill: C.ontime, anchor: 'middle' }))
  const rows = [
    ['طنطا', '09:30', 'على الموعد', 'ontime'],
    ['أسوان', '10:00', 'متأخر 15 د', 'delay'],
    ['إسكندرية', '10:20', 'على الموعد', 'ontime'],
    ['أسيوط', '11:05', 'على الموعد', 'ontime'],
  ]
  rows.forEach(([dest, time, sLabel, tone], i) => {
    const ry = y + 64 + i * 32
    inner.push(text(W - px - 16, ry + 12, `القاهرة ← ${dest}`, { size: 11.5, w: 700, fill: C.darkText, anchor: 'end' }))
    inner.push(text(px + 108, ry + 12, time, { fam: F.mono, size: 12, w: 700, fill: '#FFFFFF', anchor: 'start' }))
    const sColors = { ontime: [C.ontime, C.mint], delay: [C.delay, C.amberT] }
    const [fg, bg] = sColors[tone]
    inner.push(pill(px + 16, ry, 72, 20, { fill: bg, op: 0.92 }))
    inner.push(text(px + 52, ry + 14, sLabel, { size: 8.5, w: 700, fill: fg, anchor: 'middle' }))
    if (i < 3) inner.push(lineEl(px + 16, ry + 26, W - px - 16, ry + 26, { stroke: C.darkLine, sw: 1 }))
  })
  // talgo band
  y += 212
  inner.push(card(px, y, CW, 118, 'Card-Talgo', { fill: C.mist, stroke: C.mercury }))
  inner.push(monoTag(px + 14, y + 24, 'PREMIUM · TALGO', { anchor: 'start' }))
  inner.push(text(W - px - 14, y + 26, 'عربات تالغو المكيفة', { size: 14, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 14, y + 46, 'مقاعد واسعة + واي فاي + خدمة درجة أولى على الخطوط الرئيسية', { size: 10, w: 500, fill: C.ash, anchor: 'end' }))
  inner.push(chip(W - px, y + 62, 'واي فاي', { tone: 'outline', h: 30, size: 10, icon: 'wifi' }))
  inner.push(chip(W - px - 102, y + 62, 'مقاعد واسعة', { tone: 'outline', h: 30, size: 10, icon: 'users' }))
  inner.push(chip(px, y + 62, 'عربة مطعم', { tone: 'outline', h: 30, size: 10, icon: 'msg' }))
  // popular routes
  y += 134
  inner.push(text(W - px, y, 'رحلات شائعة', { size: 13, w: 800, anchor: 'end' }))
  y += 14
  inner.push(card(px, y, (CW - 12) / 2, 64, 'Card-Route-Alex'))
  inner.push(text(W - px - 14, y + 28, 'القاهرة ↔ إسكندرية', { size: 11.5, w: 700, anchor: 'end' }))
  inner.push(text(W - px - 14, y + 46, '2:45 س · من 65 ج.م', { fam: F.mono, size: 9.5, w: 600, fill: C.ash, anchor: 'end' }))
  const x2 = px + (CW - 12) / 2 + 12
  inner.push(card(x2, y, (CW - 12) / 2, 64, 'Card-Route-Aswan'))
  inner.push(text(px + (CW - 12) / 2 + 12 + (CW - 12) / 2 - 14, y + 28, 'القاهرة ← أسوان', { size: 11.5, w: 700, anchor: 'end' }))
  inner.push(text(px + (CW - 12) / 2 + 12 + (CW - 12) / 2 - 14, y + 46, '10 س · من 180 ج.م', { fam: F.mono, size: 9.5, w: 600, fill: C.ash, anchor: 'end' }))
  y += 82
  inner.push(pillButton(px, y, CW, 48, 'احجز رحلتك القادمة', { tone: 'dark', id: 'Btn-Book' }))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 13 National Trains', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 08 map ---------- */
export function mapScreen() {
  const W = 390, H = 844
  const inner = []
  // base
  inner.push(g('Map-Canvas', [
    rect(0, 0, W, H, { fill: C.paper }),
    // street grid
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => lineEl(-20, 90 + i * 110, W + 30, 60 + i * 110, { stroke: '#E4DED2', sw: i % 2 ? 3 : 5 })),
    ...[0, 1, 2, 3, 4].map((i) => lineEl(40 + i * 82, -20, 10 + i * 82, H + 20, { stroke: '#E9E3D8', sw: i % 2 ? 3 : 5 })),
    // nile
    pathEl('M 300 -20 C 250 180 340 320 250 480 C 200 600 230 720 190 864', { stroke: C.nile, sw: 16, cap: 'round' }),
    // ring road
    rect(28, 150, 330, 470, { stroke: C.brt, sw: 2.4, rx: 90, dash: '10 7', fill: 'none' }),
  ].join('')))
  // metro lines
  inner.push(g('Line-L1', [
    polylineEl('20,720 90,640 150,560 205,480 260,400 320,320 372,250', { stroke: C.l1, sw: 4 }),
  ].join('')))
  inner.push(g('Line-L2', [
    polylineEl('40,180 120,250 200,330 280,410 350,470', { stroke: C.l2, sw: 4 }),
  ].join('')))
  inner.push(g('Line-L3', [
    polylineEl('30,560 130,500 230,450 330,420', { stroke: C.l3, sw: 4 }),
  ].join('')))
  inner.push(g('Line-MNR', [
    polylineEl('150,120 220,190 280,270 330,350', { stroke: C.mnr, sw: 3.4 }),
  ].join('')))
  inner.push(g('Line-LRT', [
    polylineEl('250,120 300,200 340,290', { stroke: C.lrt, sw: 3 }),
  ].join('')))
  // interchange + stations
  const inter = [[200, 330], [230, 450], [280, 410]]
  inter.forEach(([sx, sy]) => {
    inner.push(circle(sx, sy, 7, { fill: '#FFFFFF', stroke: C.ink, sw: 1.6 }))
    inner.push(circle(sx, sy, 3, { fill: C.ink }))
  })
  const stops = [[90, 640], [150, 560], [205, 480], [260, 400], [320, 320], [120, 250], [350, 470], [130, 500], [330, 420], [220, 190], [300, 200]]
  stops.forEach(([sx, sy]) => inner.push(circle(sx, sy, 4.6, { fill: '#FFFFFF', stroke: C.ink, sw: 1.4 })))
  // search overlay
  inner.push(g('Map-Search', [
    pill(20, 58, 350, 46, { fill: '#FFFFFF', stroke: C.bone, sw: 1 }),
    icon('search', 334, 71, 18, C.ash, 2),
    text(310, 86, 'ابحث عن محطة أو عنوان', { size: 12, w: 500, fill: C.fog, anchor: 'end' }),
    icon('sliders', 34, 71, 18, C.ink, 2),
  ].join('')))
  // line filter chips
  const chips = [['الكل', 'dark', 46], ['L1', 'blue', 42], ['L3', 'blue', 42], ['MNR', 'blue', 52], ['BRT', 'blue', 48]]
  let cxr = W - 20
  chips.forEach(([label, tone, w]) => {
    inner.push(pill(cxr - w, 116, w, 30, { fill: tone === 'dark' ? C.ink : '#FFFFFF', stroke: tone === 'dark' ? C.ink : C.bone, sw: 1, op: tone === 'dark' ? 1 : 0.92 }))
    inner.push(text(cxr - w / 2, 136, label, { size: 10.5, w: 700, fill: tone === 'dark' ? '#FFFFFF' : C.ink, anchor: 'middle', fam: label.startsWith('L') || label === 'BRT' ? F.mono : F.ar }))
    cxr -= w + 8
  })
  // locate + zoom controls
  inner.push(g('Map-Controls', [
    circle(44, 470, 21, { fill: C.onyx }),
    icon('crosshair', 33, 459, 22, '#FFFFFF', 2),
    rect(28, 520, 32, 32, { fill: '#FFFFFF', stroke: C.bone, sw: 1, rx: 10 }),
    icon('plus', 36, 528, 16, C.ink, 2),
    rect(28, 556, 32, 32, { fill: '#FFFFFF', stroke: C.bone, sw: 1, rx: 10 }),
    text(36, 578, '—', { size: 14, w: 700, fill: C.ink, anchor: 'start' }),
  ].join('')))
  // station bottom panel
  const py = 636
  inner.push(card(20, py, 350, 158, 'Card-Station-Panel', { stroke: C.bone }))
  inner.push(lineBadge(W - 36, py + 14, 'MNR', C.mnr, { h: 24 }))
  inner.push(text(W - 36 - 70, py + 31, 'محطة النصير', { size: 14.5, w: 800, anchor: 'end' }))
  inner.push(statusPill(36, py + 14, 'تداول طبيعي', 'ontime', { h: 24, anchor: 'start' }))
  inner.push(text(W - 36, py + 54, 'المونوريل — النيل الشرقي · 6 محطات بعده', { size: 10, w: 500, fill: C.ash, anchor: 'end' }))
  inner.push(monoTag(36, py + 78, 'NEXT ARRIVALS', { anchor: 'start', size: 8 }))
  inner.push(text(36, py + 100, '03:20 · 06:45 · 09:10', { fam: F.mono, size: 14, w: 700, anchor: 'start' }))
  inner.push(pillButton(W - 36 - 150, py + 112, 150, 36, 'خطط من هنا', { tone: 'dark', id: 'Btn-From-Here' }))
  inner.push(pillButton(36, py + 112, 92, 36, 'التفاصيل', { tone: 'outline', id: 'Btn-Details' }))
  inner.push(tabBar('map'))
  return svgRoot(W, H, 'Wasel / 08 Live Map', C.paper, defsBrand, inner.join(''))
}
