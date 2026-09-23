# برومبت التصميم — واصل مصر (Wasel Egypt) | Figma Design Prompt

> انسخ البرومبت ده والصقه في Figma AI (First Draft / Figma Make) أو أي أداة تصميم بالذكاء الاصطناعي
> (Galileo / Uizard / v0 / ChatGPT+DALL-E wireframe…) — أو ابعتّه لأي مصمم كـ Design Brief جاهز.
> النسخة الإنجليزية أقوى مع أدوات الـ AI؛ النسخة العربية للمراجعة والمصممين.

---

## 🇬🇧 English Prompt (recommended — paste this into Figma AI)

```
Act as a senior product designer. Design a complete, production-grade RTL Arabic-first
web product called "واصل مصر — Wasel Egypt": the smart multimodal transit platform for
Greater Cairo (metro, LRT, monorail, BRT, national rail, bus, walking).

DESIGN STYLE — "ClickUp professional light":
- White canvas #FFFFFF, ink text #202020, onyx #090C1D, secondary text #646464.
- Hairline borders #E8E8E8 instead of heavy shadows; very subtle shadows only
  (rgba(32,32,32,0.06) 0 1px 2px).
- CTA = solid ink-black pill (border-radius 9999px). Secondary = white pill with hairline.
- Brand accent #6647F0 (surgical use only), interactive blue #0091FF, success #00C07A.
- Cards: white, radius 16px, hairline border. Backgrounds: mist #F8F9FA sections.
- Professional, calm, enterprise-grade. No emoji anywhere — use Lucide-style line icons.

TYPOGRAPHY (Arabic-first):
- Headings: Cairo 700/800/900. Body: Tajawal 400/500/700.
- Latin/numbers display: Plus Jakarta Sans. Data/HUD: JetBrains Mono (tabular).
- Numbers always LTR isolated (e.g. "08:42", "15 EGP").

OFFICIAL EGYPTIAN TRANSIT LINE COLORS (use as badges, map lines, sparklines):
- Metro L1 #1D4ED8 · L2 #DC2626 · L3 #16A34A · L4 #EA580C
- LRT #0284C7 · Monorail #7C3AED · BRT #D97706 · National Rail #991B1B
- Bus #0D9488 · Walk #64748B

LAYOUT:
- Desktop frames 1440px, mobile frames 390px. RTL direction (start = right).
- 8px spacing grid, section rhythm 72–96px, sticky glass header (blur 16px).
- Realistic Arabic sample data (Cairo stations: السادات، عدلي منصور، التحرير،
  مصر الجديدة، العاصمة الإدارية…), real fares in EGP (8/10/15/20).

DESIGN THESE 18 SCREENS (each as a named frame, desktop + mobile):
01 welcome — dark announcement bar, sticky header, hero "القاهرة كلها… في جيبك" with
   live trip-plan preview card, official lines band, stats (7 lines, 172 stations,
   96 km BRT, 4M+ riders), network map teaser, CTA "ابدأ رحلتك الآن".
02 home — greeting "مساء الخير", mini trip planner (from/to + swap), live departures
   board per station, network status radar with per-line sparklines, favorite routes,
   quick access grid.
03 planner — big from/to inputs, swap button, results list (fastest/cheapest/least
   transfers) each with mode badges, duration, fare, leg breakdown, "ابدأ الرحلة".
04 journey-active — live trip HUD: next station countdown, progress spine with GPS
   pulse, turn-by-turn legs, speed control, delay deviation modal with recovery plan.
05 journey-completed — arrival hero, perforated receipt ticket (fare, duration),
   CO₂ saved metrics, 5-star accuracy rating.
06 history — trip stats band, saved/favorite routes, chronological trip groups.
07 map — interactive Greater Cairo map (Nile, ring road, colored lines, interchange
   stations), line filter chips, station departure popover.
08–12 network pages (metro / lrt / monorail / brt / train) — hero with line color,
   station diagram, key stations list, fare table, service hours, live alerts.
13 fares — fare calculator (stations count → price), tier cards 8/10/15/20 EGP,
   monthly passes, QR pass card.
14 community — crowd reports feed, report wizard (line → station → type → photo),
   reliability scores.
15 notifications — grouped feed (trips / alerts / community), unread states.
16 auth — Egyptian phone login (+20), OTP 4-digit entry with countdown, register mode.
17 profile — wallet balance, top-up, saved places (home/work), preferences, stats.
18 admin — dark operations console: KPI cards (ridership, punctuality), line
   operations table with health bars, live network map, alerts feed, GTFS sync.

CRAFT RULES:
- Build with auto-layout everywhere; name layers in Arabic + English.
- Create components for: PillButton (6 variants × 3 sizes), LineBadge, StatusPill
  (ontime/delay/closed), ModeIcon, FilterChip, Card, Input, Sparkline.
- Output: clean, editable, vector-first. No raster images. No emoji.
```

---

## 🇪🇬 البرومبت العربي (للمراجعة أو لمصمم بشري)

```
تصرف كعميل تصميم منتج خبير. صمّم منتج ويب كامل بمستوى إنتاجي باسم "واصل مصر" —
منصة النقل الذكي المتعدد لـ القاهرة الكبرى (مترو، قطار كهربائي خفيف LRT، مونوريل،
حافلات BRT سريعة، سكك حديد وطنية، أتوبيس، مشي).

الهوية البصرية — أسلوب ClickUp الاحترافي الفاتح:
- خلفية بيضاء #FFFFFF ونص حبري #202020 وثانوي #646464، حدود شعرية #E8E8E8
  بدل الظلال الثقيلة، ظل خفيف جدًا فقط.
- زر رئيسي أسود حبري بشكل كبسولة (9999px)، ثانوي أبيض بحد رفيع.
- لون الهوية #6647F0 بجرعات جراحية، أزرق تفاعلي #0091FF، نجاح #00C07A.
- كروت بيضاء بنصف قطر 16px، أقسام رمادية فاتحة #F8F9FA، هيدر زجاجي ثابت.
- ممنوع الإيموجي نهائيًا — أيقونات Lucide خطية فقط.

الخطوط: العناوين Cairo (700–900)، المتن Tajawal، اللاتيني Plus Jakarta Sans،
الأرقام ولوحات البيانات JetBrains Mono — والأرقام دايمًا LTR معزولة.

ألوان الخطوط الرسمية (شارات + خرائط): مترو L1 أزرق ملكي #1D4ED8، L2 قرمزي #DC2626،
L3 زمردي #16A34A، L4 برتقالي #EA580C، LRT سماوي #0284C7، مونوريل بنفسجي #7C3AED،
BRT كهرماني #D97706، سكة حديد نبيتي #991B1B، أتوبيس تيل #0D9488، مشي رمادي #64748B.

صمّم 18 شاشة (ديسكتوب 1440 + موبايل 390، اتجاه RTL):
1 الترحيب — هيرو "القاهرة كلها… في جيبك" + كتّاب خطة رحلة حية + شريط الخطوط الرسمية + إحصائيات.
2 الرئيسية — تحية، مخطط رحلة مصغّر، لوحة مغادرات حية، رادار حالة الشبكة برسمات شرارة، مفضلات.
3 مخطط الرحلة — حقول من/إلى + تبديل، نتائج (الأسرع/الأرخص/أقل تبديل) مع شارات الوسائط والأجرة.
4 الرحلة الجارية — HUD حي: عد تنازلي للمحطة التالية، عمود تقدم بنبضة GPS، شرح الشرائح،
   مودال الانحراف مع خطة تعويضية.
5 اكتمال الرحلة — تذكرة إيصال مثقوبة، الأجرة والمدة، CO₂ موفَّر، تقييم دقة 5 نجوم.
6 سجل الرحلات — شريط إحصائيات، مسارات محفوظة، مجموعات زمنية.
7 الخريطة — خريطة القاهرة الكبرى (النيل، الطريق الدائري، الخطوط الملونة، محطات التبادل)
   مع فلاتر ولوحة مغادرات للمحطة.
8–12 صفحات الشبكات (مترو / LRT / مونوريل / BRT / قطار) — هيرو بلون الخط، دياگرام المحطات،
   الأجور، مواعيد الخدمة، تنبيهات.
13 الأجور — حاسبة أجرة بالمحطات، شرائح 8/10/15/20 ج.م، بطاقات اشتراك، بطاقة QR.
14 المجتمع — تقارير الزحام ومعالج بلاغ (خط → محطة → نوع → صورة) ودرجات موثوقية.
15 الإشعارات — مجموعة (رحلات / تنبيهات / مجتمع) بحالات غير مقروء.
16 الدخول — موبايل مصري +20 ورمز OTP بأربع خانات بعدّاد.
17 الملف الشخصي — محفظة ورصيد وأماكن محفوظة وتفضيلات.
18 لوحة التشغيل (داكنة) — مؤشرات KPI وجدول تشغيل الخطوط بشرائط صحة وخريطة حية وتنبيهات
   ومزامنة GTFS.

قواعد التنفيذ: Auto Layout في كل شيء، مكونات (أزرار 6 أنواع × 3 أحجام، شارة خط،
شارة حالة، أيقونة وسيلة، شرائح فلترة)، طبقات مسماة بالعربية، كل شيء فيكتور قابل
للتحرير وبدون صور نقطية.
```

---

## ملاحظات مهمة عن استخدام البرومبت

1. **في Figma AI (First Draft / Figma Make):** ابدأ بالبرومبت الإنجليزي كاملًا. الأداة
   ستبني الهيكل والستايل — بعدها طبّق الألوان الرسمية والخطوط العربية يدويًا (أو
   بالبرومبت الجزئي لكل شاشة على حدة للحصول على دقة أعلى).
2. **شاشة واحدة في المرة = دقة أعلى:** لو الأداة بتطلع نتائج سطحية، ابعت تعريف شاشة
   واحدة بس (من الـ 18) واطلب تفاصيلها الكاملة، وكرر لكل شاشة.
3. **الأصول الجاهزة:** فولدر `figma-export` ده فيه بالفعل الشاشات الـ 18 الحقيقية
   كـ SVG فيكتور (ديسكتوب + موبايل) — استوردها في Figma وهتلاقي كل عنصر قابل
   للتحرير، وبرومبت ده يشتغل كـ Brief مرجعي لإعادة البناء أو التطوير.
4. **الخطوط المطلوبة في Figma:** Cairo و Tajawal و Plus Jakarta Sans و Inter و
   JetBrains Mono — كلها متاحة مجانًا على Google Fonts.
