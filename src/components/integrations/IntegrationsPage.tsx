'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'
import IntegrationsManager from '@/components/integrations/IntegrationsManager'
import { toast } from 'sonner'
import { tx } from '@/lib/i18n'

/** Shared by /integrations (Boutiques) and /livraison: the guided setup first, then the manager. */
export default function IntegrationsPage({ scope }: { scope: 'stores' | 'carriers' }) {
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [done, setDone] = useState<boolean | null>(null)

  // Old menu link: /integrations#livraison now lives at /livraison.
  useEffect(() => {
    if (scope === 'stores' && window.location.hash === '#livraison') router.replace('/livraison')
  }, [scope, router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, onboarding_completed')
        .eq('id', data.user.id)
        .single()
      if (tenant) {
        setTenantId(tenant.id)
        setDone(!!(tenant as any).onboarding_completed)
      }
    })
  }, [])

  if (!tenantId || done === null) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tx("Chargement...")}</div>
    </div>
  )

  // Onboarding terminé → tableau de gestion
  if (done) return <IntegrationsManager scope={scope} />

  // Premier setup → assistant guidé
  return (
    <div style={{ padding: '28px 16px 64px' }}>
      <WizardOnboarding
        tenantId={tenantId}
        onComplete={() => { toast.success(tx("Configuration terminée")); setDone(true) }}
      />
    </div>
  )
}
