'use client'
// Founder console building blocks — same tokens as the merchant dashboard (var(--card), var(--brand)…).
import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'

const nf0 = new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const mad = (n: number | null | undefined, decimals = false) =>
  n === null || n === undefined ? '—' : `${(decimals ? nf2 : nf0).format(n)} DH`
export const int = (n: number | null | undefined) => (n === null || n === undefined ? '—' : nf0.format(n))
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n.toLocaleString('fr-MA', { maximumFractionDigits: 1 })} %`)
export const dateFr = (iso: string | null | undefined, withTime = false) =>
  !iso ? '—' : new Date(iso).toLocaleString('fr-FR', withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
export const ago = (iso: string | null | undefined) => {
  if (!iso) return 'jamais'
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400_000)
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`
}

export const cardStyle: CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, minWidth: 0,
}

export function Card({ title, icon: Icon, hint, right, children, style, pad = true }: {
  title?: string; icon?: LucideIcon; hint?: string; right?: ReactNode; children: ReactNode; style?: CSSProperties; pad?: boolean
}) {
  return (
    <section style={{ ...cardStyle, ...(pad ? {} : { padding: 0 }), ...style }}>
      {title && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, ...(pad ? {} : { padding: '18px 20px 0' }) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {Icon && <Icon size={16} strokeWidth={2.2} color="var(--brand)" style={{ flexShrink: 0 }} />}
            <h2 style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)', margin: 0 }}>{title}</h2>
            {hint && <span title={hint} style={{ display: 'inline-flex', color: 'var(--text-muted)', cursor: 'help' }}><Info size={13} /></span>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

type Tone = 'brand' | 'success' | 'warning' | 'destructive' | 'muted'
const toneColor: Record<Tone, string> = {
  brand: 'var(--brand)', success: 'var(--success)', warning: 'var(--warning)', destructive: 'var(--destructive)', muted: 'var(--text-muted)',
}

export function Kpi({ label, value, sub, icon: Icon, tone = 'brand', hint }: {
  label: string; value: ReactNode; sub?: ReactNode; icon: LucideIcon; tone?: Tone; hint?: string
}) {
  const c = toneColor[tone]
  return (
    <div style={{ ...cardStyle, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }} title={hint}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${c} 12%, transparent)`, flexShrink: 0 }}>
          <Icon size={16} strokeWidth={2.2} color={c} />
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 750, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: Tone }) {
  const c = toneColor[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
      fontSize: 11, fontWeight: 600, color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`,
    }}>{children}</span>
  )
}

export function Bar({ value, tone = 'brand', height = 6 }: { value: number; tone?: Tone; height?: number }) {
  return (
    <div style={{ height, borderRadius: height, background: 'var(--border)', overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: toneColor[tone], borderRadius: height, transition: 'width .4s' }} />
    </div>
  )
}

export const PERIODS = [7, 30, 90, 365] as const
export function PeriodPicker({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)' }}>
      {PERIODS.map((d) => {
        const on = d === value
        return (
          <button key={d} role="tab" aria-selected={on} onClick={() => onChange(d)} style={{
            border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
            background: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--text-muted)',
          }}>{d === 365 ? '12 mois' : `${d} j`}</button>
        )
      })}
    </div>
  )
}

export function PageHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 750, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="admin-skel" style={{ ...cardStyle, height: h, padding: 0 }} />
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ ...cardStyle, borderColor: 'color-mix(in srgb, var(--destructive) 40%, var(--border))', color: 'var(--destructive)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} style={btn('ghost')}>Réessayer</button>}
    </div>
  )
}

export function btn(kind: 'primary' | 'ghost' | 'danger' = 'primary'): CSSProperties {
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', whiteSpace: 'nowrap' }
  if (kind === 'primary') return { ...base, background: 'var(--brand)', color: '#fff' }
  if (kind === 'danger') return { ...base, background: 'transparent', color: 'var(--destructive)', borderColor: 'var(--border)' }
  return { ...base, background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }
}

export const inputStyle: CSSProperties = {
  padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 0,
}

export const th: CSSProperties = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--card)' }
export const td: CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

// ─── labels ──────────────────────────────────────────────────────────────────
export const FLAG_META: Record<string, { label: string; tone: Tone; help: string }> = {
  credits_low: { label: 'Crédits ≤ 100', tone: 'warning', help: 'Solde à 100 DH ou moins : risque de blocage des confirmations.' },
  delivery_low: { label: 'Livraison < 30 %', tone: 'destructive', help: 'Moins de 30 % des commandes livrées (sur 20+ commandes) : produit, ciblage ou transporteur à revoir.' },
  whatsapp_off: { label: 'WhatsApp déconnecté', tone: 'destructive', help: "Aucune instance WhatsApp connectée : les clients ne reçoivent rien." },
  carrier_error: { label: 'Transporteur en erreur', tone: 'destructive', help: 'Le compte transporteur renvoie une erreur (clé, compte suspendu…).' },
  inactive_7d: { label: 'Inactif 7 j', tone: 'muted', help: 'Aucune commande depuis plus de 7 jours.' },
}

export const PURPOSE_LABEL: Record<string, string> = {
  confirmation: 'Confirmation', reminder: 'Relance', delivery_check: 'Suivi livraison', tracking: 'Tracking client',
  reply: 'Réponses', merchant_alert: 'Alertes marchand',
}

export const EXPENSE_LABEL: Record<string, string> = { ads: 'Publicité', infra: 'Infrastructure', tools: 'Outils & abonnements', other: 'Autre' }

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'En attente', tone: 'muted' }, sent: { label: 'Message envoyé', tone: 'muted' },
  confirmed: { label: 'Confirmée', tone: 'brand' }, canceled: { label: 'Annulée', tone: 'destructive' }, cancelled: { label: 'Annulée', tone: 'destructive' },
  in_delivery: { label: 'En livraison', tone: 'warning' }, delivered: { label: 'Livrée', tone: 'success' }, returned: { label: 'Retournée', tone: 'destructive' },
  awaiting_shipping_info: { label: 'Infos expédition', tone: 'warning' }, awaiting_delivery_check: { label: 'Vérif. livraison', tone: 'warning' },
  needs_merchant_confirm: { label: 'À valider', tone: 'warning' }, delivery_issue: { label: 'Problème livraison', tone: 'destructive' },
}
