import { useState } from 'react'
import type { Screen, Lang } from '../App'
import {
  Loader2, Inbox, TriangleAlert, WifiOff, Lock, Ban, MapPin, Radio, TrainFront, RefreshCw,
} from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  darkMode?: boolean
}

type StateType = 'loading' | 'empty' | 'error' | 'offline' | 'unauthorized' | 'forbidden' | 'gps-denied' | 'gps-lost' | 'tunnel' | 'reconnecting'

const states: { id: StateType, Icon: typeof MapPin, title_ar: string, title_en: string, body_ar: string, body_en: string, action_ar?: string, action_en?: string, color: string }[] = [
  {
    id: 'loading',
    Icon: Loader2,
    title_ar: 'جاري التحميل',
    title_en: 'Loading',
    body_ar: 'انتظر لحظة...',
    body_en: 'Please wait a moment...',
    color: 'text-blue-600',
  },
  {
    id: 'empty',
    Icon: Inbox,
    title_ar: 'لا توجد نتائج',
    title_en: 'No Results',
    body_ar: 'جرّب تغيير البحث أو الفلاتر',
    body_en: 'Try changing your search or filters',
    action_ar: 'مسح الفلاتر',
    action_en: 'Clear filters',
    color: 'text-neutral-400',
  },
  {
    id: 'error',
    Icon: TriangleAlert,
    title_ar: 'حصل خطأ',
    title_en: 'Something went wrong',
    body_ar: 'تعذّر تحميل البيانات. تحقق من اتصالك وحاول مرة أخرى.',
    body_en: 'Could not load data. Check your connection and try again.',
    action_ar: 'إعادة المحاولة',
    action_en: 'Try again',
    color: 'text-red-500',
  },
  {
    id: 'offline',
    Icon: WifiOff,
    title_ar: 'لا يوجد اتصال بالإنترنت',
    title_en: 'No Internet Connection',
    body_ar: 'تأكد من اتصالك بالواي فاي أو بيانات الموبايل',
    body_en: 'Check your Wi-Fi or mobile data connection',
    action_ar: 'إعادة المحاولة',
    action_en: 'Retry',
    color: 'text-neutral-500',
  },
  {
    id: 'unauthorized',
    Icon: Lock,
    title_ar: 'تسجيل الدخول مطلوب',
    title_en: 'Sign In Required',
    body_ar: 'يجب تسجيل الدخول للوصول لهذه الميزة',
    body_en: 'You need to sign in to access this feature',
    action_ar: 'تسجيل الدخول',
    action_en: 'Sign In',
    color: 'text-blue-500',
  },
  {
    id: 'forbidden',
    Icon: Ban,
    title_ar: 'غير مصرح',
    title_en: 'Access Denied',
    body_ar: 'ليس لديك صلاحية الوصول لهذه الصفحة',
    body_en: 'You don\'t have permission to access this page',
    action_ar: 'العودة للرئيسية',
    action_en: 'Back to Home',
    color: 'text-red-500',
  },
  {
    id: 'gps-denied',
    Icon: MapPin,
    title_ar: 'تم رفض إذن الموقع',
    title_en: 'Location Permission Denied',
    body_ar: 'واصل يحتاج لموقعك لتحديد أقرب المحطات وتتبع رحلتك. يمكنك السماح من إعدادات الجهاز.',
    body_en: 'Wasel needs your location to find nearby stations and track your journey. You can allow it in device settings.',
    action_ar: 'فتح الإعدادات',
    action_en: 'Open Settings',
    color: 'text-amber-500',
  },
  {
    id: 'gps-lost',
    Icon: Radio,
    title_ar: 'فُقد إشارة GPS',
    title_en: 'GPS Signal Lost',
    body_ar: 'إشارة GPS ضعيفة. ممكن تكون في نفق أو منطقة مغلقة. جاري إعادة المحاولة...',
    body_en: 'GPS signal is weak. You may be in a tunnel or covered area. Retrying...',
    action_ar: 'إعادة المحاولة',
    action_en: 'Retry',
    color: 'text-amber-500',
  },
  {
    id: 'tunnel',
    Icon: TrainFront,
    title_ar: 'وضع النفق',
    title_en: 'Tunnel Mode',
    body_ar: 'أنت في نفق. الملاحة تعمل بدون GPS باستخدام بيانات المحطات',
    body_en: 'You\'re in a tunnel. Navigation working without GPS using station data',
    color: 'text-violet-500',
  },
  {
    id: 'reconnecting',
    Icon: RefreshCw,
    title_ar: 'جاري إعادة الاتصال...',
    title_en: 'Reconnecting...',
    body_ar: 'تعذّر الاتصال مؤقتاً. جاري إعادة المحاولة تلقائياً',
    body_en: 'Connection temporarily lost. Retrying automatically',
    color: 'text-blue-500',
  },
]

export default function SystemStatesScreen({ lang, t, nav, darkMode }: Props) {
  const [activeState, setActiveState] = useState<StateType>('empty')
  const state = states.find(s => s.id === activeState)!

  const bg = darkMode ? 'bg-neutral-900' : 'bg-neutral-50'
  const cardBg = darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'
  const pillActive = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
  const pillInactive = darkMode ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-white text-neutral-600 border border-neutral-200'

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'} border-b px-4 py-4 sticky top-0 z-30`}>
        <h1 className={`text-xl font-bold ${textPrimary} mb-3`}>{t('حالات النظام', 'System States')}</h1>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {states.map(s => (
            <button key={s.id} onClick={() => setActiveState(s.id)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${activeState === s.id ? pillActive : pillInactive}`}>
              {<s.Icon size={13} />} {lang === 'ar' ? s.title_ar.split(' ')[0] : s.title_en.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Preview area */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* State display */}
        <div className={`${cardBg} border rounded-2xl overflow-hidden mb-6`}>
          {/* Skeleton preview for loading */}
          {activeState === 'loading' && (
            <div className="p-6 space-y-3">
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-20 w-full rounded-xl" />
              <div className="skeleton h-20 w-full rounded-xl" />
              <div className="flex gap-3">
                <div className="skeleton h-10 flex-1 rounded-xl" />
                <div className="skeleton h-10 flex-1 rounded-xl" />
              </div>
            </div>
          )}

          {/* Reconnecting with spinner */}
          {activeState === 'reconnecting' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-4" />
              <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>{lang === 'ar' ? state.title_ar : state.title_en}</h3>
              <p className={`text-sm ${textSecondary}`}>{lang === 'ar' ? state.body_ar : state.body_en}</p>
            </div>
          )}

          {/* Tunnel mode */}
          {activeState === 'tunnel' && (
            <div className="p-6 bg-violet-50 dark:bg-violet-950">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white"><TrainFront size={20} /></div>
                <div>
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{lang === 'ar' ? state.title_ar : state.title_en}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">{lang === 'ar' ? state.body_ar : state.body_en}</p>
                </div>
              </div>
              <div className="rounded-xl p-3 bg-violet-100 dark:bg-violet-900/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300"><TrainFront size={14} /> {t('خط ١', 'Line 1')}</span>
                  <span className="text-violet-600 dark:text-violet-400">{t('المحطة القادمة: سعد زغلول', 'Next: Saad Zaghloul')}</span>
                </div>
              </div>
            </div>
          )}

          {/* All other states */}
          {!['loading', 'reconnecting', 'tunnel'].includes(activeState) && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5 ${
                activeState === 'error' || activeState === 'forbidden' ? (darkMode ? 'bg-red-900/30' : 'bg-red-50') :
                activeState === 'gps-denied' || activeState === 'gps-lost' ? (darkMode ? 'bg-amber-900/30' : 'bg-amber-50') :
                activeState === 'offline' ? (darkMode ? 'bg-neutral-800' : 'bg-neutral-100') :
                activeState === 'unauthorized' ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') :
                (darkMode ? 'bg-neutral-800' : 'bg-neutral-100')
              }`}>
                <state.Icon size={34} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {lang === 'ar' ? state.title_ar : state.title_en}
              </h3>
              <p className={`text-sm leading-relaxed max-w-xs mb-6 ${textSecondary}`}>
                {lang === 'ar' ? state.body_ar : state.body_en}
              </p>
              {state.action_ar && (
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button onClick={() => activeState === 'unauthorized' ? nav('auth') : activeState === 'forbidden' ? nav('home') : undefined}
                    className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors ${
                      activeState === 'error' || activeState === 'gps-lost' || activeState === 'offline' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {lang === 'ar' ? state.action_ar : state.action_en}
                  </button>
                  {(activeState === 'unauthorized' || activeState === 'forbidden') && (
                    <button onClick={() => nav('home')}
                      className={`w-full py-3 rounded-2xl font-medium text-sm border ${darkMode ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-neutral-600'}`}>
                      {t('العودة للرئيسية', 'Back to Home')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* State info */}
        <div className={`${cardBg} border rounded-2xl p-4`}>
          <p className={`text-xs font-semibold ${textSecondary} mb-2 font-mono`}>State: {activeState}</p>
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className={`text-xs ${textSecondary}`}>{t('العربية:', 'Arabic:')}</span>
              <span className={`text-xs ${textPrimary}`}>{state.title_ar}</span>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs ${textSecondary}`}>{t('الإنجليزية:', 'English:')}</span>
              <span className={`text-xs ${textPrimary}`}>{state.title_en}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
