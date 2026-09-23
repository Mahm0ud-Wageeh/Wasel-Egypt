/** Screens: history, fares, community, notifications, auth, profile */
import {
  C, F, text, rect, pill, circle, lineEl, pathEl, g, svgRoot, defsBrand,
  icon, monoTag, lineBadge, statusPill, card, darkCard, chip, pillButton,
  stat, statusBar, appHeader, tabBar, spark, progress, toggle, logoMark, fab, field,
} from './lib.mjs'

/* ---------- 07 history ---------- */
export function history() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'رحلاتي', { action: 'calendar' }))
  let y = 104
  // stats band
  inner.push(card(px, y, CW, 76, 'Card-History-Stats', { fill: C.mist, stroke: C.mercury }))
  ;[['128', 'رحلة مكتملة'], ['1,240', 'كم مشوارة'], ['1,850', 'ج.م موفرة']].forEach(([v, l], i) => {
    const cx = W - px - 24 - i * ((CW - 40) / 3)
    inner.push(text(cx, y + 36, v, { fam: F.lat, size: 19, w: 800, anchor: 'end' }))
    inner.push(text(cx, y + 56, l, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    if (i < 2) inner.push(lineEl(px + 24 + (i + 1) * ((CW - 40) / 3), y + 18, px + 24 + (i + 1) * ((CW - 40) / 3), y + 58, { stroke: C.mercury, sw: 1 }))
  })
  y += 94
  // tabs
  inner.push(g('History-Tabs', [
    chip(W - px, y, 'الكل', { tone: 'dark', h: 32 }),
    chip(W - px - 58, y, 'المفضلة', { tone: 'outline', h: 32, icon: 'heart' }),
    chip(px, y, 'الشهر الحالي', { tone: 'outline', h: 32 }),
  ].join('')))
  y += 54
  inner.push(monoTag(W - px, y, 'TODAY · SEP 23', { anchor: 'end', fill: C.fog, size: 8.5 }))
  y += 14
  const trips = [
    ['المعادي ← الدقي', 'L1 + L2 · 35 د · وصول 10:27', '16 ج.م', ['L1', C.l1], ['L2', C.l2], 'مكتملة', 'ontime', true],
    ['التحرير ← مدينتي', 'LRT · 28 د · وصول 14:05', '10 ج.م', ['LRT', C.lrt], null, 'مكتملة', 'ontime', false],
    ['شبرا الخيمة ← التحرير', 'L2 · 24 د · وصول 18:42', '8 ج.م', ['L2', C.l2], null, 'متأخرة', 'delay', false],
  ]
  trips.forEach(([route, meta, fare, b1, b2, sLabel, tone, fav], i) => {
    inner.push(card(px, y, CW, 74, `Card-Trip-${i + 1}`))
    inner.push(text(W - px - 14, y + 26, route, { size: 12.5, w: 800, anchor: 'end' }))
    inner.push(text(W - px - 14, y + 45, meta, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    inner.push(lineBadge(W - px - 14 - (b2 ? 118 : 64), y + 44, b1[0], b1[1], { h: 19 }))
    if (b2) inner.push(lineBadge(W - px - 14 - 64, y + 44, b2[0], b2[1], { h: 19 }))
    inner.push(text(px + 14, y + 28, fare, { fam: F.mono, size: 12.5, w: 700, anchor: 'start' }))
    inner.push(statusPill(px + 14, y + 40, sLabel, tone, { h: 20, size: 9, anchor: 'start' }))
    inner.push(icon('heart', px + 14, y + 8, 14, fav ? C.closed : C.cloud, 1.8))
    y += 82
  })
  inner.push(monoTag(W - px, y + 4, 'YESTERDAY · SEP 22', { anchor: 'end', fill: C.fog, size: 8.5 }))
  y += 20
  inner.push(card(px, y, CW, 74, 'Card-Trip-4'))
  inner.push(text(W - px - 14, y + 26, 'العاصمة الإدارية ← التجمع', { size: 12.5, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 14, y + 45, 'MNR · 22 د · وصول 09:15', { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
  inner.push(lineBadge(W - px - 14, y + 44, 'MNR', C.mnr, { h: 19 }))
  inner.push(text(px + 14, y + 28, '12 ج.م', { fam: F.mono, size: 12.5, w: 700, anchor: 'start' }))
  inner.push(statusPill(px + 14, y + 40, 'مكتملة', 'ontime', { h: 20, size: 9, anchor: 'start' }))
  inner.push(tabBar('history'))
  return svgRoot(W, 844, 'Wasel / 07 Trip History', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 14 fares ---------- */
export function fares() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'الأسعار والتذاكر', { action: 'ticket' }))
  // calculator
  let y = 104
  inner.push(card(px, y, CW, 190, 'Card-Calculator'))
  inner.push(text(W - px - 14, y + 26, 'احسب أجرة رحلتك', { size: 13.5, w: 800, anchor: 'end' }))
  inner.push(field(px + 14, y + 38, CW - 28, 38, '', '', { dot: true, dotColor: C.interactive, ph: C.fog, idNum: 'Calc-From' }))
  inner.push(text(px + 14 + CW - 28 - 16, y + 62, 'محطة الانطلاق', { size: 11, w: 500, fill: C.fog, anchor: 'end' }))
  inner.push(field(px + 14, y + 84, CW - 28, 38, '', '', { dot: true, dotColor: C.ontime, ph: C.fog, idNum: 'Calc-To' }))
  inner.push(text(px + 14 + CW - 28 - 16, y + 108, 'محطة الوصول', { size: 11, w: 500, fill: C.fog, anchor: 'end' }))
  inner.push(lineEl(px + 14, y + 136, W - px - 14, y + 136, { stroke: C.mercury, sw: 1 }))
  inner.push(text(W - px - 14, y + 164, 'الأجرة التقديرية', { size: 10.5, w: 600, fill: C.ash, anchor: 'end' }))
  inner.push(text(px + 14, y + 172, '15.00', { fam: F.mono, size: 32, w: 800, anchor: 'start' }))
  inner.push(text(px + 106, y + 172, 'ج.م', { size: 12, w: 700, fill: C.ash, anchor: 'start' }))
  inner.push(statusPill(W - px - 14, y + 176, 'مدى: 10 – 16 محطة', 'info', { h: 22, size: 9.5 }))
  // official matrix
  y += 206
  inner.push(card(px, y, CW, 168, 'Card-Matrix'))
  inner.push(text(W - px - 14, y + 24, 'التسعيرة الرسمية للمترو', { size: 12.5, w: 800, anchor: 'end' }))
  inner.push(monoTag(px + 14, y + 24, 'OCT 2024', { anchor: 'start', size: 8 }))
  const tiers = [['1 – 9 محطات', '8'], ['10 – 16 محطة', '10'], ['17 – 23 محطة', '15'], ['+24 محطة', '20']]
  tiers.forEach(([range, fare], i) => {
    const ry = y + 38 + i * 30
    if (i % 2 === 0) inner.push(rect(px + 14, ry - 8, CW - 28, 26, { fill: C.mist, rx: 8 }))
    inner.push(text(W - px - 22, ry + 9, range, { size: 11, w: 600, fill: C.slateink, anchor: 'end' }))
    inner.push(text(px + 22, ry + 10, `${fare}.00 ج.م`, { fam: F.mono, size: 12, w: 700, anchor: 'start' }))
  })
  // smart card promo (dark)
  y += 184
  inner.push(g('Card-Smart-Pass', [
    rect(px, y, CW, 118, { fill: C.dark, rx: 18, stroke: 'url(#wb)', sw: 1.6 }),
    icon('wallet', W - px - 40, y + 20, 22, C.brand, 1.9),
    text(W - px - 54, y + 34, 'كارت واصل الذكي', { size: 14, w: 800, fill: '#FFFFFF', anchor: 'end' }),
    monoTag(px + 16, y + 32, 'WASEL PASS', { anchor: 'start', fill: C.darkMute }),
    text(W - px - 16, y + 60, 'اشحن مسبقاً وادخل من البوابة بلمسة — متوافق مع كل الخطوط', { size: 10.5, w: 500, fill: C.darkMute, anchor: 'end' }),
    pillButton(px + 16, y + 76, 110, 30, 'اعرف أكثر', { tone: 'brand', id: 'Btn-Pass' }),
  ].join('')))
  y += 136
  inner.push(g('Fare-Note', [
    icon('help', W - px - 7, y - 8, 14, C.fog, 1.8),
    text(W - px - 28, y + 3, 'التحويل بين خطوط المترو بدون رسوم إضافية — أجرة واحدة للرحلة', { size: 10, w: 500, fill: C.ash, anchor: 'end' }),
  ].join('')))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 14 Fares & Tickets', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 15 community ---------- */
export function community() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'مجتمع الركاب', { action: 'users' }))
  let y = 104
  // radar banner
  inner.push(g('Radar-Banner', [
    pill(px, y, CW, 62, { fill: C.blueT }),
    icon('nav', W - px - 22, y + 12, 20, C.info, 2),
    text(W - px - 42, y + 26, 'رادار المجتمع — 14 بلاغاً نشطاً الآن', { size: 12.5, w: 800, fill: C.info, anchor: 'end' }),
    text(W - px - 42, y + 45, 'تحديث كل دقيقة من الركاب في الشارع', { size: 9.5, w: 500, fill: C.info, anchor: 'end', op: 0.8 }),
  ].join('')))
  // report types grid
  y += 80
  inner.push(text(W - px, y, 'بلّغ عن حالة', { size: 13, w: 800, anchor: 'end' }))
  y += 14
  const types = [
    ['حادث', 'alert', C.closed, C.redT], ['ازدحام', 'gauge', C.delay, C.amberT],
    ['إغلاق مؤقت', 'x', C.slateink, C.grayT], ['خدمة متوقفة', 'wifi', C.info, C.blueT],
  ]
  types.forEach(([label, ic, fg, bg], i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const x = col === 0 ? px + (CW - 12) / 2 + 12 : px
    const ty = y + row * 66
    inner.push(card(x, ty, (CW - 12) / 2, 56, `Type-${label}`, { stroke: C.bone }))
    inner.push(circle(x + (CW - 12) / 2 - 24, ty + 28, 16, { fill: bg }))
    inner.push(icon(ic, x + (CW - 12) / 2 - 32, ty + 20, 17, fg, 2))
    inner.push(text(x + 16, ty + 33, label, { size: 12, w: 700, anchor: 'start' }))
  })
  // feed
  y += 152
  inner.push(g('Feed-Head', [
    text(W - px, y, 'أحدث البلاغات', { size: 13, w: 800, anchor: 'end' }),
    text(px, y, 'قبل 12 دقيقة', { size: 9.5, w: 500, fill: C.fog, anchor: 'start' }),
  ].join('')))
  y += 14
  const feed = [
    ['حادث', C.closed, C.redT, 'تأخير 8 دقائق عند محطة الشهداء', 'تم تأكيد البلاغ من 3 ركاب آخرين', 'L2', 24],
    ['ازدحام', C.delay, C.amberT, 'ضغط مرتفع على بوابة مدينتي صباحاً', 'الحركة تعمل — انتظر دوريتين', 'LRT', 41],
  ]
  feed.forEach(([type, fg, bg, title, sub, code, hearts], i) => {
    inner.push(card(px, y, CW, 92, `Feed-${i + 1}`))
    inner.push(pill(W - px - 14 - 52, y + 12, 52, 22, { fill: bg }))
    inner.push(text(W - px - 14 - 26, y + 27, type, { size: 9.5, w: 700, fill: fg, anchor: 'middle' }))
    inner.push(lineBadge(px + 14, y + 12, code, code === 'L2' ? C.l2 : C.lrt, { h: 20 }))
    inner.push(text(W - px - 14, y + 56, title, { size: 12, w: 700, anchor: 'end' }))
    inner.push(text(W - px - 14, y + 74, sub, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    inner.push(icon('heart', px + 14, y + 62, 14, C.fog, 1.8))
    inner.push(text(px + 34, y + 74, String(hearts), { size: 10, w: 600, fill: C.ash, anchor: 'start' }))
    y += 102
  })
  // CTA
  inner.push(g('CTA-Community', [
    pillButton(px, y + 6, CW, 48, 'بلّغ عن حالة الآن', { tone: 'dark', icon: 'plus', id: 'Btn-Report' }),
    text(W / 2, y + 76, '3 خطوات سريعة — بدون حساب', { size: 9.5, w: 500, fill: C.fog, anchor: 'middle' }),
  ].join('')))
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 15 Community', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 16 notifications ---------- */
export function notifications() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'الإشعارات', { actionLabel: 'تحديد الكل' }))
  let y = 104
  inner.push(g('Notif-Tabs', [
    chip(W - px, y, 'الكل', { tone: 'dark', h: 32 }),
    chip(W - px - 56, y, 'رحلات', { tone: 'outline', h: 32 }),
    chip(W - px - 118, y, 'عروض', { tone: 'outline', h: 32 }),
    chip(px, y, 'النظام', { tone: 'outline', h: 32 }),
  ].join('')))
  y += 50
  inner.push(monoTag(W - px, y, 'TODAY', { anchor: 'end', fill: C.fog, size: 8.5 }))
  y += 14
  const items = [
    ['bell', C.info, C.blueT, 'انخفض زمن انتظارك', 'مترو L3 — أقرب مغادرة بعد 4 دقائق', '10:24', true],
    ['alert', C.delay, C.amberT, 'تأخير على الخط الثاني', 'ازدحام مرتفع بين شبرا الخيمة والمنيب', '09:51', true],
    ['zap', C.brand, C.violetT, 'خصم 10% على شحن المحفظة', 'ساري حتى نهاية الأسبوع — عبر التطبيق', '08:30', false],
  ]
  items.forEach(([ic, fg, bg, title, sub, time, unread], i) => {
    inner.push(card(px, y, CW, 66, `Notif-${i + 1}`))
    inner.push(circle(W - px - 40, y + 33, 18, { fill: bg }))
    inner.push(icon(ic, W - px - 49, y + 24, 18, fg, 1.9))
    inner.push(text(W - px - 68, y + 28, title, { size: 12, w: 700, anchor: 'end' }))
    inner.push(text(W - px - 68, y + 47, sub, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    inner.push(text(px + 14, y + 26, time, { fam: F.mono, size: 9, w: 600, fill: C.fog, anchor: 'start' }))
    if (unread) inner.push(circle(px + 18, y + 48, 4, { fill: C.brand }))
    y += 74
  })
  inner.push(monoTag(W - px, y + 6, 'YESTERDAY', { anchor: 'end', fill: C.fog, size: 8.5 }))
  y += 20
  const older = [
    ['history', C.fog, C.grayT, 'رحلتك إلى الدقي تمت بنجاح', 'قيّم دقة التوقيت — استغرق الوصول 35 دقيقة', '18:40'],
    ['ticket', C.fog, C.grayT, 'وصلت تذكرة العودة', 'تذكرة مترو ذهاب وعودة — 16 ج.م من المحفظة', '16:02'],
  ]
  older.forEach(([ic, fg, bg, title, sub, time], i) => {
    inner.push(card(px, y, CW, 66, `Notif-Old-${i + 1}`, { fill: C.mist, stroke: C.mercury }))
    inner.push(circle(W - px - 40, y + 33, 18, { fill: bg }))
    inner.push(icon(ic, W - px - 49, y + 24, 18, fg, 1.9))
    inner.push(text(W - px - 68, y + 28, title, { size: 12, w: 600, fill: C.slateink, anchor: 'end' }))
    inner.push(text(W - px - 68, y + 47, sub, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    inner.push(text(px + 14, y + 26, time, { fam: F.mono, size: 9, w: 600, fill: C.fog, anchor: 'start' }))
    y += 74
  })
  inner.push(tabBar(null))
  return svgRoot(W, 844, 'Wasel / 16 Notifications', C.canvas, defsBrand, inner.join(''))
}

/* ---------- 17 auth (dark immersive) ---------- */
export function auth() {
  const W = 390
  const inner = []
  // decorative
  inner.push(g('Auth-Deco', [
    pathEl('M -30 140 C 90 60 300 220 420 120', { stroke: C.brand, sw: 2, op: 0.5 }),
    pathEl('M -30 190 C 110 110 280 260 420 170', { stroke: C.interactive, sw: 1.4, op: 0.35 }),
    circle(330, 130, 46, { stroke: C.brand, sw: 1.2, op: 0.4 }),
    circle(330, 130, 24, { stroke: C.interactive, sw: 1, op: 0.5 }),
  ].join('')))
  inner.push(statusBar(true))
  // logo + headline
  let y = 208
  inner.push(g('Auth-Hero', [
    logoMark(W / 2, y, 54),
    text(W / 2, y + 66, 'أهلاً بيك في واصل', { size: 26, w: 900, fill: '#FFFFFF', anchor: 'middle' }),
    text(W / 2, y + 92, 'منصة النقل الذكي للقاهرة الكبرى', { size: 12, w: 500, fill: C.darkMute, anchor: 'middle' }),
    text(W / 2, y + 110, 'سجّل مرة واحدة وتحرك في كل مكان', { size: 12, w: 500, fill: C.darkMute, anchor: 'middle' }),
  ].join('')))
  // phone field
  y += 152
  inner.push(g('Auth-Phone', [
    rect(20, y, 350, 56, { fill: C.darkCard, stroke: C.darkLine, sw: 1, rx: 14 }),
    icon('phone', 334, y + 18, 19, C.darkMute, 1.8),
    text(322, y + 34, 'رقم الموبايل', { size: 10, w: 600, fill: C.darkMute, anchor: 'end' }),
    text(322, y + 32 - 12, '', {}),
    text(36, y + 35, '+20 1XX XXX XXXX', { fam: F.mono, size: 14.5, w: 600, fill: C.darkText, anchor: 'start' }),
  ].join('')))
  y += 72
  inner.push(pillButton(20, y, 350, 52, 'تكميل بالرقم', { tone: 'brand', id: 'Btn-Auth-Phone' }))
  y += 70
  inner.push(g('Auth-Divider', [
    lineEl(20, y, 160, y, { stroke: C.darkLine, sw: 1 }),
    lineEl(230, y, 370, y, { stroke: C.darkLine, sw: 1 }),
    text(W / 2, y + 4, 'أو', { size: 10.5, w: 600, fill: C.darkMute, anchor: 'middle' }),
  ].join('')))
  y += 22
  inner.push(g('Auth-Guest', [
    pill(20, y, 350, 50, { fill: 'none', stroke: C.darkLine, sw: 1.2 }),
    text(W / 2 + 10, y + 32, 'دخول كزائر — استكشف بدون حساب', { size: 13, w: 700, fill: C.darkText, anchor: 'middle' }),
    icon('eye', W / 2 - 110, y + 16, 18, C.darkMute, 1.8),
  ].join('')))
  y += 84
  inner.push(g('Auth-Foot', [
    text(W / 2, y, 'بتكمل انت موافق على شروط الاستخدام وسياسة الخصوصية', { size: 9.5, w: 500, fill: C.darkMute, anchor: 'middle' }),
    monoTag(W / 2, y + 26, 'WASEL ID · SECURED BY OTP', { anchor: 'middle', fill: '#3A4070', size: 8 }),
  ].join('')))
  return svgRoot(W, 844, 'Wasel / 17 Sign In', C.dark, defsBrand, inner.join(''))
}

/* ---------- 18 profile ---------- */
export function profile() {
  const W = 390, px = 20, CW = W - px * 2
  const inner = []
  inner.push(statusBar())
  inner.push(appHeader(44, 'الملف الشخصي', { action: 'sliders' }))
  // user card
  let y = 104
  inner.push(card(px, y, CW, 108, 'Card-User'))
  inner.push(g('Avatar', [
    circle(W - px - 44, y + 44, 26, { fill: C.onyx }),
    text(W - px - 44, y + 52, 'م', { size: 20, w: 800, fill: '#FFFFFF', anchor: 'middle' }),
    circle(W - px - 62, y + 58, 8, { fill: C.ontime }),
    icon('check', W - px - 66.5, y + 53.5, 10, '#FFFFFF', 2.6),
  ].join('')))
  inner.push(text(W - px - 84, y + 38, 'محمد أحمد', { size: 16, w: 800, anchor: 'end' }))
  inner.push(text(W - px - 84, y + 58, 'mohamed.ahmed@example.com', { size: 10, w: 500, fill: C.ash, anchor: 'end' }))
  inner.push(statusPill(W - px - 84, y + 68, 'راكب موفق', 'ontime', { h: 22, size: 9.5 }))
  inner.push(monoTag(px + 14, y + 34, 'MEMBER SINCE', { anchor: 'start', size: 7.5 }))
  inner.push(text(px + 14, y + 54, 'MARCH 2024', { fam: F.lat, size: 11.5, w: 800, anchor: 'start' }))
  inner.push(monoTag(px + 14, y + 74, 'TRUST 98 / 100', { anchor: 'start', size: 7.5, fill: C.ontime }))
  // wallet dark card
  y += 124
  inner.push(g('Card-Wallet', [
    rect(px, y, CW, 124, { fill: C.dark, rx: 20, stroke: 'url(#wb)', sw: 1.6 }),
    icon('wallet', W - px - 40, y + 18, 20, C.interactive, 1.9),
    text(W - px - 54, y + 32, 'محفظة واصل', { size: 13, w: 800, fill: '#FFFFFF', anchor: 'end' }),
    monoTag(px + 16, y + 30, 'TRANSIT WALLET', { anchor: 'start', fill: C.darkMute, size: 8 }),
    text(px + 16, y + 76, '175.00', { fam: F.mono, size: 30, w: 800, fill: '#FFFFFF', anchor: 'start' }),
    text(px + 122, y + 76, 'ج.م', { size: 12, w: 700, fill: C.darkMute, anchor: 'start' }),
    pillButton(px + 16, y + 90, 118, 26, 'اشحن المحفظة', { tone: 'brand', id: 'Btn-Topup' }),
    text(W - px - 16, y + 106, 'WASEL-CAIRO •••• 9021', { fam: F.mono, size: 9.5, w: 600, fill: C.darkMute, anchor: 'end', ls: 0.5 }),
  ].join('')))
  // journey impact
  y += 140
  inner.push(monoTag(W - px, y, 'JOURNEY IMPACT', { anchor: 'end', fill: C.fog, size: 8 }))
  inner.push(text(W - px, y + 22, 'رحلاتك على الشبكة', { size: 14, w: 800, anchor: 'end' }))
  y += 34
  inner.push(card(px, y, CW, 74, 'Card-Impact', { fill: C.mist, stroke: C.mercury }))
  ;[['128', 'رحلة'], ['1,240', 'كم'], ['96', 'كجم CO₂'], ['1,850', 'ج.م موفرة']].forEach(([v, l], i) => {
    const cx = W - px - 22 - i * ((CW - 36) / 4)
    inner.push(text(cx, y + 36, v, { fam: F.lat, size: 15, w: 800, anchor: 'end' }))
    inner.push(text(cx, y + 54, l, { size: 8, w: 500, fill: C.ash, anchor: 'end' }))
  })
  // places
  y += 92
  inner.push(text(W - px, y, 'الأماكن اليومية المفضلة', { size: 13.5, w: 800, anchor: 'end' }))
  y += 14
  const places = [['home', 'المنزل', 'مدينة نصر — L2 شبرا الخيمة'], ['briefcase', 'العمل', 'التجمع الخامس — LRT مدينتي']]
  places.forEach(([ic, t, s], i) => {
    inner.push(card(px, y, CW, 56, `Place-${t}`))
    inner.push(circle(W - px - 36, y + 28, 16, { fill: C.mist }))
    inner.push(icon(ic, W - px - 44, y + 20, 17, C.ink, 1.9))
    inner.push(text(W - px - 62, y + 26, t, { size: 12, w: 700, anchor: 'end' }))
    inner.push(text(W - px - 62, y + 43, s, { size: 9.5, w: 500, fill: C.ash, anchor: 'end' }))
    inner.push(icon('chevL', px + 16, y + 20, 16, C.cloud, 2))
    y += 64
  })
  inner.push(g('Place-Add', [
    rect(px, y, CW, 44, { stroke: C.cloud, sw: 1.4, rx: 14, dash: '6 5' }),
    icon('plus', W / 2 - 52, y + 14, 16, C.ash, 2),
    text(W / 2 + 8, y + 28, 'أضف مكان جديد', { size: 11, w: 600, fill: C.ash, anchor: 'middle' }),
  ].join('')))
  y += 62
  // prefs
  const prefs = [['إشعارات الرحلات', true], ['الوضع الداكن', false], ['اللغة — العربية', 'lang']]
  prefs.forEach(([label, val], i) => {
    inner.push(card(px, y, CW, 46, `Pref-${i}`))
    inner.push(text(W - px - 14, y + 28, label, { size: 11.5, w: 700, anchor: 'end' }))
    if (val === 'lang') inner.push(chip(px + 14, y + 8, 'العربية', { tone: 'mist', h: 28, size: 10 }))
    else inner.push(toggle(px + 14, y + 12, val, `Toggle-${i}`))
    y += 54
  })
  // logout + version
  inner.push(g('Logout', [
    pill(px, y, CW, 44, { fill: C.redT }),
    icon('logout', W - px - 24, y + 13, 17, C.closed, 1.9),
    text(W - px - 42, y + 28, 'تسجيل الخروج', { size: 12, w: 700, fill: C.closed, anchor: 'end' }),
  ].join('')))
  inner.push(text(W / 2, 826, 'WASEL v2.4.1', { fam: F.mono, size: 8.5, w: 600, fill: C.fog, anchor: 'middle', ls: 1 }))
  inner.push(tabBar('user'))
  return svgRoot(W, 844, 'Wasel / 18 Profile', C.canvas, defsBrand, inner.join(''))
}
