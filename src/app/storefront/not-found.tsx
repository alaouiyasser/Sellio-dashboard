// Unknown store, offline store, someone else's draft, unknown product: one answer, like the API.
export default function StoreNotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#fff', color: '#1a1f36' }}>
      <div>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>Page introuvable</h1>
        <p style={{ opacity: 0.7, margin: 0 }}>Cette boutique ou ce produit n’existe pas, ou n’est pas en ligne.</p>
      </div>
    </main>
  )
}
