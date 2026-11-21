'use client'

import Topbar from '@/components/layout/Topbar'
import { useLang } from '@/components/layout/LanguageProvider'
import StoreWizard from '@/components/store/StoreWizard'
import { tx } from '@/lib/i18n'

export default function StorePage() {
  const { t } = useLang()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title={t('nav.store')} subtitle={tx('Créez votre boutique Sellio')} />
      <div style={{ flex: 1, overflow: 'auto', overflowX: 'hidden' }}>
        <StoreWizard />
      </div>
    </div>
  )
}
