'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'

import { tx } from '@/lib/i18n'
export default function OnboardingPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle()
      if (tenant) { setTenantId(tenant.id); return }
      console.error(tx("[onboarding] no tenant row for user"), data.user.id)
      router.push('/login')
    })
  }, [])

  if (!tenantId) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tx("Chargement...")}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          {tx("Sell")}<span style={{ color: 'var(--brand)' }}>{tx("io")}</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
          {tx("Configurez votre compte en quelques étapes 🚀")}
        </p>
      </div>
      <WizardOnboarding tenantId={tenantId} onComplete={() => router.push('/orders')} />
    </div>
  )
}
