import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
export type Lang = 'ar' | 'en'
export type Screen = string

export interface AiAction {
  action: string
  params?: Record<string, any>
  label_ar?: string
  label_en?: string
  screen?: Screen
  icon?: string
}

export interface ChatMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: AiAction[]
  structuredData?: any
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

interface AiContextType {
  sessions: ChatSession[]
  activeSessionId: string
  messages: ChatMessage[]
  isTyping: boolean
  status: 'online' | 'offline' | 'checking'
  createNewSession: (initialTitle?: string) => string
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  sendMessage: (text: string, lang: Lang, coords?: { lat: number; lng: number }) => Promise<void>
  clearCurrentChat: () => void
  executeAction: (action: AiAction, nav: (s: Screen) => void) => void
}

const AiContext = createContext<AiContextType | undefined>(undefined)

const SESSIONS_STORAGE_KEY = 'wasel.ai.sessions.v2'
const MAX_SESSIONS = 25
const MAX_MESSAGES_PER_SESSION = 50

function createEmptySession(title: string = ''): ChatSession {
  const now = Date.now()
  return {
    id: `chat_${now}_${Math.random().toString(36).substring(2, 7)}`,
    title: title || 'محادثة جديدة',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

function loadInitialSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    /* ignore */
  }
  return [createEmptySession('محادثة جديدة')]
}

export const AiProvider: React.FC<{
  children: React.ReactNode
  onNavigate?: (s: Screen) => void
  onPrefillPlanner?: (from: string, to: string) => void
}> = ({ children, onNavigate, onPrefillPlanner }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(loadInitialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || '')
  const [isTyping, setIsTyping] = useState(false)
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking')

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
    } catch {
      /* ignore */
    }
  }, [sessions])

  // Active session helper
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0]
  }, [sessions, activeSessionId])

  const messages = activeSession ? activeSession.messages : []

  // Check AI health on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        await apiRequest(endpoints.ai.status, { method: 'GET', auth: false })
        setStatus('online')
      } catch {
        setStatus('offline')
      }
    }
    checkStatus()
  }, [])

  const createNewSession = useCallback((initialTitle: string = ''): string => {
    const newSession = createEmptySession(initialTitle)
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    return newSession.id
  }, [])

  const switchSession = useCallback((sessionId: string) => {
    const exists = sessions.some(s => s.id === sessionId)
    if (exists) {
      setActiveSessionId(sessionId)
    }
  }, [sessions])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId)
      if (filtered.length === 0) {
        const fresh = createEmptySession()
        setActiveSessionId(fresh.id)
        return [fresh]
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id)
      }
      return filtered
    })
  }, [activeSessionId])

  const clearCurrentChat = useCallback(() => {
    setSessions(prev =>
      prev.map(s => (s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s))
    )
  }, [activeSessionId])

  // Server-validated client action executor
  const executeAction = useCallback((action: AiAction, nav: (s: Screen) => void) => {
    if (action.screen) {
      nav(action.screen)
    }

    switch (action.action) {
      case 'plan_journey': {
        const from = action.params?.origin || action.params?.from || ''
        const to = action.params?.destination || action.params?.to || ''
        if (onPrefillPlanner && (from || to)) {
          onPrefillPlanner(from, to)
        }
        nav('planner')
        break
      }
      case 'set_origin':
      case 'set_destination': {
        const name = action.params?.name || action.params?.stop_name || ''
        if (name && onPrefillPlanner) {
          if (action.action === 'set_origin') onPrefillPlanner(name, '')
          else onPrefillPlanner('', name)
        }
        nav('planner')
        break
      }
      case 'focus_map_location': {
        const { latitude, longitude, zoom } = action.params || {}
        if (latitude && longitude) {
          window.dispatchEvent(
            new CustomEvent('wasel:map-command', {
              detail: { type: 'flyTo', center: [longitude, latitude], zoom: zoom || 15 },
            })
          )
        }
        nav('network')
        break
      }
      case 'switch_map_layer': {
        const layer = action.params?.layer
        if (layer) {
          window.dispatchEvent(
            new CustomEvent('wasel:map-command', {
              detail: { type: 'setLayer', layer },
            })
          )
        }
        break
      }
      case 'toggle_3d': {
        window.dispatchEvent(new CustomEvent('wasel:map-command', { detail: { type: 'toggle_3d' } }))
        nav('network')
        break
      }
      case 'show_nearby_stops': {
        window.dispatchEvent(new CustomEvent('wasel:map-command', { detail: { type: 'nearby_on' } }))
        nav('network')
        break
      }
      case 'locate_me': {
        window.dispatchEvent(new CustomEvent('wasel:map-command', { detail: { type: 'locate_me' } }))
        nav('network')
        break
      }
      case 'show_route_on_map': {
        const lat = Number(action.params?.lat ?? action.params?.latitude)
        const lng = Number(action.params?.lng ?? action.params?.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          window.dispatchEvent(
            new CustomEvent('wasel:map-command', {
              detail: { type: 'focus_map_location', lat, lng, zoom: action.params?.zoom ?? 15 },
            })
          )
        }
        nav('network')
        break
      }
      case 'open_metro':
        nav('metro')
        break
      case 'open_fares':
      case 'open_fare':
        nav('fares')
        break
      case 'open_network':
        nav('network')
        break
      case 'show_alerts':
        nav('notifications')
        break
      case 'navigate_home':
        nav('home')
        break
      case 'open_profile':
        nav('profile')
        break
      default:
        break
    }
  }, [onPrefillPlanner])

  const sendMessage = async (
    text: string,
    lang: Lang,
    coords?: { lat: number; lng: number }
  ) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    // Append user message & update title if first message
    setSessions(prev =>
      prev.map(s => {
        if (s.id === activeSessionId) {
          const isFirst = s.messages.length === 0
          return {
            ...s,
            title: isFirst ? text.slice(0, 32) : s.title,
            updatedAt: Date.now(),
            messages: [...s.messages, userMsg].slice(-MAX_MESSAGES_PER_SESSION),
          }
        }
        return s
      })
    )

    setIsTyping(true)

    try {
      // 1. Send to Laravel AI Backend with Geolocation Context
      const payload: Record<string, any> = {
        message: text,
        lang,
      }
      if (coords?.lat && coords?.lng) {
        payload.latitude = coords.lat
        payload.longitude = coords.lng
      }

      const res = await apiRequest<{
        reply?: string
        message?: string
        actions?: AiAction[]
        data?: any
      }>(endpoints.ai.chat, {
        method: 'POST',
        body: payload,
        auth: false,
      })

      const replyContent = res.reply || res.message || ''
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: replyContent,
        actions: res.actions || [],
        structuredData: res.data,
        timestamp: Date.now(),
      }

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] }
            : s
        )
      )
      setStatus('online')
    } catch {
      // 2. Intelligent Offline Egyptian Transit AI Engine
      await new Promise(r => setTimeout(r, 600))

      const lower = text.toLowerCase()
      let reply = ''
      let actions: AiAction[] = []
      let structuredData: any = null

      if (
        lower.includes('رمسيس') ||
        lower.includes('ramses') ||
        lower.includes('عاصمة') ||
        lower.includes('capital') ||
        lower.includes('عايز اروح') ||
        lower.includes('ازاي اروح')
      ) {
        reply =
          lang === 'ar'
            ? 'تمام! أسرع طريق من رمسيس إلى العاصمة الإدارية هو:\n١. استقلال مترو الخط الثالث من العتبة/رمسيس حتى محطة عدلي منصور المركزية.\n٢. التبديل إلى قطار العاصمة الخفيف LRT مباشرة حتى محطة مدينة الفنون والثقافة بالعاصمة.'
            : 'Great! The fastest route from Ramses to the New Capital is:\n1. Take Metro Line 3 to Adly Mansour Central Station.\n2. Transfer to the Capital LRT directly to Arts & Culture City in the New Capital.'

        actions = [
          {
            action: 'plan_journey',
            params: { origin: 'الشهداء (رمسيس)', destination: 'مدينة الفنون والثقافة (العاصمة)' },
            label_ar: 'عرض وتخطيط الرحلة في المخطط',
            label_en: 'View in Route Planner',
            screen: 'planner',
          },
        ]
      } else if (
        lower.includes('تذكرة') ||
        lower.includes('سعر') ||
        lower.includes('أسعار') ||
        lower.includes('fare') ||
        lower.includes('ticket')
      ) {
        reply =
          lang === 'ar'
            ? 'أسعار التذاكر الرسمية (سارية ٢٠٢٦):\n• المترو: ١٠ / ١٢ / ١٥ / ٢٠ جنيهاً حسب المحطات (من ٢٧ مارس ٢٠٢٦)\n• قطار العاصمة LRT: ١٠ / ١٥ / ٢٠ جنيهاً\n• المونوريل: ٢٠ / ٤٠ / ٥٥ / ٨٠ جنيهاً (من ٩ مايو ٢٠٢٦)\n• حافلات BRT: ٥ / ١٠ / ١٥ جنيهاً'
            : 'Official 2026 fares:\n• Metro: 10 / 12 / 15 / 20 EGP by stations (since 27 Mar 2026)\n• Capital LRT: 10 / 15 / 20 EGP\n• Monorail: 20 / 40 / 55 / 80 EGP (since 9 May 2026)\n• BRT buses: 5 / 10 / 15 EGP'

        actions = [
          {
            action: 'open_fares',
            label_ar: 'فتح حاسبة التذاكر الرسمية',
            label_en: 'Open Fare Calculator',
            screen: 'fares',
          },
        ]
      } else if (
        lower.includes('قمر صناعي') ||
        lower.includes('satellite') ||
        lower.includes('خريطة') ||
        lower.includes('map')
      ) {
        reply =
          lang === 'ar'
            ? 'تم تفعيل طبقة الأقمار الصناعية عالية الدقة ArcGIS World Imagery على الخريطة.'
            : 'High-resolution ArcGIS satellite imagery layer activated on the map.'

        actions = [
          {
            action: 'switch_map_layer',
            params: { layer: 'satellite' },
            label_ar: 'عرض خريطة الأقمار الصناعية',
            label_en: 'Show Satellite Map',
            screen: 'network',
          },
        ]
      } else if (
        lower.includes('ثلاثي الأبعاد') ||
        lower.includes('3d') ||
        lower.includes('مجسم')
      ) {
        reply =
          lang === 'ar'
            ? 'تم تفعيل المنظور المجسم 3D على الخريطة — اسحب بإصبعين للتدوير.'
            : '3D perspective enabled on the map — drag with two fingers to rotate.'

        actions = [
          {
            action: 'toggle_3d',
            label_ar: 'عرض مجسم 3D',
            label_en: 'Show 3D view',
            screen: 'network',
          },
        ]
      } else if (
        lower.includes('محطات قريبة') ||
        lower.includes('nearby') ||
        lower.includes('حولي')
      ) {
        reply =
          lang === 'ar'
            ? 'فعّلت طبقة المحطات القريبة الحية على الخريطة — قرّب (زووم ١٢+) لعرض محطات الشبكة الحقيقية حولك.'
            : 'Live nearby-stops layer enabled — zoom to 12+ to see real network stops around you.'

        actions = [
          {
            action: 'show_nearby_stops',
            label_ar: 'عرض المحطات القريبة',
            label_en: 'Show nearby stops',
            screen: 'network',
          },
        ]
      } else if (
        lower.includes('موقعي') ||
        lower.includes('أنا فين') ||
        lower.includes('where am i') ||
        lower.includes('my location')
      ) {
        reply =
          lang === 'ar'
            ? 'سأركّز الخريطة على موقعك الحالي — تأكد من تفعيل GPS في المتصفح.'
            : 'Centering the map on your current location — make sure GPS is enabled.'

        actions = [
          {
            action: 'locate_me',
            label_ar: 'الانتقال لموقعي',
            label_en: 'Go to my location',
            screen: 'network',
          },
        ]
      } else if (
        lower.includes('محطة') ||
        lower.includes('station') ||
        lower.includes('مترو') ||
        lower.includes('metro')
      ) {
        reply =
          lang === 'ar'
            ? 'شبكة مترو القاهرة تضم ٣ خطوط رئيسية تتقاطع في محطات السادات، الشهداء، العتبة، وجمال عبد الناصر. يمكنك تصفح الخريطة والمحطات الآن.'
            : 'Cairo Metro network consists of 3 lines intersecting at Sadat, Shohadaa, Attaba, and Nasser stations. You can explore the network map now.'

        actions = [
          {
            action: 'open_metro',
            label_ar: 'استعراض خطوط ومحطات المترو',
            label_en: 'Explore Metro Lines',
            screen: 'metro',
          },
        ]
      } else {
        reply =
          lang === 'ar'
            ? 'أهلاً بك! أنا واصل AI، مساعدك الذكي لوسائل النقل في مصر.\nيمكنني مساعدتك في:\n• حساب أسرع مسار بين أي مكانين\n• معرفة محطات المترو والـ LRT والمونوريل\n• حساب أسعار التذاكر والاشتراكات\n• متابعة تنبيهات التأخيرات والصيانة\n\nكيف أساعدك اليوم؟'
            : "Hello! I'm Wasel AI, your Egypt transit companion.\nI can assist you with:\n• Fast route planning across Egypt\n• Metro, LRT, and Monorail stations\n• Official fare and subscription calculation\n• Live service alerts and maintenance updates\n\nHow can I help you today?"
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: reply,
        actions,
        structuredData,
        timestamp: Date.now(),
      }

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] }
            : s
        )
      )
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <AiContext.Provider
      value={{
        sessions,
        activeSessionId,
        messages,
        isTyping,
        status,
        createNewSession,
        switchSession,
        deleteSession,
        sendMessage,
        clearCurrentChat,
        executeAction,
      }}
    >
      {children}
    </AiContext.Provider>
  )
}

export function useAi() {
  const context = useContext(AiContext)
  if (!context) {
    throw new Error('useAi must be used within an AiProvider')
  }
  return context
}
