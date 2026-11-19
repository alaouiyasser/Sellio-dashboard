'use client'
// Agents: the founder's feed (daily report, new leads, alerts) + phone notifications.
import { useCallback, useEffect, useState } from 'react'
import { Bell, BellRing, FileText, UserCheck, AlertTriangle, FlaskConical, RefreshCw, Send } from 'lucide-react'
import { adminApi, type OpsItem } from '@/lib/admin-api'
import { Card, Badge, PageHead, Skeleton, ErrorBox, dateFr, btn } from '@/components/admin/ui'
import MarketingCard from '@/components/admin/MarketingCard'
import DevCard from '@/components/admin/DevCard'

const KIND: Record<OpsItem['kind'], { label: string; icon: typeof FileText; tone: 'brand' | 'success' | 'warning' | 'muted' }> = {
  daily_report: { label: 'Rapport', icon: FileText, tone: 'brand' },
  lead: { label: 'Lead', icon: UserCheck, tone: 'success' },
  alert: { label: 'Alerte', icon: AlertTriangle, tone: 'warning' },
  test: { label: 'Test', icon: FlaskConical, tone: 'muted' },
  dev: { label: 'Dev', icon: FlaskConical, tone: 'brand' },
}

function keyBytes(b64url: string): Uint8Array {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

type PushState = 'unsupported' | 'off' | 'on' | 'denied'

export default function AdminOpsPage() {
  const [items, setItems] = useState<OpsItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [push, setPush] = useState<PushState>('off')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    adminApi.opsFeed().then((r) => setItems(r.items)).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setPush('unsupported'); return }
    if (Notification.permission === 'denied') { setPush('denied'); return }
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => setPush(s ? 'on' : 'off')).catch(() => {})
  }, [])

  async function enable() {
    setBusy('enable'); setMsg(null)
    try {
      // iPhone: the permission prompt must come straight from the tap.
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPush(perm === 'denied' ? 'denied' : 'off'); return }
      const reg = await navigator.serviceWorker.ready
      const { publicKey } = await adminApi.pushKey()
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) as BufferSource })
      await adminApi.pushSubscribe(sub.endpoint)
      setPush('on'); setMsg('Notifications activées sur cet appareil.')
    } catch (e) {
      setMsg((e as Error).message || 'Activation impossible.')
    } finally { setBusy(null) }
  }

  async function run(kind: 'test' | 'report') {
    setBusy(kind); setMsg(null)
    try {
      if (kind === 'test') await adminApi.pushTest(); else await adminApi.reportNow()
      setMsg(kind === 'test' ? 'Notification de test envoyée.' : 'Rapport généré.')
      load()
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }

  const pushLabel = {
    unsupported: 'Ouvrez Sellio depuis l’app installée (écran d’accueil) pour activer les notifications.',
    off: 'Recevez le rapport du matin, les nouveaux leads et les alertes sur ce téléphone.',
    on: 'Activées sur cet appareil.',
    denied: 'Refusées. Réactivez-les dans les réglages du téléphone (Notifications → Sellio).',
  }[push]

  return (
    <div className="admin-page" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <PageHead title="Agents" subtitle="Rapport de chaque matin (8h), nouveaux leads et alertes." right={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => run('report')} disabled={!!busy} style={btn('ghost')}><Send size={14} /> Rapport maintenant</button>
          <button onClick={load} style={btn('ghost')}><RefreshCw size={14} /></button>
        </div>
      } />

      <Card title="Notifications sur ce téléphone" icon={push === 'on' ? BellRing : Bell}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1, minWidth: 220 }}>{pushLabel}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(push === 'off') && <button onClick={enable} disabled={!!busy} style={btn('primary')}><Bell size={14} /> Activer</button>}
            {push === 'on' && <button onClick={() => run('test')} disabled={!!busy} style={btn('ghost')}><FlaskConical size={14} /> Tester</button>}
          </div>
        </div>
        {msg && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text)' }}>{msg}</div>}
      </Card>

      <DevCard />
      <MarketingCard />

      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <><Skeleton h={90} /><Skeleton h={90} /></>}
      {items && !items.length && <Card><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rien pour l’instant. Le premier rapport arrive demain à 8h.</span></Card>}
      {items?.map((it) => {
        const k = KIND[it.kind] ?? KIND.test
        return (
          <Card key={it.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: it.body ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <k.icon size={16} color="var(--brand)" style={{ flexShrink: 0 }} />
                <strong style={{ fontSize: 14, color: 'var(--text)' }}>{it.title}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Badge tone={k.tone}>{k.label}</Badge>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{dateFr(it.created_at, true)}</span>
              </div>
            </div>
            {it.body && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>{it.body}</pre>}
          </Card>
        )
      })}
    </div>
  )
}
