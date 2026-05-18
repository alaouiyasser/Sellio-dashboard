'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        {/* Mobile header — hidden on desktop via CSS */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <span style={{ fontWeight:800, fontSize:15, color:'#8B9A35' }}>⚡ Sellio</span>
          <div style={{ width:40 }} />
        </div>

        <div style={{ flex:1, overflow:'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
