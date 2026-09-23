/** Screens: planner, journey-active, journey-completed */
import {
  C, F, text, rect, pill, circle, lineEl, pathEl, g, svgRoot, defsBrand,
  icon, monoTag, lineBadge, statusPill, card, darkCard, chip, pillButton,
  stat, statusBar, appHeader, tabBar, spark, progress, field,
} from './lib.mjs'

/* ---------- 04 planner ---------- */
export function planner() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'تخطيط الرحلة', { action: null }))
  // search card
  let y = 106
  inner.push(card(px, y, CW, 168, 'Card-Search'))
  inner.push(field(px + 14, y + 16, CW - 28, 42, 'من', 'المعادي', { dot: true, dotColor: C.interactive, idNum: 'Field-From' }))
  inner.push(g('Swap', [
    circle(px + CW / 2, y + 68, 17, { fill: '#FFFFFF', stroke: C.bone, sw: 1 }),
    icon('updown', px + CW / 2 - 8.5, y + 59.5, 17, C.ink, 1.8),
  ].join('')))
  inner.push(field(px + 14, y + 60, CW - 28, 42, 'إلى', 'الدقي', { dot: true, dotColor: C.ontime, idNum: 'Field-To' }))
  // mode chips — 2 rows
  inner.push(text(W - px - 14, y + 128, 'وقت الانطلاق:', { size: 10.5, w: 600, fill: C.slateink, anchor: 'end' }))
  inner.push(chip(px + 96, y + 114, 'الآن', { tone: 'dark', h: 28, size: 10 }))
  inner.push(chip(px + 40, y + 114, '10:30', { tone: 'outline', h: 28, size: 10 }))
  y += 186
  // mode filter chips — two rows
  inner.push(g('Mode-Filters', [
    chip(W - px, y, 'مترو', { tone: 'dark', h: 32 }),
    chip(W - px - 64, y, 'قطار خفيف', { tone: 'outline', h: 32 }),
    chip(W - px - 164, y, 'مونوريل', { tone: 'outline', h: 32 }),
    chip(W - px, y + 40, 'BRT', { tone: 'outline', h: 32 }),
    chip(W - px - 58, y + 40, 'قطار وطني', { tone: 'outline', h: 32 }),
    chip(W - px - 158, y + 40, 'مشي', { tone: 'outline', h: 32 }),
  ].join('')))
  y += 92
  // quick trips
  inner.push(g('Quick-Trips', [
    text(W - px, y, 'رحلات شائعة', { size: 11.5, w: 700, fill: C.slateink, anchor: 'end' }),
    chip(W - px, y + 12, 'ميدان التحرير ← مدينة الفنون والثقافة', { tone: 'outline', h: 30, size: 10 }),
    chip(W - px, y + 50, 'شبرا الخيمة ← المعادي', { tone: 'outline', h: 30, size: 10 }),
  ].join('')))
  // results
  y += 104
  inner.push(g('Results-Head', [
    text(W - px, y, 'المسارات المرشحة', { size: 16, w: 800, anchor: 'end' }),
    text(px, y, '3 مسارات · محدثة الآن', { size: 10.5, w: 500, fill: C.ash, anchor: 'start' }),
  ].join('')))
  // route card 1
  y += 16
  inner.push(card(px, y, CW, 128, 'Card-Route-1'))
  inner.push(pill(W - px - 14 - 62, y + 14, 62, 26, { fill: C.ink }))
  inner.push(text(W - px - 14 - 31, y + 31, 'الأسرع', { size: 10.5, w: 700, fill: '#FFFFFF', anchor: 'middle' }))
  inner.push(text(W - px - 14, y + 66, '35', { fam: F.lat, size: 26, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 52, y + 66, 'دقيقة', { size: 10, w: 600, fill: C.ash, anchor: 'end' }))
  inner.push(text(W - px - 96, y + 66, '16 ج.م', { fam: F.mono, size: 15, w: 700, anchor: 'end', fill: C.ink }))
  inner.push(text(px + 14, y + 30, 'الأوفر وسطاً', { size: 9.5, w: 500, fill: C.ash, anchor: 'start' }))
  // legs strip
  const legY = y + 82
  inner.push(g('Legs-1', [
    rect(W - px - 14 - 118, legY, 118, 5, { fill: C.l1, rx: 2.5 }),
    lineBadge(W - px - 14, legY - 14, 'L1', C.l1),
    text(W - px - 14 - 122, legY + 12, '9 محطات', { size: 9, w: 500, fill: C.ash, anchor: 'end' }),
    rect(W - px - 14 - 226, legY, 88, 5, { fill: C.l2, rx: 2.5 }),
    lineBadge(W - px - 14 - 232, legY - 14, 'L2', C.l2),
    text(W - px - 14 - 230, legY + 12, '3 محطات', { size: 9, w: 500, fill: C.ash, anchor: 'end' }),
    icon('walk', px + 22, legY - 12, 15, C.walk, 1.9),
    text(px + 44, legY + 8, 'مشي 2 د', { size: 9.5, w: 600, fill: C.slateink, anchor: 'start' }),
  ].join('')))
  inner.push(text(px + 14, y + 114, 'انطلاق 09:52 ← وصول 10:27', { fam: F.mono, size: 10, w: 600, fill: C.slateink, anchor: 'start' }))
  inner.push(chip(px + 168, y + 96, 'تبديل 1', { tone: 'mist', h: 22, size: 9 }))
  // route card 2
  y += 144
  inner.push(card(px, y, CW, 128, 'Card-Route-2'))
  inner.push(pill(W - px - 14 - 62, y + 14, 62, 26, { fill: C.brand }))
  inner.push(text(W - px - 14 - 31, y + 31, 'الأوفر', { size: 10.5, w: 700, fill: '#FFFFFF', anchor: 'middle' }))
  inner.push(text(W - px - 14, y + 66, '48', { fam: F.lat, size: 26, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 52, y + 66, 'دقيقة', { size: 10, w: 600, fill: C.ash, anchor: 'end' }))
  inner.push(text(W - px - 96, y + 66, '8 ج.م', { fam: F.mono, size: 15, w: 700, anchor: 'end', fill: C.ink }))
  inner.push(text(px + 14, y + 30, 'بدون تبديل', { size: 9.5, w: 500, fill: C.ash, anchor: 'start' }))
  const legY2 = y + 82
  inner.push(g('Legs-2', [
    rect(W - px - 14 - 150, legY2, 150, 5, { fill: C.l1, rx: 2.5 }),
    lineBadge(W - px - 14, legY2 - 14, 'L1', C.l1),
    text(W - px - 14 - 154, legY2 + 12, '13 محطة', { size: 9, w: 500, fill: C.ash, anchor: 'end' }),
    icon('walk', px + 22, legY2 - 12, 15, C.walk, 1.9),
    text(px + 44, legY2 + 8, 'مشي 8 د', { size: 9.5, w: 600, fill: C.slateink, anchor: 'start' }),
  ].join('')))
  inner.push(text(px + 14, y + 114, 'انطلاق 10:00 ← وصول 10:48', { fam: F.mono, size: 10, w: 600, fill: C.slateink, anchor: 'start' }))
  inner.push(chip(px + 168, y + 96, 'مباشر', { tone: 'mint', h: 22, size: 9 }))
  // peek card 3
  y += 144
  inner.push(card(px, y, CW, 54, 'Card-Route-3', { fill: C.mist, stroke: C.mercury }))
  inner.push(text(W - px - 14, y + 32, 'الأقل مشياً — 52 دقيقة', { size: 11.5, w: 700, fill: C.slateink, anchor: 'end' }))
  inner.push(icon('chevL', px + 16, y + 18, 18, C.fog, 2))
  inner.push(tabBar('route'))
  return svgRoot(W, 844, 'Wasel / 04 Journey Planner', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 05 journey active ---------- */
export function journeyActive() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'رحلتك الجارية', { actionLabel: 'إنهاء' }))
  // context strip
  let y = 100
  inner.push(g('Context', [
    text(W - px, y, 'المعادي ← الدقي', { size: 13, w: 800, anchor: 'end' }),
    monoTag(px, y, 'LIVE · WSL-1-75-12', { anchor: 'start', fill: C.fog, size: 8.5 }),
    pill(W - px - 92, y - 22, 92, 26, { fill: C.mint }),
    circle(W - px - 102, y - 9, 3.4, { fill: C.ontime }),
    text(W - px - 60, y - 5, 'مباشر', { size: 10, w: 700, fill: C.ontime, anchor: 'end' }),
  ].join('')))
  // next station card
  y += 18
  inner.push(darkCard(px, y, CW, 108, 'Card-Next-Station', { fill: C.dark, rx: 18 }))
  inner.push(monoTag(W - px - 16, y + 26, 'NEXT STATION', { anchor: 'end', fill: C.darkMute }))
  inner.push(text(W - px - 16, y + 54, 'السادات', { size: 24, w: 900, fill: '#FFFFFF', anchor: 'end' }))
  inner.push(text(W - px - 16, y + 74, 'تبقى محطتان', { size: 10, w: 500, fill: C.darkMute, anchor: 'end' }))
  inner.push(text(px + 22, y + 62, '01:36', { fam: F.mono, size: 34, w: 700, fill: '#FFFFFF', anchor: 'start' }))
  inner.push(monoTag(px + 22, y + 78, 'MIN · SEC', { anchor: 'start', fill: C.darkMute, size: 8 }))
  inner.push(progress(px + 16, y + 90, CW - 32, 5, 62, C.interactive, 'Countdown-Progress'))
  // journey spine
  y += 124
  inner.push(card(px, y, CW, 268, 'Card-Spine'))
  inner.push(text(W - px - 14, y + 24, 'مسار الرحلة — محطة بمحطة', { size: 13, w: 800, anchor: 'end' }))
  const spineX = W - px - 44
  const stations = [
    ['المعادي', 'done', '08:52'], ['حدائق المعادي', 'done', '08:56'],
    ['دار السلام', 'done', ''], ['الزهراء', 'now', ''], ['مار جرجس', 'next', ''],
    ['الملك الصالح', 'next', ''], ['السادات', 'x2', ''], ['الأوبرا', 'next', ''], ['الدقي', 'end', ''],
  ]
  const sx0 = y + 52, step = 24.5
  inner.push(lineEl(spineX, sx0, spineX, sx0 + step * 7 + 8, { stroke: C.bone, sw: 2 }))
  stations.forEach(([name, st, t], i) => {
    const sy = sx0 + i * step
    if (st === 'done') {
      inner.push(circle(spineX, sy, 7, { fill: C.ink }))
      inner.push(icon('check', spineX - 4.5, sy - 4.5, 9, '#FFFFFF', 3))
    } else if (st === 'now') {
      inner.push(circle(spineX, sy, 12, { fill: C.interactive, op: 0.18 }))
      inner.push(circle(spineX, sy, 7, { fill: C.interactive }))
      inner.push(circle(spineX, sy, 3, { fill: '#FFFFFF' }))
    } else if (st === 'end') {
      inner.push(icon('pin', spineX - 8, sy - 9, 17, C.ink, 2))
    } else {
      inner.push(circle(spineX, sy, 6.5, { fill: '#FFFFFF', stroke: C.cloud, sw: 1.6 }))
    }
    inner.push(text(spineX - 18, sy + 4, name, { size: 11, w: st === 'now' ? 800 : 600, fill: st === 'next' ? C.fog : C.ink, anchor: 'end' }))
    if (st === 'x2') inner.push(lineBadge(spineX - 96, sy - 11, 'L2', C.l2, { h: 20 }))
    if (st === 'now') inner.push(statusPill(px + 14, sy - 11, 'الآن', 'info', { h: 20, size: 9 }))
    if (t) inner.push(text(px + 14, sy + 4, t, { fam: F.mono, size: 9.5, w: 600, fill: C.ash, anchor: 'start' }))
  })
  // turn-by-turn mini
  y += 284
  inner.push(card(px, y, CW, 92, 'Card-TurnByTurn'))
  inner.push(monoTag(px + 14, y + 22, 'TURN BY TURN', { anchor: 'start' }))
  inner.push(text(W - px - 14, y + 23, 'إجمالي الأجرة الرسمية 16 ج.م', { size: 11, w: 700, anchor: 'end' }))
  inner.push(g('Leg-1', [
    lineBadge(W - px - 14, y + 34, 'L1', C.l1),
    text(W - px - 14 - 64, y + 49, 'المعادي ← السادات', { size: 11.5, w: 700, anchor: 'end' }),
    text(px + 14, y + 49, '9 محطات · 19 د', { size: 9.5, w: 500, fill: C.ash, anchor: 'start' }),
  ].join('')))
  inner.push(lineEl(px + 14, y + 62, W - px - 14, y + 62, { stroke: C.mercury, sw: 1 }))
  inner.push(g('Leg-2', [
    lineBadge(W - px - 14, y + 66, 'L2', C.l2),
    text(W - px - 14 - 64, y + 81, 'السادات ← الدقي', { size: 11.5, w: 700, anchor: 'end' }),
    text(px + 14, y + 81, '3 محطات · 8 د', { size: 9.5, w: 500, fill: C.ash, anchor: 'start' }),
  ].join('')))
  // deviation banner
  y += 106
  inner.push(g('Deviation-Banner', [
    pill(px, y, CW, 40, { fill: C.amberT }),
    icon('alert', W - px - 26, y + 11, 17, C.delay, 2),
    text(W - px - 44, y + 26, 'محاكاة خروج عن المسار — جرّب خطة الاسترداد', { size: 11, w: 700, fill: C.delay, anchor: 'end' }),
    icon('chevL', px + 16, y + 12, 16, C.delay, 2),
  ].join('')))
  inner.push(tabBar('route'))
  return svgRoot(W, 844, 'Wasel / 05 Journey Active', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 06 journey completed ---------- */
export function journeyCompleted() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'ملخص الرحلة', { action: 'x' }))
  // success hero
  let y = 116
  inner.push(g('Success-Hero', [
    circle(W / 2, y + 34, 34, { fill: C.mint }),
    circle(W / 2, y + 34, 34, { stroke: C.ontime, sw: 1.5 }),
    icon('check', W / 2 - 14, y + 20, 28, C.ontime, 2.4),
    text(W / 2, y + 104, 'وصلت إلى وجهتك', { size: 25, w: 900, anchor: 'middle' }),
    text(W / 2, y + 128, 'من المعادي إلى الدقي — الأربعاء، ٢٣ سبتمبر', { size: 11.5, w: 500, fill: C.ash, anchor: 'middle' }),
    chip(W / 2 + 60, y + 144, '35 دقيقة', { tone: 'mist', h: 30, size: 10.5 }),
    chip(W / 2 - 16, y + 144, '15.1 كم', { tone: 'mist', h: 30, size: 10.5 }),
    chip(W / 2 - 118, y + 144, 'رحلة موفقة', { tone: 'mint', h: 30, size: 10.5 }),
  ].join('')))
  // receipt
  y += 196
  inner.push(card(px, y, CW, 232, 'Card-Receipt'))
  inner.push(text(W - px - 16, y + 28, 'إيصال النقل الرقمي', { size: 13.5, w: 800, anchor: 'end' }))
  inner.push(monoTag(px + 16, y + 28, 'WASEL PAY', { anchor: 'start' }))
  inner.push(text(W - px - 16, y + 48, 'WSL-1JO4-6LB24', { fam: F.mono, size: 10.5, w: 600, fill: C.ash, anchor: 'end', ls: 1 }))
  // perforation
  inner.push(g('Perforation', [
    lineEl(px + 16, y + 64, px + CW - 16, y + 64, { stroke: C.cloud, sw: 1.4, dash: '5 5' }),
    circle(px - 5, y + 64, 6, { fill: C.canvas, stroke: C.bone, sw: 1 }),
    circle(px + CW + 5, y + 64, 6, { fill: C.canvas, stroke: C.bone, sw: 1 }),
  ].join('')))
  const rows = [
    ['مشي 2 د', 'من وإلى المحطات', '—'],
    ['L1', 'المعادي ← السادات · 9 محطات · 19 د', '8 ج.م'],
    ['L2', 'السادات ← الدقي · 3 محطات · 8 د', '8 ج.م'],
    ['مشي 2 د', 'من وإلى المحطات', '—'],
  ]
  rows.forEach(([code, desc, fare], i) => {
    const ry = y + 82 + i * 30
    if (code.startsWith('L')) inner.push(lineBadge(W - px - 16, ry, code, code === 'L1' ? C.l1 : C.l2, { h: 20 }))
    else inner.push(icon('walk', W - px - 24, ry + 2, 15, C.walk, 1.9))
    inner.push(text(W - px - 76, ry + 14, desc, { size: 10.5, w: 600, fill: C.ink, anchor: 'end' }))
    inner.push(text(px + 16, ry + 14, fare, { fam: F.mono, size: 11, w: 700, anchor: 'start', fill: C.slateink }))
  })
  inner.push(lineEl(px + 16, y + 204, px + CW - 16, y + 204, { stroke: C.mercury, sw: 1 }))
  inner.push(g('Receipt-Total', [
    text(W - px - 16, y + 224, 'الإجمالي — محفظة واصل', { size: 11.5, w: 700, anchor: 'end' }),
    text(px + 16, y + 226, '16 ج.م', { fam: F.mono, size: 17, w: 800, anchor: 'start' }),
  ].join('')))
  // impact
  y += 252
  inner.push(g('Impact', [
    icon('leaf', W - px - 16, y - 8, 16, C.ontime, 1.9),
    text(W - px - 40, y + 4, 'وفّرت 1.4 كجم CO₂', { size: 12, w: 800, anchor: 'end' }),
    text(W - px - 40, y + 20, 'مقارنة برحلة سيارة خاصة — حسب معامل الانبعاث الوطني', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }),
    icon('users', W - px - 16, y + 38, 16, C.interactive, 1.9),
    text(W - px - 40, y + 50, '18 كم تخفيفاً للطريق', { size: 12, w: 800, anchor: 'end' }),
    text(W - px - 40, y + 66, 'حصص معامل الانبعاثات لوسائل النقل الجماعي', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }),
  ].join('')))
  // rating
  y += 88
  inner.push(g('Rating', [
    text(W / 2, y, 'قيّم دقة هذه الرحلة', { size: 12.5, w: 700, anchor: 'middle' }),
    ...[0, 1, 2, 3, 4].map((i) => icon('star', W / 2 - 62 + i * 26, y + 10, 21, i < 4 ? C.ink : C.cloud, 1.6).replace('fill="none"', `fill="${i < 4 ? C.ink : 'none'}"`)),
  ].join('')))
  // CTAs
  y += 56
  inner.push(g('CTAs', [
    pillButton(px, y, CW, 48, 'حفظ الرحلة في السجل', { tone: 'dark', id: 'Btn-Save' }),
    text(W / 2, y + 72, 'تبليغ عن مشكلة في الرحلة', { size: 10.5, w: 600, fill: C.ash, anchor: 'middle' }),
  ].join('')))
  return svgRoot(W, 844, 'Wasel / 06 Journey Completed', C.canvas, defsBrand, inner.join(''))
}
