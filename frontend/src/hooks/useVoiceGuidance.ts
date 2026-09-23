import { useState, useEffect, useRef, useCallback } from 'react'
export type Lang = 'ar' | 'en'

const STORAGE_KEY = 'wasel.voice_guidance.muted'

export interface VoiceManeuver {
  type?: string
  distanceMeters?: number
  instruction?: string
  instruction_ar?: string
  instruction_en?: string
  station?: string
}

interface UseVoiceGuidanceOptions {
  enabled?: boolean
  language?: Lang
  maneuver?: VoiceManeuver | null
  isOffRoute?: boolean
}

/**
 * useVoiceGuidance — Production Web Speech API voice guidance hook for Wasel navigation.
 * Supports English and Arabic voice announcements for turn maneuvers, stop arrivals, and deviations.
 */
export function useVoiceGuidance({
  enabled = true,
  language = 'ar',
  maneuver = null,
  isOffRoute = false,
}: UseVoiceGuidanceOptions = {}) {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [supported, setSupported] = useState(false)
  const lastSpokenRef = useRef<{ text: string | null; timestamp: number; distanceBucket: string | null }>({
    text: null,
    timestamp: 0,
    distanceBucket: null,
  })
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // Check speech synthesis support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true)

      const updateVoices = () => {
        try {
          voicesRef.current = window.speechSynthesis.getVoices() || []
        } catch {
          voicesRef.current = []
        }
      }

      updateVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices
      }
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* storage full/private */
      }
      if (next && typeof window !== 'undefined' && window.speechSynthesis?.cancel) {
        window.speechSynthesis.cancel()
      }
      return next
    })
  }, [])

  const speak = useCallback(
    (text: string, force: boolean = false) => {
      if (!enabled || muted || !text) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return

      const now = Date.now()
      const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(text)

      // Throttle: avoid repeating same text within 12 seconds unless forced
      if (!force && lastSpokenRef.current.text === text && now - lastSpokenRef.current.timestamp < 12000) {
        return
      }

      try {
        window.speechSynthesis.cancel() // cancel previous utterance

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = isArabic ? 'ar-SA' : 'en-US'
        utterance.rate = isArabic ? 0.95 : 1.0
        utterance.pitch = 1.0

        // Best voice matching
        const matchingVoice = voicesRef.current.find(v =>
          isArabic ? v.lang?.startsWith('ar') : v.lang?.startsWith('en')
        )
        if (matchingVoice) {
          utterance.voice = matchingVoice
        }

        lastSpokenRef.current = {
          text,
          timestamp: now,
          distanceBucket: null,
        }

        window.speechSynthesis.speak(utterance)
      } catch {
        // Non-fatal voice playback failure
      }
    },
    [enabled, muted, language]
  )

  // Cancel stale speech immediately upon language change or reroute
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis?.cancel) {
      window.speechSynthesis.cancel()
    }
    lastSpokenRef.current = { text: null, timestamp: 0, distanceBucket: null }
  }, [language, isOffRoute])

  // Cancel any active speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis?.cancel) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Off-route warning announcement
  useEffect(() => {
    if (!isOffRoute || !enabled || muted) return
    const text =
      language === 'ar'
        ? 'أنت خارج المسار المحدد، جارٍ إعادة توجيهك'
        : 'You are off route. Rerouting now.'
    speak(text, false)
  }, [isOffRoute, enabled, muted, language, speak])

  // Maneuver countdown announcements
  useEffect(() => {
    if (!maneuver || !enabled || muted) return
    const dist = maneuver.distanceMeters ?? 0
    const isAr = language === 'ar'

    const text = isAr
      ? maneuver.instruction_ar || maneuver.instruction
      : maneuver.instruction_en || maneuver.instruction

    if (!text) return

    let bucket: string | null = null
    if (dist <= 25) {
      bucket = 'now'
    } else if (dist <= 150 && dist > 50) {
      bucket = 'approaching'
    }

    if (bucket && lastSpokenRef.current.distanceBucket !== bucket) {
      lastSpokenRef.current.distanceBucket = bucket
      speak(text, bucket === 'now')
    }
  }, [maneuver, enabled, muted, language, speak])

  return {
    muted,
    supported,
    toggleMute,
    speak,
  }
}
