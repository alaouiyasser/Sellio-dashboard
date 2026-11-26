// Sellio's support WhatsApp. No number lives in the code: it comes from NEXT_PUBLIC_SELLIO_SUPPORT_WHATSAPP
// (Vercel; same value as SELLIO_SUPPORT_WHATSAPP of the API), otherwise from GET /api/store/activation,
// which only answers merchants who have a Sellio store.
import { storeApi } from './store-api'
import { waNumber } from './storefront'

export async function supportWhatsapp(): Promise<string | null> {
  const fromEnv = waNumber(process.env.NEXT_PUBLIC_SELLIO_SUPPORT_WHATSAPP)
  if (fromEnv) return fromEnv
  try { return waNumber((await storeApi.activation()).supportWhatsapp) } catch { return null }
}
