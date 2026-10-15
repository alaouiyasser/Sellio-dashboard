'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { inputCls } from '@/lib/auth-client'

export function PasswordField({
  value, onChange, placeholder, onEnter, autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onEnter?: () => void
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
        className={`${inputCls} pr-10`} />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
