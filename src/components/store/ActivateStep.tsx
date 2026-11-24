'use client'
// "Activer" (plan Démarrage): amount, beneficiary, RIB and support WhatsApp all come from the API
// (GET /api/store/activation). When the founder has not configured them yet, nothing is shown
// but "bientôt disponible": no number or RIB lives in this code.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Clock, ExternalLink, Loader2, MessageCircle, XCircle } from 'lucide-react'
import { storeApi, storeUrl, type Activation } from '@/lib/store-api'
import { tx } from '@/lib/i18n'
import { CopyButton, btn, card, h2, muted } from './ui'

export default function ActivateStep({ slug, activeProducts, onStatus }: {
  slug: string; activeProducts: number; onStatus: (s: Activation['status']) => void
}) {
  const [a, setA] = useState<Activation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const load = () => storeApi.activation().then((x) => { setA(x); onStatus(x.status) }).catch((e) => setError((e as Error).message))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function request() {
    setSending(true)
    try { const x = await storeApi.requestActivation(); setA(x); onStatus(x.status); toast.success(tx('Demande envoyée')) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSending(false) }
  }

  if (error) return <div style={card}><p style={{ ...muted, color: 'var(--destructive)' }}>{error}</p></div>
  if (!a) return <div style={{ ...card, textAlign: 'center' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline', color: 'var(--text-muted)' }} /></div>

  const rejected = a.status === 'draft' && a.request?.status === 'rejected'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={h2}>{tx('Activer la boutique')}</h2>
        <p style={muted}>{tx('Votre boutique est visible par vous seul tant qu’elle n’est pas activée.')}</p>
      </div>

      {a.status === 'online' && (
        <div style={{ ...card, borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 700 }}><CheckCircle2 size={18} /> {tx('Votre boutique est en ligne')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <a href={storeUrl(slug)} target="_blank" rel="noreferrer" style={{ ...btn('primary'), textDecoration: 'none' }}><ExternalLink size={14} /> {tx('Voir ma boutique')}</a>
            <CopyButton text={storeUrl(slug)} label={tx('Copier le lien')} />
          </div>
        </div>
      )}

      {a.status === 'suspended' && (
        <div style={{ ...card, borderColor: 'var(--destructive)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--destructive)', fontWeight: 700 }}><XCircle size={18} /> {tx('Boutique suspendue : contactez le support Sellio')}</div>
        </div>
      )}

      {a.status === 'pending' && (
        <div style={{ ...card, borderColor: 'var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)', fontWeight: 700 }}><Clock size={18} /> {tx('Demande en attente de vérification')}</div>
          <p style={{ ...muted, marginTop: 6 }}>{tx('Nous vérifions votre virement. Vous recevrez une notification dès que la boutique est en ligne.')}</p>
        </div>
      )}

      {rejected && (
        <div style={{ ...card, borderColor: 'var(--destructive)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--destructive)', fontWeight: 700 }}><XCircle size={18} /> {tx('Activation refusée')}</div>
          {a.request?.reason && <p style={{ ...muted, marginTop: 6, color: 'var(--text)' }}>{tx('Raison : {0}', [a.request.reason])}</p>}
          <p style={{ ...muted, marginTop: 6 }}>{tx('Corrigez puis renvoyez votre demande.')}</p>
        </div>
      )}

      {(a.status === 'draft' || a.status === 'pending') && (
        !a.configured ? (
          <div style={card}>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Activation bientôt disponible')}</strong>
            <p style={{ ...muted, marginTop: 6 }}>{tx('Vous pouvez continuer à préparer votre boutique : vous pourrez l’activer dès que ce sera ouvert.')}</p>
          </div>
        ) : (
          <div style={card}>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>{tx('Plan Démarrage : virement de {0} DH', [a.amount])}</strong>
            <p style={{ ...muted, marginTop: 4 }}>{tx('Les {0} DH sont ajoutés à votre solde en crédits dès la validation.', [a.amount])}</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <Line k={tx('Montant')} v={`${a.amount} DH`} />
              {a.beneficiary && <Line k={tx('Bénéficiaire')} v={a.beneficiary} copy />}
              {a.rib && <Line k={tx('RIB')} v={a.rib} copy mono />}
            </div>
            <ol style={{ margin: '14px 0 0', paddingInlineStart: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
              <li>{tx('Faites le virement de {0} DH sur ce RIB.', [a.amount])}</li>
              <li>{tx('Envoyez le reçu au support Sellio sur WhatsApp.')}</li>
              <li>{tx('Cliquez « J’ai fait le virement » : nous vérifions et mettons la boutique en ligne.')}</li>
            </ol>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              {a.whatsappLink && (
                <a href={a.whatsappLink} target="_blank" rel="noreferrer" style={{ ...btn('ghost'), textDecoration: 'none', color: '#128c7e', borderColor: '#25d366' }}>
                  <MessageCircle size={14} /> {tx('Envoyer le reçu sur WhatsApp')}
                </a>
              )}
              {a.status === 'draft' && (
                <button type="button" onClick={request} disabled={sending || activeProducts < 1} style={btn('primary', sending || activeProducts < 1)}>
                  {sending && <Loader2 size={14} className="animate-spin" />} {tx('J’ai fait le virement')}
                </button>
              )}
            </div>
            {a.status === 'draft' && activeProducts < 1 && <p style={{ ...muted, fontSize: 12, marginTop: 8, color: 'var(--warning)' }}>{tx('Ajoutez au moins un produit avant d’activer la boutique')}</p>}
          </div>
        )
      )}
    </div>
  )
}

function Line({ k, v, copy, mono }: { k: string; v: string; copy?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</div>
        <div dir="ltr" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: mono ? 'ui-monospace, monospace' : undefined, wordBreak: 'break-all' }}>{v}</div>
      </div>
      {copy && <CopyButton text={v} />}
    </div>
  )
}
