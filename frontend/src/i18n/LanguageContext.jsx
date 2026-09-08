import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en, ar } from './dictionaries'

/**
 * Minimal i18n scaffold prepared for Arabic/English.
 * Switching language also switches the document direction (RTL for
 * Arabic) and persists the choice. Lookup falls back: language → en → key.
 */

const LanguageContext = createContext(null)

const LANGUAGE_STORAGE_KEY = 'wasel.lang'
const DICTIONARIES = { en, ar }

function readStoredLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readStoredLanguage)

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

  const value = useMemo(() => {
    const t = (key) => DICTIONARIES[language]?.[key] ?? DICTIONARIES.en[key] ?? key
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

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
