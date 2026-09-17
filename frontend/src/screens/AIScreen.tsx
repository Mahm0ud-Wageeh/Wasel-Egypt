import { useState, useRef, useEffect } from 'react'
import type { Screen, Lang } from '../App'
import { useAi } from '../contexts/AiContext'
import { ModeIcon } from '../components/icons'
import {
  Sparkles, MessageSquare, X, Trash2, Plus, Send, Clock3, CircleDollarSign, Navigation, Map as MapIcon,
} from 'lucide-react'

interface Props {
  lang: Lang
  t: (ar: string, en: string) => string
  nav: (s: Screen) => void
}

const quickPrompts = [
  { ar: 'أسرع طريقة من رمسيس للعاصمة الإدارية؟', en: 'Fastest way from Ramses to New Capital?' },
  { ar: 'أسعار تذاكر المترو الرسمية كام؟', en: 'How much are metro tickets?' },
  { ar: 'إيه المحطات التبادلية بين الخط الثاني والثالث؟', en: 'Transfer stations between Line 2 and Line 3?' },
  { ar: 'مواعيد وخط قطار العاصمة LRT', en: 'Capital LRT route and timetable' },
  { ar: 'وريني المحطات القريبة مني على الخريطة', en: 'Show nearby stops on the map' },
  { ar: 'فعّل العرض المجسم 3D للخريطة', en: 'Enable 3D map view' },
]

export default function AIScreen({ lang, t, nav }: Props) {
  const {
    sessions,
    activeSessionId,
    messages,
    isTyping,
    status,
    sendMessage,
    createNewSession,
    switchSession,
    deleteSession,
    clearCurrentChat,
    executeAction,
  } = useAi()
  const [inputText, setInputText] = useState('')
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (text?: string) => {
    const q = text || inputText
    if (!q.trim() || isTyping) return
    setInputText('')
    await sendMessage(q, lang)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-neutral-50 relative">
      {/* AI Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSessionsDrawer(d => !d)}
            className="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 rounded-xl flex items-center justify-center text-neutral-600 transition-colors"
            title={t('سجل المحادثات', 'Chat History')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-neutral-900">{t('مساعد واصل AI الذكي', 'Wasel AI Assistant')}</p>
              <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <p className="text-[11px] text-neutral-400">
              {status === 'online' ? t('متصل بالذكاء الاصطناعي لحظياً', 'Connected to transit engine') : t('يعمل بمحرك النقل الذكي المحلي', 'Running on local transit engine')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => createNewSession(t('محادثة جديدة', 'New Chat'))}
            className="flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Plus size={14} />
            <span>{t('محادثة جديدة', 'New')}</span>
          </button>
        </div>
      </div>

      {/* Sessions Slide-over Drawer */}
      {showSessionsDrawer && (
        <div className="absolute inset-0 bg-neutral-900/40 z-30 flex">
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-start">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-800">{t('المحادثات السابقة', 'Past Conversations')}</h3>
              <button
                onClick={() => setShowSessionsDrawer(false)}
                className="w-7 h-7 text-neutral-400 hover:text-neutral-700 rounded-lg flex items-center justify-center"
                aria-label={t('إغلاق', 'Close')}
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    s.id === activeSessionId
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                  onClick={() => {
                    switchSession(s.id)
                    setShowSessionsDrawer(false)
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare size={14} className="text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{s.title || t('محادثة بدون عنوان', 'Untitled Chat')}</span>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteSession(s.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 p-1"
                      title={t('حذف', 'Delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowSessionsDrawer(false)} />
        </div>
      )}


      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4">
              <Sparkles size={30} className="text-white" />
            </div>
            <h2 className="text-lg font-black text-neutral-900 mb-1">
              {t('أهلاً بك! إزاي أقدر أساعدك في مشوارك؟', 'How can I assist your trip today?')}
            </h2>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              {t('اسألني عن أي وسيلة مواصلات، أسعار التذاكر، أو أفضل مسار للوصول في مصر.', 'Ask about routes, stations, ticket fares, or transit schedules across Egypt.')}
            </p>

            <div className="w-full space-y-2">
              <p className="text-[11px] font-bold text-neutral-400 text-start uppercase tracking-wider px-1">
                {t('أسئلة مقترحة', 'Suggested Questions')}
              </p>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(lang === 'ar' ? qp.ar : qp.en)}
                  className="w-full text-start p-3 bg-white hover:bg-blue-50/50 rounded-2xl border border-neutral-200/80 hover:border-blue-300 text-xs font-semibold text-neutral-700 transition-all shadow-xs flex items-center gap-2"
                >
                  <MessageSquare size={14} className="text-blue-500 flex-shrink-0" />
                  <span>{lang === 'ar' ? qp.ar : qp.en}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>

                {/* Structured Route Card if returned */}
                {msg.structuredData && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 bg-neutral-50 -mx-2 px-3 py-2 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-neutral-800">
                      <span className="flex items-center gap-1"><Clock3 size={13} className="text-blue-600" /> {msg.structuredData.duration} {t('دقيقة', 'min')}</span>
                      <span className="flex items-center gap-1"><CircleDollarSign size={13} className="text-green-600" /> {msg.structuredData.fare} {t('جنيه', 'EGP')}</span>
                    </div>
                  </div>
                )}

                {/* Interactive Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-neutral-100 flex flex-col gap-1.5">
                    {msg.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => executeAction(act, nav)}
                        className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          {act.icon
                            ? <span className="text-sm">{act.icon}</span>
                            : <Navigation size={14} />}
                          <span>{lang === 'ar' ? act.label_ar : act.label_en}</span>
                        </span>
                        <span>→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex items-center gap-2 text-neutral-400 bg-white border border-neutral-200 px-4 py-3 rounded-2xl rounded-bl-none w-fit shadow-xs">
            <span className="text-xs font-bold text-neutral-500">{t('واصل AI يكتب الآن...', 'Wasel AI is thinking...')}</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-neutral-200 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 bg-neutral-100 rounded-2xl flex items-center px-4 py-2 border border-neutral-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('اكتب سؤالك أو وجهتك هنا...', 'Ask a question or enter destination...')}
              className="w-full text-sm outline-none bg-transparent placeholder:text-neutral-400"
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-neutral-300 text-white rounded-2xl flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
            aria-label={t('إرسال', 'Send')}
          >
            <Send size={19} className="rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
