'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { apiPost } from '@/lib/auth-client'

export const dynamic = 'force-dynamic'

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createClient()
    let done = false
    async function route(userId: string, email: string | undefined) {
      if (done) return
      done = true
      const { data: tenant } = await supabase.from('tenants').select('id').eq('id', userId).maybeSingle()
      if (tenant) { window.location.href = '/orders'; return }
      const storeName = (email && email.split('@')[0]) || 'Ma boutique'
      await apiPost('/api/auth/signup', { userId, storeName, email })
      window.location.href = '/onboarding'
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) route(data.session.user.id, data.session.user.email ?? undefined)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) route(session.user.id, session.user.email ?? undefined)
    })
    const t = setTimeout(() => { if (!done) window.location.href = '/login' }, 6000)
    return () => { sub.subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-brand" />
    </div>
  )
}
