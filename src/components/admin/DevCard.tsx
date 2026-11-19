'use client'
// Agent Dev: weekly proposals. Approve → GitHub issue that Claude Code builds in a branch (PR to review).
import { useCallback, useEffect, useState } from 'react'
import { Wrench, Check, X, ExternalLink, Search } from 'lucide-react'
import { adminApi, type DevProposal } from '@/lib/admin-api'
import { Card, Badge, dateFr, btn } from '@/components/admin/ui'

const CAT: Record<string, string> = { ai_model: 'Modèle IA', skill_tool: 'Outil / skill', meta_whatsapp: 'Meta / WhatsApp', cod_market: 'Marché COD', feature: 'Fonctionnalité', cost: 'Coûts' }
const STATUS: Record<DevProposal['status'], { label: string; tone: 'brand' | 'success' | 'muted' | 'warning' }> = {
  new: { label: 'Nouvelle', tone: 'warning' }, approved: { label: 'Approuvée', tone: 'success' }, rejected: { label: 'Refusée', tone: 'muted' }, done: { label: 'Faite', tone: 'brand' },
}

export default function DevCard() {
  const [items, setItems] = useState<DevProposal[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => { adminApi.devProposals().then((r) => setItems(r.proposals)).catch((e) => setMsg(e.message)) }, [])
  useEffect(load, [load])

  async function decide(id: number, d: 'approve' | 'reject') {
    setBusy(`${d}-${id}`); setMsg(null)
    try { const r = await adminApi.devDecide(id, d); setMsg(d === 'approve' ? `Issue créée${r.issueUrl ? ` : ${r.issueUrl}` : ''}. Claude Code s’en occupe dans une branche.` : 'Refusée.'); load() }
    catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }
  async function scout() {
    setBusy('scout'); setMsg('Veille en cours (1 à 3 minutes)…')
    try { const r = await adminApi.devScoutNow(); setMsg(`${r.count} proposition(s).`); load() }
    catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }

  return (
    <Card title="Agent Dev" icon={Wrench} hint="Chaque lundi 9h : nouveaux modèles IA, outils, changements Meta, marché COD. Rien n’est construit sans ton accord."
      right={<button onClick={scout} disabled={!!busy} style={btn('ghost')}><Search size={14} /> Veille maintenant</button>}>
      {msg && <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 12, wordBreak: 'break-word' }}>{msg}</div>}
      {items && !items.length && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune proposition pour l’instant. La première veille arrive lundi à 9h.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items?.map((p) => (
          <div key={p.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <strong style={{ fontSize: 13.5, color: 'var(--text)' }}>{p.title}</strong>
              <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
              <Badge tone="muted">{CAT[p.category] ?? p.category}</Badge>
              <Badge tone="muted">Effort {p.effort}</Badge>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{dateFr(p.created_at)}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{p.what}</div>
            <div style={{ fontSize: 13, color: 'var(--success)', lineHeight: 1.55, marginTop: 4 }}>{p.benefit}</div>
            {p.risk && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Risque : {p.risk}</div>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              {p.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)', display: 'inline-flex', gap: 4, alignItems: 'center' }}><ExternalLink size={12} />{new URL(s).hostname}</a>)}
              {p.issue_url && <a href={p.issue_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)' }}>Issue GitHub</a>}
            </div>
            {p.status === 'new' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => decide(p.id, 'approve')} disabled={!!busy} style={btn('primary')}><Check size={14} /> Approuver</button>
                <button onClick={() => decide(p.id, 'reject')} disabled={!!busy} style={btn('ghost')}><X size={14} /> Refuser</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
