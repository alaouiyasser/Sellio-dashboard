import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { LanguageProvider } from '@/components/layout/LanguageProvider'
import { Toaster } from '@/components/ui/sonner'
import PwaRegister from '@/components/pwa/PwaRegister'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1800AD',
}

export const metadata: Metadata = {
  title: 'Sellio — Dashboard',
  description: 'Gérez vos commandes COD intelligemment',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sellio', statusBarStyle: 'black-translucent' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <body className={geist.className}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-right" />
            <PwaRegister />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
