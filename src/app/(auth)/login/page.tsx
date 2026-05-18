'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) toast.error(error.message)
    else router.push('/orders')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0C1117',
    }}>
      <div style={{
        width: '100%', maxWidth: 400, padding: 32,
        background: '#0F1721', border: '1px solid #1E2D3E',
        borderRadius: 20,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #1B2D3E, #2A4560)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px rgba(139,154,53,0.4)',
            fontSize: 22, fontWeight: 800, color: '#8B9A35',
          }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EDF2' }}>
            Sell<span style={{ color: '#8B9A35' }}>io</span>
          </div>
          <div style={{ fontSize: 13, color: '#6B7B8D', marginTop: 4 }}>
            Connectez-vous à votre dashboard
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{
              padding: '11px 14px', borderRadius: 10,
              border: '1px solid #1E2D3E', background: '#0C1117',
              color: '#E8EDF2', fontSize: 14, outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Mot de passe"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              padding: '11px 14px', borderRadius: 10,
              border: '1px solid #1E2D3E', background: '#0C1117',
              color: '#E8EDF2', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={handleLogin} disabled={loading}
            style={{
              marginTop: 8, padding: '12px', borderRadius: 10,
              background: '#8B9A35', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
