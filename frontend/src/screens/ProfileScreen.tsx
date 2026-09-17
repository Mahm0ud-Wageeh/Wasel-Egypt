import { useState, useEffect } from 'react'
import type { Screen, Lang } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { Map as MapIcon, User as UserIcon, LogOut, Settings } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
}

export default function ProfileScreen({ lang, t, nav }: Props) {
  const { user, isLoggedIn, isAdmin, logout } = useAuth()
  const [savedTrips, setSavedTrips] = useState<any[]>([])

  useEffect(() => {
    try {
      const trips = JSON.parse(localStorage.getItem('wasel.saved_trips') || '[]')
      setSavedTrips(trips)
    } catch {
      setSavedTrips([])
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    nav('home')
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Profile Header */}
      <div className="bg-white border-b border-neutral-200 px-4 pt-6 pb-6 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'م'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 truncate">
                {user?.name || (isLoggedIn ? 'مستخدم واصل' : t('زائر', 'Guest Traveler'))}
              </h1>
              {isAdmin && (
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate">
              {user?.email || (isLoggedIn ? 'account@wasel.eg' : t('سجل دخولك لحفظ بياناتك', 'Sign in to save preferences'))}
            </p>
          </div>

          {!isLoggedIn ? (
            <button
              onClick={() => nav('auth')}
              className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-blue-700"
            >
              {t('دخول', 'Sign In')}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="text-neutral-400 hover:text-red-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-50"
            >
              {t('خروج', 'Logout')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Admin Access Banner (if admin) */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">لوحة تحكم مسؤول النظام (Wasel Admin)</p>
              <p className="text-xs text-neutral-300">إدارة خطوط النقل، الأسعار، المستخدمين والتحليلات</p>
            </div>
            <button
              onClick={() => nav('admin')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
            >
              دخول الإدارة
            </button>
          </div>
        )}

        {/* Saved Trips Section */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">{t('الرحلات المحفوظة', 'Saved Trips')}</h2>
            <span className="text-xs text-neutral-400">{savedTrips.length}</span>
          </div>

          {savedTrips.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs">
              <MapIcon size={26} className="block mb-1 mx-auto text-blue-600" />
              {t('لا توجد رحلات محفوظة حتى الآن. يمكنك حفظ أي مسار من مخطط الرحلات.', 'No saved trips yet. You can save any route from the planner.')}
            </div>
          ) : (
            <div className="space-y-2">
              {savedTrips.map((tr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 text-start"
                >
                  <div>
                    <p className="text-xs font-bold text-neutral-800">{tr.from} → {tr.to}</p>
                    <p className="text-[10px] text-neutral-400">{tr.duration} دقيقة • {tr.fare} جنيه</p>
                  </div>
                  <button
                    onClick={() => nav('planner')}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    {t('تخطيط', 'Plan')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Settings & Language */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">{t('تفضيلات التطبيق', 'Preferences')}</h2>

          <div className="flex items-center justify-between py-2 border-b border-neutral-100 text-xs font-semibold text-neutral-700">
            <span>{t('لغة التطبيق', 'Application Language')}</span>
            <span className="text-blue-600 font-bold">{lang === 'ar' ? 'العربية' : 'English'}</span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs font-semibold text-neutral-700">
            <span>{t('إشعارات التأخيرات والأعطال', 'Transit Delay Alerts')}</span>
            <span className="text-green-600 font-bold">{t('مفعلة', 'Active')}</span>
          </div>
        </div>

        {/* About App */}
        <div className="text-center text-xs text-neutral-400 pt-4 space-y-1">
          <p className="font-bold text-neutral-500">واصل مصر | Wasel Egypt v1.0.0</p>
          <p>© 2026 جميع الحقوق محفوظة لجمهورية مصر العربية</p>
        </div>
      </div>
    </div>
  )
}
