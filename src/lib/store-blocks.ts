// Wording of the generic store blocks (benefits, size guide, how to use) and the titles of the
// product rows (featured, new arrivals). Shared by the wizard's phone preview
// (components/store/PhonePreview.tsx) and the public store (components/storefront/kit.tsx), so the
// merchant sees in the wizard what buyers will read. Only what is true of every Sellio store
// (cash on delivery, WhatsApp confirmation, the merchant's own delivery text) or general advice
// for the niche: never a claim about a given product. French (buyer-facing): the preview passes
// these strings through tx() for the dashboard language.
import type { StoreProfile } from './store-api'

export const BLOCK_TITLES = {
  /** Not « Meilleures ventes »: there are no sales figures, it is the merchant's first products. */
  featured: 'Notre sélection',
  new_arrivals: 'Nouveautés',
  benefits: 'Pourquoi commander chez nous',
  size_guide: 'Guide des tailles',
  how_to_use: 'Conseils d’utilisation',
} as const

export type BenefitKey = 'cod' | 'whatsapp' | 'delivery'
export interface BenefitItem { key: BenefitKey; title: string; text: string }

/** « Avantages »: what the buyer gets with this store. `deliveryText`: the merchant's own text, if any. */
export function benefitItems(deliveryText?: string | null): BenefitItem[] {
  return [
    { key: 'cod', title: 'Paiement à la livraison', text: 'Vous payez en espèces à la réception de votre colis. Rien à payer en ligne.' },
    { key: 'whatsapp', title: 'Commande confirmée sur WhatsApp', text: 'Nous vous écrivons sur WhatsApp pour confirmer votre commande avant l’envoi.' },
    { key: 'delivery', title: 'Livraison à votre adresse', text: deliveryText?.trim() || 'Votre colis est livré à l’adresse indiquée dans le formulaire.' },
  ]
}

/** « Guide des tailles »: how to choose, by niche (the sizes themselves come from the products). */
export function sizeGuideIntro(niche: StoreProfile): string {
  switch (niche) {
    case 'enfants': return 'Choisissez selon l’âge de l’enfant. Les tranches d’âge proposées sont celles indiquées sur chaque produit.'
    case 'modeste': return 'Choisissez la taille que vous portez d’habitude, et vérifiez la longueur indiquée sur le produit.'
    case 'streetwear':
    case 'mode': return 'Choisissez la taille ou la pointure que vous portez d’habitude. Les tailles proposées sont celles indiquées sur chaque produit.'
    default: return 'Choisissez la taille que vous portez d’habitude. Les tailles proposées sont celles indiquées sur chaque produit.'
  }
}
/** Last line of the size guide: where to ask when in doubt. */
export const sizeGuideHelp = (hasWhatsapp: boolean) => hasWhatsapp
  ? 'Un doute entre deux tailles ? Demandez-nous sur WhatsApp avant de commander.'
  : 'Un doute ? Indiquez-le lors de la confirmation de votre commande.'

/** « Conseils d’utilisation »: general care advice by niche (the product's own advice is in its description). */
export function howToUseTips(niche: StoreProfile, hasWhatsapp: boolean): string[] {
  return [
    'Lisez la description du produit : les conseils du vendeur y sont indiqués.',
    niche === 'beaute' ? 'Pour un soin de la peau ou des cheveux, faites un essai sur une petite zone avant la première utilisation.'
      : niche === 'beldi' ? 'Conservez les produits naturels au sec, à l’abri de la chaleur et de la lumière.'
        : niche === 'parfums' ? 'Conservez votre parfum à l’abri de la lumière et de la chaleur, flacon bien fermé.'
          : 'Gardez l’emballage le temps de vérifier que tout vous convient.',
    hasWhatsapp ? 'Une question avant ou après la commande ? Écrivez-nous sur WhatsApp.' : 'Une question ? Posez-la lors de la confirmation de votre commande.',
  ]
}
