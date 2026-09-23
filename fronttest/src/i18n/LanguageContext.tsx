import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import en from './en.json'
import ar from './ar.json'

export type SupportedLanguage = 'ar' | 'en'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  dir: 'rtl' | 'ltr'
  isRtl: boolean
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

const LANGUAGE_STORAGE_KEY = 'wasel.lang'
const DICTIONARIES: Record<SupportedLanguage, Record<string, string>> = {
  en: en as Record<string, string>,
  ar: ar as Record<string, string>,
}

function readStoredLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
    return 'ar' // Default to Arabic for Wasel Egypt
  } catch {
    return 'ar'
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(readStoredLanguage)

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
    document.documentElement.dir = dir
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      /* ignore */
    }
  }, [language])

  const value = useMemo<LanguageContextType>(() => {
    const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) => {
      let text = DICTIONARIES[language]?.[key] ?? DICTIONARIES.en?.[key]
      if (!text) {
        if (typeof fallbackOrParams === 'string') return fallbackOrParams
        return key
      }
      if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
        for (const [k, v] of Object.entries(fallbackOrParams)) {
          text = text.replace(new RegExp(`{${k}}`, 'g'), String(v))
        }
      }
      return text
    }

    return {
      language,
      setLanguage,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      isRtl: language === 'ar',
      t,
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
