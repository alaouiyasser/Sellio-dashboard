'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b0b0f', color: '#fff', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Une erreur est survenue</h2>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>Veuillez reessayer.</p>
          <button onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1800AD', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reessayer
          </button>
        </div>
      </body>
    </html>
  )
}
