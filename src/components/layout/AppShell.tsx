'use client'

// Dashboard shell (docs/REDESIGN.md §2): a 56px top bar (wordmark, global search ⌘K, credits
// pill, bell, avatar) and a 232px left menu with a "Réglages" group. On a phone the menu is a drawer.

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid, Package, Boxes, Undo2, MessageSquare, BarChart3, Coins, Tag, Store, Bot,
  Truck, ShoppingBag, Wallet, Settings, Search, Menu, X, LogOut, ShieldCheck, ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { API_BASE } from '@/lib/auth-client'
import { adminApi } from '@/lib/admin-api'
import { createClient } from '@/lib/supabase'
import { tx, intlLocale } from '@/lib/i18n'
import { useLang } from './LanguageProvider'
import Wordmark from './Wordmark'
import NotificationBell from './NotificationBell'
import LangSwitcher from './LangSwitcher'
import InstallAppButton from '@/components/pwa/InstallAppButton'

type NavItem = { href: string; icon: LucideIcon; label: string; soon?: boolean; badge?: 'orders' }

const ICON = { size: 17, strokeWidth: 1.8 } as const

const noSubscribe = () => () => {}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [, rerender] = useState(0)
  // Close the drawer when the page changes.
  const [shownPath, setShownPath] = useState(pathname)
  if (shownPath !== pathname) { setShownPath(pathname); setOpen(false) }
  const [toConfirm, setToConfirm] = useState<number | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [days, setDays] = useState<number | null>(null)
  const [company, setCompany] = useState('')
  const [initials, setInitials] = useState('')
  const [founder, setFounder] = useState(false)

  const main: NavItem[] = [
    { href: '/dashboard', icon: LayoutGrid, label: t('nav.dashboard') },
    { href: '/orders', icon: Package, label: t('nav.orders'), badge: 'orders' },
    { href: '/stock', icon: Boxes, label: tx('Stock'), soon: true },
    { href: '/returns', icon: Undo2, label: tx('Retours'), soon: true },
    { href: '/logs', icon: MessageSquare, label: t('nav.messages') },
    { href: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { href: '/profit', icon: Coins, label: t('nav.profit') },
    { href: '/offers', icon: Tag, label: t('nav.offers') },
    { href: '/store', icon: Store, label: t('nav.store') },
    { href: '/ai-coach', icon: Bot, label: t('nav.aicoach') },
  ]
  const settings: NavItem[] = [
    { href: '/integrations', icon: ShoppingBag, label: tx('Intégrations') },
    { href: '/livraison', icon: Truck, label: tx('Livraison') },
    { href: '/credits', icon: Wallet, label: t('nav.credits') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ]

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])

  // Founder console entry: shown only when the API says so (403 for merchants). The shell stays
  // mounted across pages, so this runs once per visit; a clear "no" is remembered for the tab.
  useEffect(() => {
    let cached: string | null = null
    try { cached = sessionStorage.getItem('sellio_founder') } catch {}
    if (cached === '0') return
    adminApi.me()
      .then(() => { setFounder(true); try { sessionStorage.setItem('sellio_founder', '1') } catch {} })
      .catch((e) => {
        // Only a clear "no" (401/403) is remembered; a network blip retries on the next page.
        if (e?.status === 401 || e?.status === 403) try { sessionStorage.setItem('sellio_founder', '0') } catch {}
      })
  }, [])

  // Account, credits (balance and ≈ days left) and the "à confirmer" count, refreshed on each page.
  useEffect(() => {
    const supabase = createClient()
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !alive) return
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString()
      const [{ data: cr }, { data: tn }, { data: spent }, { count }] = await Promise.all([
        supabase.from('credits').select('balance').eq('tenant_id', user.id).maybeSingle(),
        supabase.from('tenants').select('company_name, name').eq('id', user.id).maybeSingle(),
        supabase.from('credit_transactions').select('amount, type').eq('tenant_id', user.id).gte('created_at', since).limit(5000),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', user.id).eq('status', 'needs_merchant_confirm'),
      ])
      if (!alive) return
      const bal = typeof cr?.balance === 'number' ? cr.balance : null
      setBalance(bal)
      // days = balance / average daily spend over the last 14 days; hidden when not computable.
      const rows = (spent ?? []) as { amount: number | string | null; type: string | null }[]
      const total = rows.filter((r) => r.type !== 'recharge').reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0)
      const perDay = total / 14
      setDays(bal !== null && bal > 0 && perDay > 0 ? Math.floor(bal / perDay) : null)
      setToConfirm(typeof count === 'number' ? count : null)
      const name = String(tn?.company_name || tn?.name || '').trim()
      setCompany(name)
      // Phone sign-ups have an internal login address (…@phone.sellioagency.com): use the store name.
      const source = name || (user.email && !user.email.endsWith('@phone.sellioagency.com') ? user.email.split('@')[0] : '')
      const parts = source.split(/[\s._-]+/).filter(Boolean)
      setInitials(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase())
    })().catch(() => {})
    return () => { alive = false }
  }, [pathname])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function logout() {
    const supabase = createClient()
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
    } catch { /* best-effort: the local logout still happens if the API fails */ }
    try { sessionStorage.removeItem('sellio_founder') } catch {}
    await supabase.auth.signOut()
    router.push('/login')
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon
    const active = !item.soon && isActive(item.href)
    const base: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px',
      borderRadius: 'var(--radius-control)', fontSize: 13, textDecoration: 'none',
      fontWeight: active ? 600 : 500, color: active ? 'var(--brand)' : 'var(--text)',
    }
    const badge = item.badge === 'orders' && toConfirm ? toConfirm : null
    if (item.soon) return (
      <div key={item.href} aria-disabled style={{ ...base, color: 'var(--text-tertiary)', cursor: 'default' }}>
        <Icon {...ICON} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--separator)', color: 'var(--text-muted)' }}>{tx('Bientôt')}</span>
      </div>
    )
    return (
      <Link key={item.href} href={item.href} className="shell-nav-item" aria-current={active ? 'page' : undefined}
        onClick={() => { setOpen(false); setTimeout(() => rerender((n) => n + 1), 0) }} style={base}>
        <Icon {...ICON} color={active ? 'var(--brand)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
        {badge !== null && (
          <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center',
            background: active ? 'var(--brand)' : 'var(--status-pending-bg)', color: active ? '#fff' : 'var(--status-pending-fg)' }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar
        onMenu={() => setOpen(true)} balance={balance} days={days} company={company}
        initials={initials} founder={founder} onLogout={logout}
      />
      <div className="shell-body">
        <div className="shell-overlay" data-open={open} onClick={() => setOpen(false)} />
        <aside className="shell-nav" data-open={open} aria-label={tx('Menu')} style={{
          background: 'var(--sidebar)', borderInlineEnd: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div className="shell-burger" style={{ height: 'var(--topbar-h)', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 0 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
            <Wordmark size={17} />
            <button onClick={() => setOpen(false)} aria-label={tx('Fermer le menu')} className="shell-icon-btn" style={iconBtn}><X {...ICON} /></button>
          </div>
          <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {main.map(renderItem)}
            <div style={{ margin: '18px 10px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary)' }}>
              {tx('Réglages')}
            </div>
            {settings.map(renderItem)}
            {founder && (
              <Link href="/admin" className="shell-nav-item" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px', marginTop: 14, borderRadius: 'var(--radius-control)', fontSize: 13, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', border: '1px dashed var(--border)' }}>
                <ShieldCheck {...ICON} style={{ flexShrink: 0 }} />
                <span>{tx('Console fondateur')}</span>
              </Link>
            )}
          </nav>
          <div className="shell-burger" style={{ padding: '10px 12px 16px', borderTop: '1px solid var(--separator)', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
            <LangSwitcher />
            <button onClick={logout} className="shell-icon-btn" style={{ ...iconBtn, width: 'auto', padding: '0 10px', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <LogOut {...ICON} /> {t('nav.logout')}
            </button>
          </div>
        </aside>
        <main className="shell-main"><Suspense fallback={null}>{children}</Suspense></main>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 'var(--radius-control)', border: 'none', background: 'transparent',
  color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
}

function TopBar({ onMenu, balance, days, company, initials, founder, onLogout }: {
  onMenu: () => void; balance: number | null; days: number | null; company: string
  initials: string; founder: boolean; onLogout: () => void
}) {
  const router = useRouter()
  const { t } = useLang()
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const isMac = useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.userAgent), () => true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); input.current?.select() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // For now the global search opens the Orders search (name, phone, product, city, order or tracking no.).
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    router.push(query ? `/orders?q=${encodeURIComponent(query)}` : '/orders')
    input.current?.blur()
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, height: 'var(--topbar-h)', background: 'var(--sidebar)',
      borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
    }}>
      <button onClick={onMenu} aria-label={tx('Ouvrir le menu')} className="shell-burger shell-icon-btn" style={iconBtn}><Menu {...ICON} /></button>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', width: 'calc(var(--sidenav-w) - 28px)', flexShrink: 0 }} className="shell-wordmark">
        <Wordmark size={18} />
      </Link>

      <form onSubmit={submit} role="search" className="shell-search" style={{ flex: 1, maxWidth: 520, position: 'relative' }}>
        <Search size={16} strokeWidth={1.8} color="var(--text-tertiary)" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search"
          placeholder={tx('Rechercher une commande, un client, un numéro de suivi')}
          aria-label={tx('Rechercher une commande, un client, un numéro de suivi')}
          style={{
            width: '100%', height: 34, borderRadius: 'var(--radius-control)', border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--text)', fontSize: 13, paddingInlineStart: 34, paddingInlineEnd: 52,
            outline: 'none', boxSizing: 'border-box', transition: 'border-color var(--ease)',
          }} />
        <kbd style={{
          position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
          fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 6px',
          borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)',
        }}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </form>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="shell-desktop-only"><InstallAppButton /></span>
        {balance !== null && (
          <Link href="/credits" title={t('nav.credits')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)',
            background: 'var(--brand-accent-soft)', border: '1px solid color-mix(in srgb, var(--brand-accent) 60%, transparent)',
            color: 'var(--text)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-accent)', flexShrink: 0 }} />
            {tx('{0} DH', [balance.toLocaleString(intlLocale())])}
            {days !== null && <span className="shell-desktop-only" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {tx('≈ {0} jours', [days])}</span>}
          </Link>
        )}
        <NotificationBell />
        <AvatarMenu initials={initials} company={company} founder={founder} onLogout={onLogout} />
      </div>
    </header>
  )
}

function AvatarMenu({ initials, company, founder, onLogout }: { initials: string; company: string; founder: boolean; onLogout: () => void }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 36, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, textDecoration: 'none', cursor: 'pointer', textAlign: 'start' }
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} aria-label={tx('Mon compte')} aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
          {initials || <Settings size={15} strokeWidth={1.8} />}
        </span>
        <ChevronDown size={14} strokeWidth={1.8} className="shell-desktop-only" />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 40, insetInlineEnd: 0, minWidth: 220, zIndex: 120, padding: '6px 0',
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', boxShadow: '0 12px 32px rgba(20,20,26,0.12)',
        }}>
          {company && <div style={{ padding: '6px 12px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--separator)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company}</div>}
          <Link href="/settings" role="menuitem" className="shell-nav-item" style={row} onClick={() => setOpen(false)}><Settings {...ICON} color="var(--text-muted)" /> {t('nav.settings')}</Link>
          {founder && <Link href="/admin" role="menuitem" className="shell-nav-item" style={row} onClick={() => setOpen(false)}><ShieldCheck {...ICON} color="var(--text-muted)" /> {tx('Console fondateur')}</Link>}
          <div className="shell-desktop-only" style={{ padding: '6px 12px' }}><LangSwitcher /></div>
          <button role="menuitem" className="shell-nav-item" style={{ ...row, color: 'var(--destructive)' }} onClick={onLogout}><LogOut {...ICON} /> {t('nav.logout')}</button>
        </div>
      )}
    </div>
  )
}
