'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import WizardOnboarding from '@/components/onboarding/WizardOnboarding'
import IntegrationsManager from '@/components/integrations/IntegrationsManager'
import { toast } from 'sonner'

export default function IntegrationsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, onboarding_completed')
        .eq('email', data.user.email)
        .single()
      if (tenant) {
        setTenantId(tenant.id)
        setDone(!!(tenant as any).onboarding_completed)
      }
    })
  }, [])

  if (!tenantId || done === null) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chargement...</div>
    </div>
  )

  // Onboarding terminé → tableau de gestion des intégrations
  if (done) return <IntegrationsManager />

  // Premier setup → assistant guidé
  return (
    <div style={{ padding: '28px 16px 64px' }}>
      <WizardOnboarding
        tenantId={tenantId}
        onComplete={() => { toast.success('Configuration terminée ✓'); setDone(true) }}
      />
    </div>
  )
}
