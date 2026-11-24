'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
})

// Light is the default. Only an explicit choice in Paramètres is stored, under a new key:
// the old 'sellio-theme' key was written automatically when dark was the default, so it
// does not say what the merchant wants.
const KEY = 'sellio-theme-choice'
const listeners = new Set<() => void>()
let memory: Theme = 'light' // when localStorage is unavailable (private mode)

function read(): Theme {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return memory }
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}
function write(t: Theme) {
  memory = t
  try { localStorage.setItem(KEY, t) } catch {}
  listeners.forEach((l) => l())
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as Theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  useEffect(() => { try { localStorage.removeItem('sellio-theme') } catch {} }, [])

  const toggle = () => write(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme: write, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
