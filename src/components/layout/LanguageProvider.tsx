'use client'

import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import { setTxLocale } from '@/lib/i18n'
import fr from '../../../messages/fr.json'
import en from '../../../messages/en.json'
import ar from '../../../messages/ar.json'
import es from '../../../messages/es.json'

type Locale = 'fr' | 'en' | 'ar' | 'es'

const MESSAGES = { fr, en, ar, es }

interface LangContext {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const LangContext = createContext<LangContext>({
  locale: 'fr',
  setLocale: () => {},
  t: (k) => k,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('sellio-lang') as Locale
    if (saved && MESSAGES[saved]) setLocaleState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    localStorage.setItem('sellio-lang', locale)
  }, [locale])

  setTxLocale(locale)   // before children render, so tx() follows the switch

  function t(key: string): string {
    const keys = key.split('.')
    let val: any = MESSAGES[locale]
    for (const k of keys) val = val?.[k]
    return typeof val === 'string' ? val : key
  }

  function setLocale(l: Locale) { setLocaleState(l) }

  return (
    <LangContext.Provider value={{ locale, setLocale, t }}>
      {/* Re-mount on change: every tx() string (even outside React state) follows the language. */}
      <Fragment key={locale}>{children}</Fragment>
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
