'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const API = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:3001'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    if (!email || !password || !storeName) { toast.error('Remplissez tous les champs'); return }
    if (password.length < 6) { toast.error('Mot de passe minimum 6 caractères'); return }
    setLoading(true)
    try {
      // 1 — Create Supabase auth user
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { toast.error(error.message); return }
      const userId = data.user?.id
      if (!userId) { toast.error('Erreur lors de la création'); return }

      // 2 — Create tenant + credits via API
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, storeName, email }),
      })
      const result = await res.json()
      if (!result.ok) { toast.error(result.error ?? 'Erreur'); return }

      // Auto sign in after signup
      await supabase.auth.signInWithPassword({ email, password })
      toast.success('✅ Compte créé! Bienvenue sur Sellio 🚀')
      window.location.href = '/onboarding'
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #1E2D3E', background: '#0C1117',
    color: '#E8EDF2', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C1117' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#0F1721', border: '1px solid #1E2D3E', borderRadius: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px', background: 'linear-gradient(135deg, #1B2D3E, #2A4560)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px rgba(139,154,53,0.4)', fontSize: 22, fontWeight: 800, color: '#8B9A35' }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EDF2' }}>Sell<span style={{ color: '#8B9A35' }}>io</span></div>
          <div style={{ fontSize: 13, color: '#6B7B8D', marginTop: 4 }}>Créez votre compte gratuitement</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Nom de votre boutique" style={inputStyle} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={inputStyle} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe (min. 6 caractères)" type="password" style={inputStyle} />

          <button onClick={handleSignup} disabled={loading} style={{ padding: '13px', borderRadius: 10, background: loading ? '#1E2D3E' : 'linear-gradient(135deg, #8B9A35, #6B7B1A)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? 'Création...' : '🚀 Créer mon compte'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7B8D', marginTop: 8 }}>
            Déjà un compte?{' '}
            <a href="/login" style={{ color: '#8B9A35', textDecoration: 'none' }}>Se connecter</a>
          </div>

          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(139,154,53,0.05)', border: '1px solid rgba(139,154,53,0.15)', fontSize: 12, color: '#6B7B8D', textAlign: 'center' }}>
            🎁 250 crédits offerts à l'inscription
          </div>
        </div>
      </div>
    </div>
  )
}
