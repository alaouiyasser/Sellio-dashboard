'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useParams, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'

const OLIVE = '#8B9A35'

// ── Status badge ────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmée',   color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  pending:   { label: 'En attente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  canceled:  { label: 'Annulée',     color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  cancelled: { label: 'Annulée',     color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  delivered: { label: 'Livrée',      color: '#8B9A35', bg: 'rgba(139,154,53,0.15)' },
  returned:  { label: 'Retournée',   color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
}

// ── Delivery status → step index mapping ────────────────
function deliveryStatusToStep(ds: string | null): number {
  if (!ds) return -1
  const s = ds.toLowerCase()
  if (/waiting|en attente|nouveau|pending/.test(s))           return 2
  if (/taken|pris en charge|pickup|collecté|ramassé/.test(s)) return 3
  if (/hub|transit|entrepôt|centre/.test(s))                  return 4
  if (/out.for|sortie|en livraison|en cours/.test(s))         return 5
  if (/delivered|livré(?!e\s+retour)|remis/.test(s))          return 6
  if (/failed|echec|tentative/.test(s))                       return 5
  if (/return|retour|renvoi/.test(s))                         return 7
  return -1
}

// ── Build timeline steps from order data ─────────────────
function buildTimeline(order: any) {
  const isCanceled = order.status === 'canceled' || order.status === 'cancelled'
  const isReturned = !!order.returned_at
  const deliveryStep = deliveryStatusToStep(order.delivery_status)

  const steps = [
    {
      id: 'received',
      icon: '📥',
      label: 'Commande reçue',
      sublabel: 'Nouvelle commande enregistrée',
      date: order.created_at,
      done: true,
      active: false,
    },
    {
      id: 'whatsapp',
      icon: '💬',
      label: 'Message WhatsApp envoyé',
      sublabel: 'En attente de confirmation client',
      date: null,
      done: order.status !== 'pending',
      active: order.status === 'pending',
    },
    {
      id: 'confirmed',
      icon: '✅',
      label: 'Confirmée par le client',
      sublabel: 'Client a confirmé la commande',
      date: order.confirmed_at,
      done: !!order.confirmed_at || order.status === 'delivered',
      active: false,
    },
    {
      id: 'pickup',
      icon: '��',
      label: 'Prise en charge par le livreur',
      sublabel: `Remise à ${order.delivery_provider ?? 'transporteur'}`,
      date: null,
      done: deliveryStep >= 3 || order.status === 'delivered',
      active: deliveryStep === 2,
    },
    {
      id: 'hub',
      icon: '🏭',
      label: 'Arrivée en hub / en transit',
      sublabel: 'Traitement dans l\'entrepôt du transporteur',
      date: null,
      done: deliveryStep >= 4 || order.status === 'delivered',
      active: deliveryStep === 3,
    },
    {
      id: 'outfordelivery',
      icon: '🚴',
      label: 'En cours de livraison',
      sublabel: 'Livreur en route vers le client',
      date: order.out_for_delivery_at,
      done: !!order.out_for_delivery_at || order.status === 'delivered',
      active: deliveryStep === 5 && order.status !== 'delivered',
    },
    {
      id: 'delivered',
      icon: '🎉',
      label: 'Livrée au client',
      sublabel: 'Commande remise avec succès',
      date: order.delivered_at,
      done: order.status === 'delivered',
      active: false,
    },
  ]

  // Canceled flow
  if (isCanceled) {
    const cancelIdx = steps.findIndex(s => s.id === 'confirmed')
    steps.splice(cancelIdx, steps.length - cancelIdx, {
      id: 'canceled',
      icon: '❌',
      label: 'Annulée',
      sublabel: order.cancellation_reason ?? 'Commande annulée',
      date: order.cancelled_at ?? order.canceled_at,
      done: true,
      active: false,
    })
  }

  // Returned flow
  if (isReturned) {
    steps.push({
      id: 'returned',
      icon: '🔄',
      label: 'Retournée',
      sublabel: order.returned_reason ?? 'Retour au vendeur',
      date: order.returned_at,
      done: true,
      active: false,
    })
  }

  return steps
}

function parseItems(items: any): any[] {
  if (Array.isArray(items)) return items
  if (typeof items === 'string') { try { return JSON.parse(items) } catch { return [] } }
  return []
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleString('fr-MA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const isMobile = useIsMobile()
  const router  = useRouter()
  const supabase = createClient()
  const [order,   setOrder]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrder() }, [id])

  async function fetchOrder() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: o } = await supabase
      .from('orders').select('*')
      .eq('id', id).eq('tenant_id', user.id).single()
    setOrder(o)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Détail commande" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
    </div>
  )

  if (!order) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Introuvable" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => router.push('/orders')} style={{ padding: '10px 20px', borderRadius: 10, background: OLIVE, color: '#fff', border: 'none', cursor: 'pointer' }}>← Retour</button>
      </div>
    </div>
  )

  const s        = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['pending']
  const timeline = buildTimeline(order)
  const items    = parseItems(order.items)
  const isCanceled = order.status === 'canceled' || order.status === 'cancelled'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={`Commande #${order.id?.slice(0, 8)}`} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <button onClick={() => router.push('/orders')} style={{
          marginBottom: 20, padding: '7px 14px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--card)',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
        }}>← Retour aux commandes</button>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commande</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: OLIVE }}>#{order.id?.slice(0, 8)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fmtDate(order.created_at)}</div>
                </div>
                <span style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>

              {/* Source + provider */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {order.source && (
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {order.source === 'shopify' ? '🛍️ Shopify' : '🛒 YouCan'}
                  </span>
                )}
                {order.delivery_provider && (
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    🚚 {order.delivery_provider}
                  </span>
                )}
                {order.delivery_status && (
                  <span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'rgba(139,154,53,0.1)', border: '1px solid rgba(139,154,53,0.3)', color: OLIVE }}>
                    {order.delivery_status}
                  </span>
                )}
              </div>
            </div>

            {/* Client */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>👤 Informations client</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Nom',          value: order.customer_name ?? '—' },
                  { label: 'Téléphone',    value: order.customer_phone ?? '—' },
                  { label: 'Ville',        value: order.shipping_address ?? order.city ?? '—' },
                  { label: 'Montant',      value: order.total_price ? `${Number(order.total_price).toLocaleString()} MAD` : '—' },
                ].map(f => (
                  <div key={f.label} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Tracking */}
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(139,154,53,0.08)', border: '1px solid rgba(139,154,53,0.3)',
                  color: OLIVE, textDecoration: 'none', fontSize: 13, fontWeight: 600,
                }}>
                  🔗 Suivre la livraison
                </a>
              )}

              {/* Annulation */}
              {isCanceled && order.cancellation_reason && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginBottom: 4 }}>RAISON D'ANNULATION</div>
                  <div style={{ fontSize: 13, color: '#EF4444' }}>{order.cancellation_reason}</div>
                </div>
              )}

              {/* Livreur phone */}
              {order.livreur_phone && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: '#6366F1', fontWeight: 600 }}>
                  📞 Livreur: {order.livreur_phone}
                </div>
              )}
            </div>

            {/* Products */}
            {items.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📦 Produits commandés</div>
                {items.map((item: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title ?? item.name ?? '—'}</div>
                      {item.variant && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Variante: {item.variant}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>x{item.quantity ?? 1}</div>
                      <div style={{ fontSize: 13, color: OLIVE, fontWeight: 700 }}>{item.price} MAD</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: OLIVE }}>
                    Total: {Number(order.total_price).toLocaleString()} MAD
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Timeline */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 20px', position: 'sticky', top: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 24 }}>🗺️ Suivi de commande</div>

            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute',
                left: 18, top: 0, bottom: 0,
                width: 2,
                background: 'var(--border)',
                zIndex: 0,
              }} />

              {timeline.map((step, i) => (
                <div key={step.id} style={{
                  display: 'flex', gap: 16,
                  marginBottom: i < timeline.length - 1 ? 24 : 0,
                  position: 'relative', zIndex: 1,
                }}>
                  {/* Circle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    background: step.done
                      ? 'rgba(139,154,53,0.15)'
                      : step.active
                        ? 'rgba(245,158,11,0.15)'
                        : 'var(--bg)',
                    border: step.done
                      ? '2px solid rgba(139,154,53,0.5)'
                      : step.active
                        ? '2px solid rgba(245,158,11,0.5)'
                        : '2px solid var(--border)',
                    opacity: !step.done && !step.active ? 0.4 : 1,
                  }}>
                    {step.done
                      ? step.icon
                      : step.active
                        ? '⏳'
                        : step.icon}
                  </div>

                  {/* Content */}
                  <div style={{ paddingTop: 4, opacity: !step.done && !step.active ? 0.45 : 1 }}>
                    <div style={{
                      fontSize: 13, fontWeight: step.done || step.active ? 600 : 400,
                      color: step.done ? 'var(--text)' : step.active ? '#F59E0B' : 'var(--text-muted)',
                    }}>
                      {step.label}
                      {step.active && (
                        <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 700 }}>
                          EN COURS
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{step.sublabel}</div>
                    {step.date && (
                      <div style={{ fontSize: 10, color: OLIVE, marginTop: 3, fontWeight: 600 }}>{fmtDate(step.date)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
