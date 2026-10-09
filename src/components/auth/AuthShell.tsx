import { ReactNode } from 'react'
import { Settings } from 'lucide-react'

export function AuthShell({
  subtitle,
  children,
  footer,
}: {
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-start text-3xl font-extrabold tracking-tight text-brand">
            SELL
            <span className="relative">
              I
              <Settings className="absolute left-1/2 -top-2.5 h-3.5 w-3.5 -translate-x-1/2 text-brand-accent" strokeWidth={2.5} />
            </span>
            O
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
