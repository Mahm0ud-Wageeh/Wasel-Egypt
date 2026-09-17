import { useState } from 'react'
import type { Screen, Lang } from '../App'
import {
  Navigation, Check, ChevronDown, ChevronUp, MapPin,
  Compass, Ticket, ShieldCheck, ArrowRight, Route, Clock3, Sparkles
} from 'lucide-react'

interface Props {
  lang: Lang
  setLang: (l: Lang) => void
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
}

export default function LandingScreen({ lang, setLang, t, nav }: Props) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx)
  }

  const faqs = [
    {
      q_ar: 'ما هو تطبيق واصل مصر؟',
      q_en: 'What is Wasel Egypt?',
      a_ar: 'واصل مصر هو نظام النقل الذكي الشامل، يربط شبكات مترو القاهرة، القطار الخفيف LRT، المونوريل، وسكك حديد مصر، وحافلات BRT لتوفير أدق مسار وأسرع وصول.',
      a_en: 'Wasel Egypt is the all-in-one smart transit guide connecting Cairo Metro, LRT, Monorail, ENR rail, and BRT buses into a unified real-time journey planner.',
    },
    {
      q_ar: 'هل التطبيق مجاني بالكامل؟',
      q_en: 'Is the platform completely free to use?',
      a_ar: 'نعم، التطبيق متاح مجاناً للمواطنين والزوار لجميع خدمات تخطيط الرحلات، استعراض الخرائط، ومعرفة الأسعار وجداول الخطوط الرسمية.',
      a_en: 'Yes, Wasel Egypt is completely free for route planning, interactive network exploration, official fares calculation, and transit timetables.',
    },
    {
      q_ar: 'ما هي وسائل النقل المدعومة حالياً؟',
      q_en: 'Which transit modes are currently supported?',
      a_ar: 'يشمل النظام خطوط المترو الثلاثة، قطار العاصمة الخفيف LRT، خطي المونوريل، خطوط الهيئة القومية لسكك حديد مصر الرئيسية، وشبكة حافلات الطريق الدائري BRT.',
      a_en: 'The system covers Cairo Metro lines 1-3, Capital LRT, Monorail corridors, ENR mainline rail, and Cairo Ring Road BRT buses.',
    },
    {
      q_ar: 'كيف يتم التأكد من دقة أسعار التذاكر؟',
      q_en: 'How are ticket fares verified?',
      a_ar: 'يتم تحديث تعريفات التذاكر مباشرة وفق القرارات الرسمية الصادرة عن وزارة النقل والشركات المشغلة مع بيان واضح لعدد المحطات وتكلفة كل فئة.',
      a_en: 'All fares are directly synchronized with official Ministry of Transport tariffs with clear station-zone breakdown for standard, senior, and special categories.',
    },
    {
      q_ar: 'هل يمكنني تخطيط رحلتي بدون إنشاء حساب؟',
      q_en: 'Can I plan journeys as a guest without creating an account?',
      a_ar: 'بالتأكيد، يمكنك البحث عن أي محطة، حساب المسار، واستعراض الخريطة والأسعار فوراً كضيف، بينما يمنحك الحساب إمكانية حفظ رحلاتك والتتبع الحي.',
      a_en: 'Certainly! You can search routes, calculate fares, and view the map instantly as a guest. An account lets you save trips and access full live GPS tracking.',
    },
    {
      q_ar: 'كيف تعمل ميزة الملاحة الحية والتنبيهات؟',
      q_en: 'How does live navigation and tracking work?',
      a_ar: 'عند بدء رحلتك، يقوم النظام بمتابعة موقعك خطوة بخطوة مع توجيه صوتي وتنبيه تلقائي قبل محطة النزول ومحطات التبديل بين الخطوط.',
      a_en: 'When starting a journey, live GPS tracks your real-time progress, alerting you before arrival and transfer hubs with audio guidance.',
    },
  ]

  const metroFares = [
    { zone_ar: 'منطقة 1 (حتى 9 محطات)', zone_en: 'Zone 1 (Up to 9 stations)', reg: '8 ج.م', senior: '4 ج.م' },
    { zone_ar: 'منطقة 2 (10 إلى 16 محطة)', zone_en: 'Zone 2 (10 to 16 stations)', reg: '10 ج.م', senior: '5 ج.م' },
    { zone_ar: 'منطقة 3 (17 إلى 23 محطة)', zone_en: 'Zone 3 (17 to 23 stations)', reg: '15 ج.م', senior: '8 ج.م' },
    { zone_ar: 'منطقة 4 (أكثر من 23 محطة)', zone_en: 'Zone 4 (More than 23 stations)', reg: '20 ج.م', senior: '10 ج.م' },
  ]

  return (
    <div className="min-h-screen bg-bg-light text-navy antialiased">
      {/* 1. HERO SECTION (Fast 3-second comprehension on 390px mobile) */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-16 sm:pb-20 bg-gradient-to-b from-white to-bg-light border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Left / Text Column */}
            <div className="lg:col-span-7 space-y-5 text-start">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-bold text-primary">
                  {t('المنظومة الرسمية الأولى للنقل الذكي', 'Egypt\'s Premier Smart Transit Platform')}
                </span>
              </div>

              {/* Strict Requirement: Title < 10 words */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-tight">
                {lang === 'ar' ? 'دليلك الذكي الشامل لوسائل النقل في مصر' : 'Your All-in-One Smart Transit Guide in Egypt'}
              </h1>

              {/* Supporting Line */}
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-xl">
                {t(
                  'احسب رحلتك بالدقيقة والتكلفة عبر شبكة المترو والقطار والمونوريل والـ LRT في شاشة واحدة دقيقة.',
                  'Accurately calculate travel time and verified fares across Metro, Rail, Monorail, and LRT in one unified map.'
                )}
              </p>

              {/* Single Hero CTA button leading to /auth */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => nav('auth')}
                  className="bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3.5 rounded-2xl text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>{t('ابدأ مجاناً', 'Get Started Free')}</span>
                  <ArrowRight size={16} className={`${lang === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'} transition-transform`} />
                </button>
              </div>

              {/* Real Numbers Trust Line */}
              <div className="pt-3 flex items-center gap-2 text-xs font-bold text-neutral-500">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>{t('3,041 محطة وموقف معتمد · 1,018 خط سير رسمي', '3,041 verified stops · 1,018 official transit lines')}</span>
              </div>
            </div>

            {/* Right / Product Image Column */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-neutral-200 aspect-[16/10] bg-gradient-to-br from-navy to-primary">
                <img
                  src="/images/hero-transit.webp"
                  alt={lang === 'ar' ? 'شبكة النقل والمواصلات الذكية في مصر' : 'Modern rapid transit network in Egypt'}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 start-3 end-3 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-neutral-900">
                      {t('ملاحة حية وتتبع GPS فوري', 'Live GPS Navigation')}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary">
                    2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIGHT PROOF BAR */}
      <section className="bg-white border-b border-neutral-200 py-3.5">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-xs sm:text-sm font-bold text-navy">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>3,041 {t('محطة معتمدة', 'Verified Stations')}</span>
          </div>
          <span className="text-neutral-300 hidden sm:inline">·</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>1,018 {t('خط سير حقيقي', 'Official Lines')}</span>
          </div>
          <span className="text-neutral-300 hidden sm:inline">·</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>{t('أسعار رسمية 2026', 'Official 2026 Fares')}</span>
          </div>
        </div>
      </section>

      {/* 3. THREE FEATURES (PROBLEM / SOLUTION FORMAT) */}
      <section className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy">
            {t('لماذا تختار واصل مصر في كل تنقلاتك؟', 'Why Travel with Wasel Egypt?')}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            {t('حلول عملية مدروسة لكل تحديات التنقل اليومي في القاهرة والمدن الجديدة', 'Smart solutions for your daily commutes in Cairo and modern cities')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center">
              <Compass size={24} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg inline-block">
                {t('المشكلة:', 'The Challenge:')} {t('تشتت شبكات النقل والتبديل', 'Fragmented Transit Networks')}
              </div>
              <h3 className="text-base font-bold text-navy">
                {t('خريطة موحدة وتخطيط ذكي', 'Unified Map & Smart Routing')}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {t(
                  'يجمع واصل شبكات المترو، LRT، المونوريل، والقطارات في مسار واحد متكامل يعطيك أسرع بديل بالدقيقة.',
                  'Combines Metro, LRT, Monorail, and Rail into one seamless itinerary finding the fastest route.'
                )}
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Ticket size={24} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg inline-block">
                {t('المشكلة:', 'The Challenge:')} {t('غموض الأسعار وتغيير التذاكر', 'Unclear Ticket Fares')}
              </div>
              <h3 className="text-base font-bold text-navy">
                {t('شفافية الأسعار الرسمية 2026', 'Official 2026 Fare Calculator')}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {t(
                  'حاسبة أسعار دقيقة ومحدثة وفق تعريفة وزارة النقل الرسمية لعام 2026 لتجنب أي مفاجآت في محطة التذاكر.',
                  'Official Ministry of Transport fare calculations prevent any pricing confusion at the ticket window.'
                )}
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Navigation size={24} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg inline-block">
                {t('المشكلة:', 'The Challenge:')} {t('القلق من فوات محطة النزول', 'Missing Your Transfer Stop')}
              </div>
              <h3 className="text-base font-bold text-navy">
                {t('تتبع وملاحة حية مع تنبيهات صوتية', 'Live GPS Guidance & Audio Alerts')}
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {t(
                  'إرشادات خطوة بخطوة أثناء الركوب وتنبيهات صوتية فورية قبل اقترابك من محطة التبديل أو الوصول.',
                  'Step-by-step guidance on your route with instant alerts before your stop or transfer hub.'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REVIEWS SECTION: COMPLETELY OMITTED (No fake reviews policy) */}

      {/* 5. PRICE TRANSPARENCY (OFFICIAL CAIRO METRO 2026 TABLE) */}
      <section className="py-12 bg-white border-y border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              <Ticket size={14} />
              <span>{t('التعريفة الرسمية المعتمدة لعام 2026', 'Official 2026 Tariff Table')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-navy">
              {t('أسعار تذاكر مترو القاهرة الكبرى', 'Cairo Metro Official Fares')}
            </h2>
            <p className="text-xs text-neutral-500">
              {t('الأسعار الرسمية المعتمدة لجميع خطوط المترو بدون أي رسوم إضافية', 'Standard official rates across all Cairo Metro lines')}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-xs">
            <table className="w-full text-xs sm:text-sm text-start border-collapse">
              <thead>
                <tr className="bg-neutral-100 text-navy border-b border-neutral-200">
                  <th className="py-3 px-4 text-start font-bold">{t('المنطقة وعدد المحطات', 'Zone & Stations')}</th>
                  <th className="py-3 px-4 text-center font-bold">{t('التذكرة العادية', 'Standard')}</th>
                  <th className="py-3 px-4 text-center font-bold">{t('كبار السن (60+)', 'Seniors (60+)')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {metroFares.map((f, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-neutral-800">
                      {lang === 'ar' ? f.zone_ar : f.zone_en}
                    </td>
                    <td className="py-3 px-4 text-center text-primary font-bold">{f.reg}</td>
                    <td className="py-3 px-4 text-center text-neutral-600 font-bold">{f.senior}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50/50">
                  <td className="py-3 px-4 font-bold text-emerald-800">
                    {t('فئة ذوي الهمم (جميع المناطق)', 'People of Determination (All Zones)')}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center font-bold text-emerald-700">
                    5 {t('جنيهات فقط', 'EGP only')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. FAQ (6 INTERACTIVE ACCORDIONS) */}
      <section className="py-14 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy">
            {t('الأسئلة الشائعة حول واصل مصر', 'Frequently Asked Questions')}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            {t('إجابات مباشرة على أكثر الاستفسارات تكراراً عن التطبيق والخدمات', 'Direct answers to the most common questions about the platform')}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-4 px-5 flex items-center justify-between gap-4 text-start font-bold text-sm text-navy cursor-pointer"
                >
                  <span>{lang === 'ar' ? faq.q_ar : faq.q_en}</span>
                  {isOpen ? <ChevronUp size={18} className="text-primary shrink-0" /> : <ChevronDown size={18} className="text-neutral-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100">
                    {lang === 'ar' ? faq.a_ar : faq.a_en}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 7. FINAL CTA (Identical destination /auth + single secondary outline /map) */}
      <section className="py-16 bg-navy text-white border-t border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'El Messiri', sans-serif" }}>
            {t('جاهز لتجربة تنقل أكثر سهولة ودقة؟', 'Ready for a Smarter Transit Experience?')}
          </h2>
          <p className="text-xs sm:text-sm text-blue-200 max-w-xl mx-auto leading-relaxed">
            {t(
              'ابدأ الآن مجاناً وخطط رحلتك القادمة عبر شبكة النقل الذكية في مصر.',
              'Start free today and plan your next journey across Egypt\'s smart rapid transit network.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {/* Primary button identical to hero button: navigates to /auth */}
            <button
              onClick={() => nav('auth')}
              className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3.5 rounded-2xl text-sm shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              {t('ابدأ مجاناً', 'Get Started Free')}
            </button>

            {/* Single secondary outline button leading to /map */}
            <button
              onClick={() => nav('map')}
              className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white border border-white/30 font-bold px-8 py-3.5 rounded-2xl text-sm transition-all cursor-pointer"
            >
              {t('استكشف الخريطة', 'Explore Network Map')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark text-neutral-400 py-8 px-4 text-xs border-t border-neutral-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white">
              <Navigation size={14} className="rotate-45" />
            </div>
            <span className="font-bold text-white text-sm">
              {lang === 'ar' ? 'واصل مصر' : 'Wasel Egypt'}
            </span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <button onClick={() => nav('map')} className="hover:text-white transition-colors">{t('الخريطة', 'Map')}</button>
            <button onClick={() => nav('fares')} className="hover:text-white transition-colors">{t('الأسعار', 'Fares')}</button>
            <button onClick={() => nav('auth')} className="hover:text-white transition-colors">{t('دخول', 'Sign In')}</button>
          </div>

          <p className="text-neutral-500">© 2026 Wasel Egypt. {t('جميع الحقوق محفوظة', 'All rights reserved.')}</p>
        </div>
      </footer>
    </div>
  )
}
