/** Screens: cover, welcome, home */
import {
  C, F, text, rect, pill, circle, lineEl, pathEl, polylineEl, g, svgRoot, defsBrand,
  icon, monoTag, lineBadge, statusPill, sectionHead, card, darkCard, chip, pillButton,
  stat, spark, statusBar, appHeader, tabBar, fab, logo, logoMark, field, progress,
} from './lib.mjs'

/* ---------- 00 cover ---------- */
export function cover() {
  const W = 1200, H = 780
  const lines = [
    ['L1', C.l1], ['L2', C.l2], ['L3', C.l3], ['L4', C.l4], ['LRT', C.lrt],
    ['MNR', C.mnr], ['BRT', C.brt], ['ENR', C.enr], ['WALK', C.walk],
  ]
  const inner = []
  // top hairline frame
  inner.push(rect(60, 60, W - 120, H - 120, { stroke: C.bone, sw: 1, rx: 28 }))
  inner.push(rect(60, 60, W - 120, 6, { fill: 'url(#wb)', rx: 3, op: 0.9 }))
  // logo
  inner.push(logoMark(W / 2 - 44, 190, 56))
  inner.push(text(W / 2 + 26, 200, 'واصل مصر', { size: 40, w: 900, anchor: 'middle', fill: C.ink }))
  inner.push(monoTag(W / 2, 236, 'WASEL EGYPT', { anchor: 'middle', size: 11 }))
  // titles
  inner.push(text(W / 2, 330, 'Wasel Egypt — Figma Design Kit', { fam: F.lat, size: 44, w: 800, anchor: 'middle', fill: C.onyx }))
  inner.push(text(W / 2, 378, 'منصة النقل الذكي للقاهرة الكبرى — 20 لوحة قابلة للتعديل بالكامل', { size: 17, w: 600, fill: C.slateink, anchor: 'middle' }))
  inner.push(monoTag(W / 2, 412, 'SVG · EDITABLE LAYERS · RTL-FIRST · 390×844 + 1440×900', { anchor: 'middle', size: 10, fill: C.ash }))
  // line strip
  const stripW = 900, seg = stripW / 9
  inner.push(g('Line-Colors', lines.map(([code, color], i) => [
    rect(W / 2 - stripW / 2 + i * seg + 6, 480, seg - 12, 58, { fill: color, rx: 12 }),
    text(W / 2 - stripW / 2 + i * seg + seg / 2, 566, code, { fam: F.mono, size: 11, w: 600, fill: C.slateink, anchor: 'middle' }),
  ].join('')).join('')))
  // chips row
  inner.push(text(W / 2, 646, 'Cairo · Tajawal · Plus Jakarta Sans · JetBrains Mono — خطوط جوجل متاحة تلقائياً في فيجما', { size: 12.5, w: 500, fill: C.ash, anchor: 'middle' }))
  inner.push(monoTag(W / 2, 690, 'IMPORT: DRAG & DROP SVG FILES INTO FIGMA CANVAS', { anchor: 'middle', fill: C.fog }))
  return svgRoot(W, H, 'Wasel / 00 Cover', C.canvas, defsBrand, g('Cover', inner.join('')))
}

/* ---------- 02 welcome ---------- */
export function welcome() {
  const W = 390, px = 20
  const inner = []
  // announcement bar
  inner.push(g('Announcement', [
    rect(0, 0, W, 38, { fill: C.onyx }),
    icon('msg', W - 30, 11, 16, C.interactive, 1.8),
    text(W - 44, 23, 'جديد: الخط الرابع بدأ التشغيل التجريبي بين الحرام والتجمع', { size: 10.5, w: 600, fill: '#FFFFFF', anchor: 'end' }),
  ].join('')))
  inner.push(statusBar())
  // header
  inner.push(g('Header', [
    logo(W - px, 76),
    pillButton(px, 56, 108, 40, 'ابدأ رحلتك', { tone: 'dark', id: 'Btn-Start' }),
    text(px + 120, 81, 'دخول', { size: 12.5, w: 700, anchor: 'start' }),
  ].join('')))
  lineEl(0, 112, W, 112, { stroke: C.bone, sw: 1 })
  // hero
  let y = 158
  inner.push(g('Hero', [
    pill(W - px - 118, y - 15, 118, 28, { fill: C.violetT }),
    icon('sparkle', W - px - 20, y - 8, 14, C.brand, 2),
    text(W - px - 30, y + 4, 'منصة النقل الذكي للقاهرة الكبرى', { size: 10, w: 700, fill: C.brand, anchor: 'end' }),
    monoTag(px + 6, y + 4, 'GTFS-RT READY', { anchor: 'start', fill: C.fog, size: 8 }),
    text(W - px, y + 66, 'القاهرة كلهاا...', { size: 37, w: 900, anchor: 'end' }),
    text(W - px, y + 108, 'في جيبك', { size: 37, w: 900, anchor: 'end', fill: C.brand }),
    text(W - px, y + 140, 'واصل مصر — مخطط رحلات موحد يجمع المترو والقطار', { size: 12, w: 500, fill: C.slateink, anchor: 'end' }),
    text(W - px, y + 158, 'الكهربائي الخفيف والمونوريل والحافلات السريعة؛ مواعيد', { size: 12, w: 500, fill: C.slateink, anchor: 'end' }),
    text(W - px, y + 176, 'لحظية، وخريطة واحدة لكل وسائل المواصلات.', { size: 12, w: 500, fill: C.slateink, anchor: 'end' }),
  ].join('')))
  // checklist
  y += 206
  const feats = [
    ['وصول لحظي', 'مواعيد حية لكل خطوط الشبكة — مستمرة من مستشعرات التداول'],
    ['أرخص مسار', 'مقارنة الأجرة الرسمية بين المترو والمواصلات السريعة'],
    ['بدون انتظار', 'عدّاد تنازلي قبل وصول مواصلتك، وحلول بديلة فورية عند أي تأخير'],
  ]
  inner.push(g('Features', feats.map(([t, d], i) => {
    const fy = y + i * 44
    return [
      circle(W - px - 10, fy - 4, 10, { fill: C.mist }),
      icon('check', W - px - 15.5, fy - 9.5, 12, C.ink, 2.4),
      text(W - px - 30, fy, t, { size: 12.5, w: 800, anchor: 'end' }),
      text(W - px - 30, fy + 16, d, { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }),
    ].join('')
  }).join('')))
  // CTAs
  y += 152
  inner.push(g('CTA-Row', [
    pillButton(W - px - 206, y, 206, 52, 'ابدأ رحلتك الآن', { tone: 'dark', icon: 'arrowL', id: 'CTA-Primary' }),
    pillButton(px, y, 138, 52, 'استكشف الشبكة', { tone: 'outline', id: 'CTA-Secondary' }),
  ].join('')))
  // quick destinations
  y += 84
  inner.push(g('Quick-Destinations', [
    text(W - px, y, 'وجهات سريعة:', { size: 11.5, w: 700, anchor: 'end', fill: C.slateink }),
    chip(W - px - 96, y - 12, 'مطار القاهرة الدولي', { tone: 'outline', icon: 'pin', h: 32 }),
    chip(W - px - 96, y + 30, 'مدينتي', { tone: 'outline', icon: 'pin', h: 32 }),
    chip(W - px - 96 - 92, y + 30, 'التجمع الخامس', { tone: 'outline', icon: 'pin', h: 32 }),
  ].join('')))
  inner.push(fab(px + 4, 788))
  inner.push(text(W / 2, 826, '© واصل مصر 2024 — هيئة النقل الذكي', { size: 9, w: 500, fill: C.fog, anchor: 'middle' }))
  return svgRoot(W, 844, 'Wasel / 02 Welcome', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 03 home ---------- */
export function home() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(g('Header', [
    circle(W - px - 22, 76, 22, { fill: C.mist }),
    icon('user', W - px - 32, 66, 20, C.slateink, 1.8),
    text(W - px - 54, 66, 'الأربعاء، ٢٣ سبتمبر', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }),
    text(W - px - 54, 90, 'صباح الخير', { size: 24, w: 900, anchor: 'end' }),
    text(W - px - 54, 108, 'جاهز لرحلة اليوم؟ الشبكة تعمل بكامل طاقتها', { size: 10.5, w: 500, fill: C.ash, anchor: 'end' }),
    circle(px + 22, 76, 20, { fill: C.mist }),
    icon('bell', px + 12, 66, 20, C.ink, 1.8),
    circle(px + 30, 62, 4, { fill: C.closed }),
  ].join('')))
  // planner card
  let y = 134
  inner.push(card(px, y, CW, 148, 'Card-Trip-Planner'))
  inner.push(monoTag(px + 14, y + 26, 'TRIP PLANNER', { anchor: 'start' }))
  inner.push(text(W - px - 14, y + 27, 'إلى أين تريد الذهاب اليوم؟', { size: 13, w: 800, anchor: 'end' }))
  inner.push(field(px + 14, y + 40, CW - 28, 40, 'من', '', { dot: true, dotColor: C.interactive, ph: C.fog, idNum: 'Field-From' }))
  inner.push(text(px + 14 + CW - 28 - 16, y + 64, 'محطة الانطلاق...', { size: 11.5, w: 500, fill: C.fog, anchor: 'end' }))
  inner.push(g('Swap', [
    circle(px + CW / 2, y + 92, 16, { fill: '#FFFFFF', stroke: C.bone, sw: 1 }),
    icon('updown', px + CW / 2 - 8, y + 84, 16, C.ink, 1.8),
  ].join('')))
  inner.push(field(px + 14, y + 104 - 26, CW - 28, 40, '', '', { dot: true, dotColor: C.ontime, ph: C.fog, idNum: 'Field-To' }))
  inner.push(text(px + 14 + CW - 28 - 16, y + 42 + 66, 'وينصردهالم؟ رحلك في القاهرة الكبرى...', { size: 11.5, w: 500, fill: C.fog, anchor: 'end' }))
  // CTA
  y += 168
  inner.push(g('CTA', [
    pillButton(px, y, CW, 48, 'ابعت علي رحلات', { tone: 'dark', icon: 'search', id: 'Btn-Search' }),
  ].join('')))
  // radar card
  y += 68
  inner.push(card(px, y, CW, 224, 'Card-Radar'))
  inner.push(text(W - px - 14, y + 26, 'رادار حالة الشبكة', { size: 13.5, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 14, y + 42, 'الخطوط العاملة الآن في القاهرة الكبرى', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
  inner.push(chip(px + 14, y + 12, 'آخر تحديث: منذ دقائق', { tone: 'mist', icon: 'refresh', h: 26, size: 9 }))
  const rows = [
    ['L1', C.l1, 'المترو — الخط الأول', 'تداول طبيعي', 'ontime', 1],
    ['L2', C.l2, 'المترو — الخط الثاني', 'ازدحام مرتفع', 'delay', 2],
    ['L3', C.l3, 'المترو — الخط الثالث', 'تداول طبيعي', 'ontime', 3],
    ['MNR', C.mnr, 'المونوريل الشرقي', 'تداول طبيعي', 'ontime', 4],
  ]
  rows.forEach(([code, color, name, sLabel, tone, seed], i) => {
    const ry = y + 58 + i * 40
    inner.push(lineBadge(W - px - 14, ry, code, color))
    inner.push(text(W - px - 96, ry + 15, name, { size: 11.5, w: 700, anchor: 'end' }))
    inner.push(spark(W - px - 262, ry + 2, 56, 18, color, seed))
    inner.push(statusPill(px + 14 + 78, ry, sLabel, tone))
    if (i < 3) inner.push(lineEl(px + 14, ry + 32, W - px - 14, ry + 32, { stroke: C.mercury, sw: 1 }))
  })
  // departures card
  y += 240
  inner.push(card(px, y, CW, 168, 'Card-Departures'))
  inner.push(text(W - px - 14, y + 26, 'أقرب المغادرات', { size: 13.5, w: 800, anchor: 'end' }))
  inner.push(monoTag(px + 14, y + 26, 'DEPARTURES — LIVE', { anchor: 'start' }))
  inner.push(text(W - px - 14, y + 42, 'من محطة السادات — الخط الأول والثاني', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
  const deps = [
    ['01:10', 'نحو حلوان', 'L1', C.l1, 'على الموعد', 'ontime'],
    ['01:26', 'نحو المنيب', 'L2', C.l2, 'متأخر 3 د', 'delay'],
    ['01:52', 'نحو كت كات', 'L3', C.l3, 'على الموعد', 'ontime'],
  ]
  deps.forEach(([time, dest, code, color, sLabel, tone], i) => {
    const ry = y + 56 + i * 36
    inner.push(text(W - px - 14, ry + 15, dest, { size: 11.5, w: 600, anchor: 'end' }))
    inner.push(lineBadge(W - px - 92, ry, code, color))
    inner.push(text(px + 14 + 78, ry + 16, time, { fam: F.mono, size: 13, w: 700, anchor: 'start' }))
    inner.push(statusPill(px + 14, ry, sLabel, tone, { size: 9, h: 19 }))
    if (i < 2) inner.push(lineEl(px + 14, ry + 28, W - px - 14, ry + 28, { stroke: C.mercury, sw: 1 }))
  })
  inner.push(tabBar('home'))
  return svgRoot(W, 844, 'Wasel / 03 Home', C.canvas, defsBrand, inner.join(''))
}
