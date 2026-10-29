'use client'
// Shown instead of the QR-code flow when Sellio sends from its official WhatsApp number.
import { ShieldCheck } from 'lucide-react'

import { tx } from '@/lib/i18n'
export default function OfficialNumberCard({ displayNumber }: { displayNumber: string | null }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 18, background: 'color-mix(in srgb, var(--brand) 5%, var(--card))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--success) 14%, transparent)' }}>
          <ShieldCheck size={18} color="var(--success)" />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{tx("Numéro officiel Sellio")}</div>
          {displayNumber && <div style={{ fontSize: 13, color: 'var(--text-muted)', direction: 'ltr' }}>{displayNumber}</div>}
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
        {tx("Vos clients reçoivent la confirmation, les relances et le suivi depuis le compte WhatsApp professionnel de Sellio. Vous n'avez aucun numéro à connecter ni de QR code à scanner, et votre WhatsApp personnel n'est jamais utilisé.")}
      </p>
    </div>
  )
}
