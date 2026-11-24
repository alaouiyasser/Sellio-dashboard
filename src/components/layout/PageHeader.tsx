/** Page title row inside the shell (22px title, 13px subtitle). The global bar is in AppShell. */
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: '20px 24px 4px', flexShrink: 0 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>{title}</h1>
      {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  )
}
