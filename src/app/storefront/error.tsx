'use client'
// API down or slow: a retry, never the dashboard's error page.
export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#fff', color: '#1a1f36' }}>
      <div>
        <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Boutique momentanément indisponible</h1>
        <p style={{ opacity: 0.7, margin: '0 0 18px' }}>Réessayez dans un instant.</p>
        <button type="button" onClick={reset} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#1a1f36', color: '#fff', font: 'inherit', cursor: 'pointer' }}>Réessayer</button>
      </div>
    </main>
  )
}
