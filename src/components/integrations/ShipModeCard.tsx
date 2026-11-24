'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Hand, Zap, Loader2 } from 'lucide-react'
import { fetchShipSettings, saveShipSettings, SHIP_TIMEZONES, DEFAULT_SHIP_TIMEZONE, type ShipMode, type ShipSettings } from '@/lib/shipping-api'
import { tx, intlLocale } from '@/lib/i18n'

const MODES: { key: ShipMode; icon: typeof Zap; label: () => string; hint: () => string }[] = [
  { key: 'auto', icon: Zap, label: () => tx("Automatique"), hint: () => tx("Le colis est créé chez le transporteur dès que la commande est confirmée.") },
  { key: 'scheduled', icon: CalendarClock, label: () => tx("Programmé"), hint: () => tx("Une fois par jour à l'heure choisie : toutes les commandes confirmées avant cette heure partent, les autres partent le lendemain.") },
  { key: 'manual', icon: Hand, label: () => tx("Manuel"), hint: () => tx("Rien ne part tout seul : vous envoyez une commande, ou toutes d'un coup, depuis la page Commandes.") },
]

/** "Mode d'envoi" — when confirmed orders are handed to the carrier (per merchant). Tracking runs in every mode. */
export default function ShipModeCard({ tenantId }: { tenantId: string }) {
  const [saved, setSaved] = useState<ShipSettings | null>(null)
  const [mode, setMode] = useState<ShipMode>('auto')
  const [time, setTime] = useState('18:00')
  const [tz, setTz] = useState(DEFAULT_SHIP_TIMEZONE)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  function load(s: ShipSettings) {
    setSaved(s); setMode(s.mode); setTz(s.timezone); if (s.scheduleTime) setTime(s.scheduleTime)
  }
  useEffect(() => { fetchShipSettings(tenantId).then(load).catch(() => setFailed(true)) }, [tenantId])

  const timezones = SHIP_TIMEZONES.includes(tz) ? SHIP_TIMEZONES : [...SHIP_TIMEZONES, tz]
  const dirty = !!saved && (mode !== saved.mode || tz !== saved.timezone || (mode === 'scheduled' && time !== saved.scheduleTime))
  const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

  async function save() {
    if (busy || !dirty || (mode === 'scheduled' && !timeOk)) return
    setBusy(true)
    try {
      load(await saveShipSettings(tenantId, { mode, scheduleTime: mode === 'scheduled' ? time : saved?.scheduleTime ?? null, timezone: tz }))
      toast.success(tx("Mode d'envoi enregistré"))
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : tx("Échec de l'enregistrement"))
    } finally { setBusy(false) }
  }

  const last = saved?.lastScheduledPushDate
    ? new Date(`${saved.lastScheduledPushDate}T12:00:00`).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const field: React.CSSProperties = { height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13 }

  return (
    <section style={{ marginBottom: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{tx("Mode d'envoi")}</h2>
      <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
        {tx("Quand vos commandes confirmées partent chez le transporteur. Le suivi des colis fonctionne dans tous les modes.")}
      </p>

      {failed ? (
        <div style={{ fontSize: 13, color: 'var(--destructive)' }}>{tx("Impossible de charger le mode d'envoi.")}</div>
      ) : !saved ? (
        <div style={{ height: 120, borderRadius: 10, background: 'var(--brand-tint-soft)' }} aria-busy />
      ) : (
        <>
          <div role="radiogroup" aria-label={tx("Mode d'envoi")} style={{ display: 'grid', gap: 8 }}>
            {MODES.map((m) => {
              const on = mode === m.key
              const Icon = m.icon
              return (
                <button key={m.key} role="radio" aria-checked={on} onClick={() => setMode(m.key)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'start', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--brand)' : 'var(--border)'}`, background: on ? 'var(--brand-tint-soft)' : 'var(--card)', transition: 'all 150ms ease',
                }}>
                  <Icon size={17} strokeWidth={1.8} color={on ? 'var(--brand)' : 'var(--text-muted)'} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: on ? 'var(--brand)' : 'var(--text)' }}>{m.label()}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.45 }}>{m.hint()}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {mode === 'scheduled' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, alignItems: 'flex-end' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'grid', gap: 4 }}>
                {tx("Heure d'envoi")}
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" style={{ ...field, width: 120 }} aria-invalid={!timeOk} />
              </label>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'grid', gap: 4 }}>
                {tx("Fuseau horaire")}
                <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ ...field, minWidth: 190 }}>
                  {timezones.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {last ? tx("Dernier envoi programmé : {0}", [last]) : ''}
            </span>
            <button onClick={save} disabled={busy || !dirty || (mode === 'scheduled' && !timeOk)} style={{
              height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: 'var(--brand-foreground)', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: busy ? 'wait' : 'pointer', opacity: busy || !dirty || (mode === 'scheduled' && !timeOk) ? 0.5 : 1,
            }}>
              {busy && <Loader2 size={15} className="animate-spin" />}{tx("Enregistrer")}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
