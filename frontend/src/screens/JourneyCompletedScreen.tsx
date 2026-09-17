import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { CheckCircle2, Star, Share2, ArrowRight, RotateCcw, Leaf, Clock, Banknote, ShieldCheck, Bookmark } from 'lucide-react'
import { ModeIcon, MODE_COLORS } from '../components/icons'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

export default function JourneyCompletedScreen({ lang, t, nav, darkMode }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'

  const journey = {
    from_ar: 'محطة رمسيس',
    from_en: 'Ramses Station',
    to_ar: 'محطة عدلي منصور',
    to_en: 'Adly Mansour Station',
    duration_ar: '٣٢ دقيقة',
    duration_en: '32 minutes',
    fare_ar: '١٢ جنيه',
    fare_en: '12 EGP',
    segments: [
      { mode: 'metro', line_ar: 'مترو خط ١', line_en: 'Metro Line 1', from_ar: 'رمسيس', from_en: 'Ramses', to_ar: 'تحرير', to_en: 'Tahrir', stops: 3, color: MODE_COLORS.metro },
      { mode: 'walking', line_ar: 'مشي', line_en: 'Walk', from_ar: 'تحرير', from_en: 'Tahrir', to_ar: 'تحرير', to_en: 'Tahrir', stops: 0, color: MODE_COLORS.walking },
      { mode: 'metro', line_ar: 'مترو خط ٣', line_en: 'Metro Line 3', from_ar: 'تحرير', from_en: 'Tahrir', to_ar: 'عدلي منصور', to_en: 'Adly Mansour', stops: 5, color: MODE_COLORS.lrt },
    ],
    arrivedAt: '09:47',
    co2_ar: 'وفّرت ٢.٣ كجم CO₂', co2_en: 'Saved 2.3 kg CO₂',
  }

  return (
    <div className={`min-h-screen ${bg} flex flex-col`}>
      {/* Success banner */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 px-4 pt-8 pb-16 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">{t('وصلت بسلام!', 'Arrived Safely!')}</h1>
        <p className="text-blue-100 text-sm">{t('تم إنجاز رحلتك بنجاح', 'Your journey was completed successfully')}</p>
        <p className="text-blue-200 text-xs mt-1">{t('وصلت الساعة', 'Arrived at')} {journey.arrivedAt}</p>
      </div>

      {/* Card */}
      <div className={`${cardBg} border rounded-t-3xl -mt-6 relative z-10 flex-1`}>
        <div className="px-4 py-5">
          {/* Route summary */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1">
              <p className={`text-xs ${textSecondary} mb-0.5`}>{t('من', 'From')}</p>
              <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? journey.from_ar : journey.from_en}</p>
            </div>
            <svg className={`w-5 h-5 ${textSecondary} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex-1 text-end">
              <p className={`text-xs ${textSecondary} mb-0.5`}>{t('إلى', 'To')}</p>
              <p className={`text-sm font-semibold ${textPrimary}`}>{lang === 'ar' ? journey.to_ar : journey.to_en}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}`}>
              <p className="text-xl font-bold text-blue-600">{lang === 'ar' ? journey.duration_ar : journey.duration_en}</p>
              <p className={`text-xs ${textSecondary}`}>{t('مدة الرحلة', 'Travel time')}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-neutral-700' : 'bg-neutral-50'}`}>
              <p className="text-xl font-bold text-blue-600">{lang === 'ar' ? journey.fare_ar : journey.fare_en}</p>
              <p className={`text-xs ${textSecondary}`}>{t('التذكرة المدفوعة', 'Fare paid')}</p>
            </div>
          </div>

          {/* CO2 savings */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <Leaf size={18} className="text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {lang === 'ar' ? journey.co2_ar : journey.co2_en}
            </p>
          </div>

          {/* Journey segments */}
          <h3 className={`text-sm font-semibold ${textSecondary} mb-3`}>{t('تفاصيل الرحلة', 'Journey breakdown')}</h3>
          <div className="space-y-2 mb-6">
            {journey.segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: seg.color + '20' }}>
                  <ModeIcon mode={seg.mode} size={17} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textPrimary}`}>{lang === 'ar' ? seg.line_ar : seg.line_en}</p>
                  <p className={`text-xs ${textSecondary}`}>
                    {lang === 'ar' ? seg.from_ar : seg.from_en} → {lang === 'ar' ? seg.to_ar : seg.to_en}
                    {seg.stops > 0 && ` · ${seg.stops} ${t('محطات', 'stops')}`}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              </div>
            ))}
          </div>

          {/* Rating */}
          {!submitted ? (
            <div className={`rounded-2xl border p-4 mb-4 ${cardBg}`}>
              <p className={`text-sm font-semibold ${textPrimary} mb-3 text-center`}>{t('كيف كانت رحلتك؟', 'How was your journey?')}</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${star} / 5`}>
                    <Star
                      size={30}
                      className={star <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <button onClick={() => setSubmitted(true)}
                  className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {t('إرسال التقييم', 'Submit Rating')}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 mb-4 text-center">
              <div className="flex justify-center gap-1 mb-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} size={22} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {t('شكراً على تقييمك!', 'Thanks for your rating!')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className={`py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 ${darkMode ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-700'}`}>
              <Share2 size={15} /> {t('مشاركة', 'Share')}
            </button>
            <button className={`py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 ${darkMode ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-700'}`}>
              <Bookmark size={15} /> {t('حفظ', 'Save')}
            </button>
          </div>

          <button onClick={() => nav('home')} className="w-full mt-3 bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm">
            {t('العودة للرئيسية', 'Back to Home')}
          </button>
        </div>
      </div>
    </div>
  )
}
