import { useState } from 'react'
import type { Screen, Lang } from '../App'
import { useAuth } from '../contexts/AuthContext'
import { TriangleAlert, Eye, EyeOff } from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
  setLoggedIn?: (v: boolean) => void
}

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot' | 'verify'

export default function AuthScreen({ lang, t, nav, setLoggedIn }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg(t('يرجى كتابة البريد الإلكتروني وكلمة المرور', 'Please enter email and password'))
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      await login(email, password)
      if (setLoggedIn) setLoggedIn(true)
      nav('home')
    } catch (err: any) {
      setErrorMsg(err?.message || t('فشل تسجيل الدخول، تحقق من البيانات', 'Login failed, check your credentials'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg(t('يرجى ملء كافة الحقول المطلوبة', 'Please fill all required fields'))
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      await register(name, email, password, phone)
      if (setLoggedIn) setLoggedIn(true)
      nav('home')
    } catch (err: any) {
      setErrorMsg(err?.message || t('فشل إنشاء الحساب، قد يكون البريد مسجلاً مسبقاً', 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex flex-col justify-between">
      {/* Top Branding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6 text-center">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 shadow-xl border border-white/20">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          {t('واصل مصر', 'Wasel Egypt')}
        </h1>
        <p className="text-blue-200 text-xs font-medium max-w-xs">
          {t('منظومة النقل الذكي الشاملة لجميع خطوط ومحطات مصر', 'Unified Smart Transit System for Egypt')}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl max-w-lg mx-auto w-full">
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
            <TriangleAlert size={14} className="inline me-1" /> {errorMsg}
          </div>
        )}

        {mode === 'welcome' && (
          <div className="text-center py-2 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-1">{t('مرحباً بك!', 'Welcome!')}</h2>
              <p className="text-xs text-neutral-500">{t('سجّل دخولك لحفظ مساراتك واشتراكاتك', 'Sign in to access saved trips and passes')}</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => { setErrorMsg(''); setMode('login') }}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-blue-500/20 transition-all"
              >
                {t('تسجيل الدخول', 'Sign In')}
              </button>
              <button
                onClick={() => { setErrorMsg(''); setMode('register') }}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold py-3.5 rounded-2xl text-sm transition-all"
              >
                {t('إنشاء حساب جديد', 'Create Account')}
              </button>
              <button
                onClick={() => nav('home')}
                className="w-full text-neutral-400 hover:text-neutral-600 text-xs py-2 font-medium"
              >
                {t('المتابعة كزائر بدون تسجيل', 'Continue as Guest')}
              </button>
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('welcome')}
              className="flex items-center gap-1.5 text-blue-600 text-xs font-bold"
            >
              <span>←</span>
              <span>{t('رجوع', 'Back')}</span>
            </button>

            <h2 className="text-xl font-bold text-neutral-900">{t('تسجيل الدخول', 'Sign In')}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('البريد الإلكتروني', 'Email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('كلمة المرور', 'Password')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute end-3 top-3 text-neutral-400 text-xs"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@example.com')
                    setPassword('password')
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  {t('تجربة كـ Admin جاهز', 'Fill Demo Admin')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  {t('نسيت كلمة المرور؟', 'Forgot?')}
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-spin text-lg">⏳</span> : t('دخول', 'Sign In')}
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('welcome')}
              className="flex items-center gap-1.5 text-blue-600 text-xs font-bold"
            >
              <span>←</span>
              <span>{t('رجوع', 'Back')}</span>
            </button>

            <h2 className="text-xl font-bold text-neutral-900">{t('إنشاء حساب جديد', 'Create Account')}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('الاسم الكامل', 'Full Name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="محمود وجيه"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('البريد الإلكتروني', 'Email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('رقم الهاتف (اختياري)', 'Phone (Optional)')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+201012345678"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">{t('كلمة المرور', 'Password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span className="animate-spin text-lg">⏳</span> : t('تسجيل الحساب', 'Register')}
              </button>
            </div>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4 text-center py-2">
            <button
              onClick={() => setMode('login')}
              className="flex items-center gap-1.5 text-blue-600 text-xs font-bold text-start"
            >
              <span>←</span>
              <span>{t('رجوع لتسجيل الدخول', 'Back to Sign In')}</span>
            </button>
            <h2 className="text-lg font-bold text-neutral-900">{t('استعادة كلمة المرور', 'Reset Password')}</h2>
            <p className="text-xs text-neutral-500">{t('أدخل بريدك الإلكتروني لإرسال رابط الاستعادة', 'Enter your email to receive recovery instructions')}</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-medium outline-none"
            />
            <button
              onClick={() => {
                alert(t('تم إرسال التعليمات لبريدك الإلكتروني', 'Instructions sent to your email'))
                setMode('login')
              }}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl text-xs"
            >
              {t('إرسال الرابط', 'Send Link')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
