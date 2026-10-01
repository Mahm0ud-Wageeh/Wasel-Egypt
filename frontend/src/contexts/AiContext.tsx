import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { apiRequest } from '../api/client'
import { endpoints } from '../api/endpoints'
import { useAuth } from './AuthContext'
import { buildAiChatPayload } from '../ai/aiPayload'
import { ensureJourneyAction, normalizeAiAction } from '../ai/aiActions'
import { isScreenKey } from '../lib/navigation'
export type Lang = 'ar' | 'en'
export type Screen = string

export interface AiAction {
  type?: string
  action?: string
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
  sendMessage: (text: string, lang: Lang, coords?: { lat: number; lng: number }) => Promise<AiAction[]>
  resendLastMessage: (lang: Lang, coords?: { lat: number; lng: number }) => Promise<void>
  clearCurrentChat: () => void
  executeAction: (action: AiAction, nav: (s: Screen) => void) => void
}

const AiContext = createContext<AiContextType | undefined>(undefined)

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

const DEFAULT_INITIAL_SESSION: ChatSession = {
  id: "session_init",
  title: "محادثة جديدة",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  messages: [],
};

export const AiProvider: React.FC<{
  children: React.ReactNode;
  onNavigate?: (s: Screen) => void;
  onPrefillPlanner?: (from: string, to: string) => void;
}> = ({ children, onNavigate, onPrefillPlanner }) => {
  const { user } = useAuth();
  const sessionKey = user ? `wasel.ai.sessions.user_${user.id}` : 'wasel.ai.sessions.guest';
  const [sessions, setSessions] = useState<ChatSession[]>([DEFAULT_INITIAL_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>("session_init");
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking");

  // Load sessions from user-scoped localStorage on client mount or user change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
      const initial = createEmptySession();
      setSessions([initial]);
      setActiveSessionId(initial.id);
    } catch {
      const initial = createEmptySession();
      setSessions([initial]);
      setActiveSessionId(initial.id);
    }
  }, [sessionKey]);

  // Save sessions to user-scoped localStorage
  useEffect(() => {
    try {
      if (sessions.length > 0 && sessions[0].id !== "session_init") {
        localStorage.setItem(sessionKey, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
      }
    } catch {
      /* ignore */
    }
  }, [sessions, sessionKey])

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
  const executeAction = useCallback((rawAction: AiAction, nav: (s: Screen, params?: Record<string, string>) => void) => {
    const action = normalizeAiAction(rawAction)
    if (!action) return

    if (action.screen && isScreenKey(action.screen)) {
      nav(action.screen)
    }

    switch (action.action) {
      case 'plan_journey': {
        const from = action.params?.origin || action.params?.from || ''
        const to = action.params?.destination || action.params?.to || ''
        if (onPrefillPlanner && (from || to)) {
          onPrefillPlanner(from, to)
        }
        nav('planner', {
          ...(from ? { from: String(from) } : {}),
          ...(to ? { to: String(to) } : {}),
        })
        break
      }
      case 'set_origin':
      case 'set_destination': {
        const name = action.params?.name || action.params?.stop_name || ''
        if (name && onPrefillPlanner) {
          if (action.action === 'set_origin') onPrefillPlanner(name, '')
          else onPrefillPlanner('', name)
        }
        nav('planner', action.action === 'set_origin' ? { from: String(name) } : { to: String(name) })
        break
      }
      case 'set_departure_time': {
        const iso = action.params?.iso
        nav('planner', iso ? { departure_time: String(iso) } : undefined)
        break
      }
      case 'search_routes':
        nav('planner', action.params?.query ? { query: String(action.params.query) } : undefined)
        break
      case 'open_route':
      case 'open_stop':
      case 'show_nearby_transit':
      case 'show_nearby_stops':
      case 'get_live_eta':
      case 'get_next_stop':
        nav('map')
        break
      case 'open_active_journey':
        nav('journey-active')
        break
      case 'show_saved_journeys':
        nav('history')
        break
      case 'open_notifications':
        nav('notifications')
        break
      case 'focus_map_location': {
        const { latitude, longitude, zoom } = action.params || {}
        if (latitude && longitude) {
          window.dispatchEvent(
            new CustomEvent('wasel:map-command', {
              detail: { type: 'flyTo', center: [longitude, latitude], zoom: zoom || 15 },
            })
          )
        }
        nav('map')
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
        nav('map')
        break
      }
      case 'show_nearby_stops': {
        window.dispatchEvent(new CustomEvent('wasel:map-command', { detail: { type: 'nearby_on' } }))
        nav('map')
        break
      }
      case 'locate_me': {
        window.dispatchEvent(new CustomEvent('wasel:map-command', { detail: { type: 'locate_me' } }))
        nav('map')
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
        nav('map')
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
        nav('map')
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
    if (!text.trim()) return []

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const conversationMessages = [...(activeSession?.messages || []), userMsg]
      .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .slice(-12)

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
      const res = await apiRequest<{
        reply?: string
        message?: string
        actions?: AiAction[]
        data?: any
      }>(endpoints.ai.chat, {
        method: 'POST',
        body: buildAiChatPayload(conversationMessages, lang, coords),
        auth: false,
      })

      const responseActions = ensureJourneyAction(res.actions || [], text)
      const replyContent = res.reply || res.message || ''
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: replyContent,
        actions: responseActions,
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
      return responseActions
    } catch {
      // Backend unreachable: be honest — never invent routes, fares, or
      // network facts. The user can retry when connectivity returns.
      setStatus('offline')
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content:
          lang === 'ar'
            ? 'خدمة المساعد الذكي غير متاحة حالياً — تعذر الاتصال بالخادم.\nتحقق من اتصال الإنترنت أو من تشغيل الخادم ثم حاول مجدداً. لن أعرض أي معلومات غير موثقة.'
            : 'The AI assistant is currently unavailable — the server could not be reached.\nCheck your connection or the server status and try again. I will not show unverified information.',
        actions: [],
        structuredData: null,
        timestamp: Date.now(),
      }

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSessionId
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMsg] }
            : s
        )
      )
      return []
    } finally {
      setIsTyping(false)
    }
  }

  const resendLastMessage = async (lang: Lang, coords?: { lat: number; lng: number }) => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content, lang, coords)
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
        resendLastMessage,
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
