'use client'

import { useTheme } from './ThemeProvider'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import LangSwitcher from './LangSwitcher'
import NotificationBell from './NotificationBell'
import { Sun, Moon } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { theme, toggle } = useTheme()
  const [initials, setInitials] = useState('??')
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const parts = user.email.split('@')[0].split(/[._-]/)
        setInitials(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase())
      }
    }
    fetchUser()
  }, [])

  const isDark = theme === 'dark'

  return (
    <header className="topbar-header" style={{ maxWidth: '100vw', overflow: 'visible',
      height: 60, background: 'var(--sidebar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</span>
        {subtitle && <span className="topbar-subtitle" style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>{subtitle}</span>}
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="topbar-lang"><LangSwitcher /></span>

        <NotificationBell />

        <div onClick={toggle} style={{
          width: 44, height: 24, borderRadius: 12,
          background: isDark ? 'var(--brand)' : 'var(--border)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: isDark ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left 0.3s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            display: 'grid', placeItems: 'center',
            color: isDark ? 'var(--brand)' : 'var(--warning)',
          }}>
            {isDark ? <Moon size={11} strokeWidth={2.6} /> : <Sun size={11} strokeWidth={2.6} />}
          </div>
        </div>

        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand), #3A1FD0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
        }}>{initials}</div>
      </div>
    </header>
  )
}
