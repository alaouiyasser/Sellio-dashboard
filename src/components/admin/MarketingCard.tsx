'use client'
// Agent Marketing: results per script (7 days), Yasser's notes (the agent learns his style), scripts.
import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Send, Plus } from 'lucide-react'
import { adminApi, type MarketingOverview } from '@/lib/admin-api'
import { Card, Badge, dateFr, btn, inputStyle, th, td } from '@/components/admin/ui'

export default function MarketingCard() {
  const [data, setData] = useState<MarketingOverview | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState({ code: '', note: '' })
  const [script, setScript] = useState({ code: '', title: '', hook: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => { adminApi.marketing().then(setData).catch((e) => setErr(e.message)) }, [])
  useEffect(load, [load])

  async function save(kind: 'note' | 'script') {
    setBusy(true); setErr(null)
    try {
      if (kind === 'note') { await adminApi.marketingNote(note.code, note.note); setNote({ code: '', note: '' }) }
      else { await adminApi.marketingScript(script); setScript({ code: '', title: '', hook: '' }) }
      load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Card title="Agent Marketing" icon={Megaphone} hint="Nommez chaque pub avec le code du script (ex. S012_tombola) pour lier les résultats au script.">
      {data && !data.connected && <div style={{ fontSize: 12.5, color: 'var(--warning)', marginBottom: 12 }}>Compte publicitaire pas encore connecté (META_AD_ACCOUNT_ID).</div>}

      {!!data?.stats.length && (
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Script', 'Dépense', 'Impr.', 'Hook', 'Thruplay', 'Conv.', 'Coût/conv.'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{data.stats.map((s) => (
              <tr key={s.code}>
                <td style={td}><strong>{s.code}</strong> {!s.enough && <Badge tone="muted">peu de données</Badge>}</td>
                <td style={td}>{s.spend}</td><td style={td}>{s.impressions}</td>
                <td style={td}>{s.hookRate ?? '—'}%</td><td style={td}>{s.holdRate ?? '—'}%</td>
                <td style={td}>{s.conversations}</td><td style={td}>{s.costPerConversation ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text)' }}>Note pour l’agent (il apprend ton style)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Script (ex. 12)" value={note.code} onChange={(e) => setNote({ ...note, code: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <input placeholder="Ex. le hook est trop lent, j’aime quand…" value={note.note} onChange={(e) => setNote({ ...note, note: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <button onClick={() => save('note')} disabled={busy || note.note.trim().length < 3} style={btn('primary')}><Send size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text)' }}>Nouveau script</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Code (ex. 12)" value={script.code} onChange={(e) => setScript({ ...script, code: e.target.value })} style={{ ...inputStyle, width: 110 }} />
          <input placeholder="Titre (ex. Tombola dyal colis)" value={script.title} onChange={(e) => setScript({ ...script, title: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input placeholder="Hook" value={script.hook} onChange={(e) => setScript({ ...script, hook: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <button onClick={() => save('script')} disabled={busy || !script.code || !script.title} style={btn('ghost')}><Plus size={14} /></button>
        </div>
      </div>

      {err && <div style={{ fontSize: 12.5, color: 'var(--destructive)', marginBottom: 8 }}>{err}</div>}
      {!!data?.notes.length && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.notes.slice(0, 8).map((n) => (
            <div key={n.id} style={{ fontSize: 12.5, color: 'var(--text)' }}>
              {n.code && <Badge tone="brand">{n.code}</Badge>} {n.note} <span style={{ color: 'var(--text-muted)' }}>· {dateFr(n.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
