import { useState, useEffect } from 'react'
import { MapPin, CircleCheck, Ban, Radio, TrainFront, WifiOff, RefreshCw, X } from 'lucide-react'
import type { Lang } from '../App'
import { GPS_STATUS_COLORS } from './icons'

export type GPSState =
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'lost'
  | 'tunnel'
  | 'offline'
  | 'reconnecting'

interface Props {
  state: GPSState
  lang: Lang
  t: (ar: string, en: string) => string
  onClose?: () => void
  onRetry?: () => void
  onOpenSettings?: () => void
  darkMode?: boolean
}

interface StateConfig {
  Icon: typeof MapPin
  iconBg: string
  iconColor: string
  title_ar: string
  title_en: string
  desc_ar: string
  desc_en: string
  action_ar?: string
  action_en?: string
  actionType?: 'retry' | 'settings' | 'close'
  secondary_ar?: string
  secondary_en?: string
}

const stateConfigs: Record<GPSState, StateConfig> = {
  requesting: {
    Icon: MapPin,
    iconBg: GPS_STATUS_COLORS.blueBg,
    iconColor: GPS_STATUS_COLORS.blueText,
    title_ar: 'السماح بالوصول للموقع',
    title_en: 'Allow Location Access',
    desc_ar: 'يحتاج واصل مصر للوصول لموقعك لإظهار رحلات قريبة ومتابعة رحلتك الحالية.',
    desc_en: 'Wasel Egypt needs your location to show nearby trips and track your current journey.',
    action_ar: 'السماح بالوصول',
    action_en: 'Allow Access',
    actionType: 'close',
  },
  granted: {
    Icon: CircleCheck,
    iconBg: GPS_STATUS_COLORS.emeraldBg,
    iconColor: GPS_STATUS_COLORS.emeraldText,
    title_ar: 'تم تفعيل الموقع',
    title_en: 'Location Active',
    desc_ar: 'تم تحديد موقعك بنجاح. يمكننا الآن عرض الرحلات المجاورة وتتبع رحلتك.',
    desc_en: 'Your location has been detected. We can now show nearby trips and track your journey.',
    action_ar: 'حسناً',
    action_en: 'Got it',
    actionType: 'close',
  },
  denied: {
    Icon: Ban,
    iconBg: GPS_STATUS_COLORS.redBg,
    iconColor: GPS_STATUS_COLORS.redText,
    title_ar: 'تم رفض الوصول للموقع',
    title_en: 'Location Access Denied',
    desc_ar: 'لا يمكن عرض الرحلات القريبة منك. يرجى تفعيل الموقع من إعدادات الجهاز.',
    desc_en: 'Cannot show nearby trips. Please enable location in your device settings.',
    action_ar: 'فتح الإعدادات',
    action_en: 'Open Settings',
    actionType: 'settings',
    secondary_ar: 'تخطي',
    secondary_en: 'Skip',
  },
  lost: {
    Icon: Radio,
    iconBg: GPS_STATUS_COLORS.amberBg,
    iconColor: GPS_STATUS_COLORS.amberText,
    title_ar: 'فقدنا إشارة موقعك',
    title_en: 'Location Signal Lost',
    desc_ar: 'تعذّر تحديد موقعك الحالي. يُرجى التأكد من تفعيل GPS والمحاولة مجدداً.',
    desc_en: 'Could not determine your current location. Please ensure GPS is enabled and try again.',
    action_ar: 'إعادة المحاولة',
    action_en: 'Retry',
    actionType: 'retry',
    secondary_ar: 'تخطي',
    secondary_en: 'Skip',
  },
  tunnel: {
    Icon: TrainFront,
    iconBg: GPS_STATUS_COLORS.purpleBg,
    iconColor: GPS_STATUS_COLORS.purpleText,
    title_ar: 'وضع النفق',
    title_en: 'Tunnel Mode',
    desc_ar: 'أنت في نفق أو منطقة بدون إشارة. سيعود التتبع التلقائي عند خروجك.',
    desc_en: 'You are in a tunnel or no-signal area. Tracking will resume automatically when you exit.',
    action_ar: 'فهمت',
    action_en: 'Understood',
    actionType: 'close',
  },
  offline: {
    Icon: WifiOff,
    iconBg: GPS_STATUS_COLORS.slateBg,
    iconColor: GPS_STATUS_COLORS.slateText,
    title_ar: 'لا يوجد اتصال بالإنترنت',
    title_en: 'No Internet Connection',
    desc_ar: 'بعض الميزات غير متاحة حالياً. ستعمل الخرائط والمحطات المحفوظة بدون اتصال.',
    desc_en: 'Some features are unavailable. Saved maps and stations work offline.',
    action_ar: 'إعادة المحاولة',
    action_en: 'Try Again',
    actionType: 'retry',
  },
  reconnecting: {
    Icon: RefreshCw,
    iconBg: GPS_STATUS_COLORS.blueBg,
    iconColor: GPS_STATUS_COLORS.blueText,
    title_ar: 'جارٍ إعادة الاتصال...',
    title_en: 'Reconnecting...',
    desc_ar: 'نحاول استعادة الاتصال. يُرجى الانتظار لحظة.',
    desc_en: 'Trying to restore connection. Please wait a moment.',
  },
}

function TunnelTimer({ lang, t }: { lang: Lang; t: (ar: string, en: string) => string }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const time = `${m}:${s.toString().padStart(2, '0')}`
  return (
    <div className="mt-3 text-center">
      <p className="text-4xl font-mono font-bold text-purple-600">{time}</p>
      <p className="text-xs text-neutral-500 mt-1">{t('في النفق', 'In tunnel')}</p>
    </div>
  )
}

export default function GPSStates({ state, lang, t, onClose, onRetry, onOpenSettings, darkMode }: Props) {
  const config = stateConfigs[state]
  const isSpinning = state === 'reconnecting'

  const overlayBg = darkMode ? 'bg-black/60' : 'bg-black/40'
  const cardBg = darkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
  const textPrimary = darkMode ? 'text-white' : 'text-neutral-900'
  const textSecondary = darkMode ? 'text-neutral-400' : 'text-neutral-500'

  const handleAction = () => {
    if (config.actionType === 'settings') onOpenSettings?.()
    else if (config.actionType === 'retry') onRetry?.()
    else onClose?.()
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 ${overlayBg} backdrop-blur-sm`}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={`w-full max-w-sm ${cardBg} border rounded-3xl p-6 shadow-2xl`}>
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpinning ? 'animate-spin' : ''}`}
            style={{ background: config.iconBg, color: config.iconColor }}>
            <config.Icon size={30} />
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-lg font-bold ${textPrimary} text-center mb-2`}>
          {lang === 'ar' ? config.title_ar : config.title_en}
        </h2>

        {/* Description */}
        <p className={`text-sm ${textSecondary} text-center mb-4`}>
          {lang === 'ar' ? config.desc_ar : config.desc_en}
        </p>

        {/* Tunnel timer */}
        {state === 'tunnel' && <TunnelTimer lang={lang} t={t} />}

        {/* Reconnecting pulse */}
        {state === 'reconnecting' && (
          <div className="flex justify-center gap-1.5 my-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-500 ai-dot" />
            ))}
          </div>
        )}

        {/* Offline indicator */}
        {state === 'offline' && (
          <div className={`flex items-center gap-2 justify-center mb-3 px-3 py-2 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-neutral-100'}`}>
            <div className="flex items-end gap-0.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-1.5 rounded-sm ${i <= 1 ? 'bg-slate-400' : 'bg-slate-200'}`} style={{ height: `${i * 5}px` }} />
              ))}
            </div>
            <span className={`text-xs font-medium ${textSecondary}`}>{t('غير متصل', 'Offline')}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          {config.action_ar && (
            <button onClick={handleAction}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
              style={{ background: config.iconColor }}>
              {lang === 'ar' ? config.action_ar : config.action_en}
            </button>
          )}
          {config.secondary_ar && (
            <button onClick={onClose}
              className={`w-full py-2.5 rounded-xl font-medium text-sm border transition-colors ${darkMode ? 'border-neutral-700 text-neutral-400 hover:text-white' : 'border-neutral-200 text-neutral-500 hover:text-neutral-900'}`}>
              {lang === 'ar' ? config.secondary_ar : config.secondary_en}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
