'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'

import { tx, intlLocale } from '@/lib/i18n'
const SELLIO_WHATSAPP = 'https://wa.me/212600000000?text=Bonjour%2C%20je%20veux%20recharger%20mes%20cr%C3%A9dits%20Sellio'

export default function CreditsPage() {
  const supabase = createClient()
  const { t } = useLang()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: credits }, { data: txs }] = await Promise.all([
      supabase.from('credits').select('balance').eq('tenant_id', user.id).single(),
      supabase.from('credit_transactions').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(50),
    ])
    if (credits) setBalance(credits.balance)
    setTransactions(txs ?? [])
    setLoading(false)
  }

  const creditColor = balance === null ? 'var(--text-muted)'
    : balance < 200 ? 'var(--destructive)'
    : balance < 500 ? 'var(--warning)'
    : 'var(--success)'

  const creditPct = balance === null ? 0 : Math.min((balance / 2000) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('credits.title')} subtitle={t('credits.balance')} />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--card)', border: `1px solid color-mix(in srgb, ${creditColor} 40%, var(--border))`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('credits.balance')}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: creditColor }}>
              {balance === null ? '...' : balance.toLocaleString()}
            </div>
            <div style={{ marginTop: 12, height: 6, borderRadius: 4, background: 'var(--border)' }}>
              <div style={{ width: `${creditPct}%`, height: '100%', borderRadius: 4, background: creditColor, transition: 'all 0.5s' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: creditColor, marginTop: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: creditColor, flexShrink: 0 }} />
              {balance !== null && balance < 200 ? t('credits.lowAlert') : balance !== null && balance < 500 ? t('credits.medAlert') : t('credits.okAlert')}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, var(--brand), #3A1FD0)', border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--brand-accent)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.3px' }}>{t('credits.recharge')}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{t('credits.rechargeMsg')}</div>
            </div>
            <a href={SELLIO_WHATSAPP} target="_blank" rel="noopener noreferrer" style={{
              marginTop: 16, padding: '11px 0', borderRadius: 10,
              background: '#25D366', color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t('credits.recharge')} {tx("WhatsApp")}
            </a>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{t('credits.history')}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {[t('credits.date'), t('credits.type'), t('credits.order'), t('credits.amount')].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{ t('loading') ?? tx("Chargement...") }</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{ t('credits.noTx') ?? tx("Aucune transaction") }</td></tr>
              ) : transactions.map((tx, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleDateString(intlLocale())}</td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: tx.type === 'recharge' ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--destructive) 15%, transparent)', color: tx.type === 'recharge' ? 'var(--success)' : 'var(--destructive)' }}>
                      {tx.type === 'recharge' ? t('credits.rechargeType') : t('credits.deduct')}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: 12, color: 'var(--brand)' }}>{tx.order_id ? `#${tx.order_id.slice(0, 8)}` : '—'}</td>
                  <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 700, color: tx.type === 'recharge' ? 'var(--success)' : 'var(--destructive)' }}>
                    {tx.type === 'recharge' ? '+' : '-'}{Math.abs(tx.amount)}
                  </td>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: 'var(--text)' }}>{tx.balance_after?.toLocaleString() ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
