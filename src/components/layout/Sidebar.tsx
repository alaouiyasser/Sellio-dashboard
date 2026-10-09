'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/auth-client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from './LanguageProvider'
import { useTheme } from './ThemeProvider'
import {
  LayoutGrid, Package, Wallet, BarChart3, MessageSquare, Bot, Plug, Settings, LogOut, X,
} from 'lucide-react'

const OLIVE = 'var(--brand)'

const NAV_ITEMS = [
  { path: '/dashboard',  icon: LayoutGrid,    labelKey: 'nav.dashboard'  },
  { path: '/orders',     icon: Package,       labelKey: 'nav.orders'     },
  { path: '/credits',    icon: Wallet,        labelKey: 'nav.credits'    },
  { path: '/analytics',  icon: BarChart3,     labelKey: 'nav.analytics'  },
  { path: '/logs',       icon: MessageSquare, labelKey: 'nav.messages'   },
  { path: '/ai-coach',   icon: Bot,           labelKey: 'nav.aicoach'    },
  { path: '/integrations', icon: Plug, labelKey: 'nav.integrations' },
  { path: '/settings',   icon: Settings,      labelKey: 'nav.settings'   },
]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { t }     = useLang()
  const { theme } = useTheme()
  const [credits, setCredits]   = useState<number | null>(null)
  const [company, setCompany]   = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: cr }, { data: tn }] = await Promise.all([
        supabase.from('credits').select('balance').eq('tenant_id', user.id).single(),
        supabase.from('tenants').select('company_name').eq('id', user.id).single(),
      ])
      if (cr?.balance !== undefined) setCredits(cr.balance)
      if (tn?.company_name) setCompany(tn.company_name)
    }
    load()
  }, [])

  const creditColor = credits === null ? 'var(--text-muted)'
    : credits < 200 ? 'var(--destructive)'
    : credits < 500 ? 'var(--warning)'
    : OLIVE
  const creditPct = credits === null ? 0 : Math.min((credits / 2000) * 100, 100)

  if (isMobile && !mobileOpen) return null

  function navigate(path: string) {
    router.push(path)
    if (isMobile && onClose) onClose()
  }

  async function handleLogout() {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
    } catch { /* best-effort: kammel logout local hta ila l API tfchel */ }
    await supabase.auth.signOut()
    router.push('/login')
  }


  const isDark = theme === 'dark'

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: 240, zIndex: 100,
    background: 'var(--sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    transition: 'transform 0.3s ease',
    transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
  }

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }} />
      )}

      <aside style={sidebarStyle} className={mobileOpen ? "sidebar-open" : ""}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              position: 'relative',
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: isDark ? 'var(--brand)' : '#FFFFFF',
              border: isDark ? 'none' : '1.5px solid color-mix(in srgb, var(--brand) 30%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800,
              color: isDark ? '#FFFFFF' : 'var(--brand)',
            }}>
              S
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 9, height: 9, borderRadius: '50%',
                background: 'var(--brand-accent)',
                boxShadow: '0 0 0 2px var(--sidebar)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                Sellio
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                {company || 'Dashboard'}
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, display: 'grid', placeItems: 'center',
            }}><X size={18} strokeWidth={2.2} /></button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.path
            const Icon = item.icon
            return (
              <div key={item.path} onClick={() => navigate(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: active ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
                borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                transition: 'all 0.2s',
              }}>
                <Icon size={18} strokeWidth={2} color={active ? 'var(--brand)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  color: active ? OLIVE : 'var(--text)',
                  whiteSpace: 'nowrap',
                }}>{t(item.labelKey)}</span>
              </div>
            )
          })}
        </nav>

        {/* Credits */}
        <div style={{
          margin: '0 8px 8px', padding: '12px 14px', borderRadius: 12,
          background: 'color-mix(in srgb, var(--brand) 8%, transparent)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t('nav.credits')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: creditColor }}>
            {credits === null ? '...' : credits.toLocaleString()}
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'var(--border)' }}>
            <div style={{ width: `${creditPct}%`, height: '100%', borderRadius: 4, background: creditColor, transition: 'width 0.5s' }} />
          </div>
          {credits !== null && credits < 500 && (
            <div style={{ fontSize: 10, color: creditColor, marginTop: 4 }}>
              {credits < 200 ? t('credits.lowAlert') : t('credits.medAlert')}
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ padding: '0 8px 16px' }}>
          <div onClick={handleLogout}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--text-muted) 10%, transparent)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              transition: 'background 0.2s',
            }}>
            <LogOut size={17} strokeWidth={2} />
            <span>{t('nav.logout')}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
