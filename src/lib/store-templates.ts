// Ready-made category structures per niche (screen 1 of the categories step). Names are French
// keys passed through tx(), so the merchant sees them in ONE language: the dashboard language.
import type { StoreProfile } from './store-api'

/** A main category (rayon) and its sub-categories. */
export interface TplNode { name: string; kids?: string[] }

/** Structure A of each niche (a tree). Structure B is the niche's flat list (profile.categories). */
export const TREE_TEMPLATES: Partial<Record<StoreProfile, TplNode[]>> = {
  streetwear: [{ name: 'Homme', kids: ['Hoodies', 'T-shirts', 'Sneakers'] }, { name: 'Femme', kids: ['Hoodies', 'T-shirts', 'Sneakers'] }],
  mode: [{ name: 'Femme', kids: ['Vêtements', 'Chaussures', 'Sacs'] }, { name: 'Homme', kids: ['Vêtements', 'Chaussures'] }, { name: 'Accessoires' }],
  modeste: [{ name: 'Vêtements', kids: ['Abayas', 'Djellabas', 'Kaftans', 'Ensembles'] }, { name: 'Hijabs' }],
  parfums: [{ name: 'Homme', kids: ['Parfums', 'Décants'] }, { name: 'Femme', kids: ['Parfums', 'Décants'] }, { name: 'Coffrets' }],
  beaute: [{ name: 'Soins', kids: ['Visage', 'Corps', 'Cheveux'] }, { name: 'Maquillage' }, { name: 'Coffrets' }],
  beldi: [{ name: 'Soins naturels', kids: ['Huiles', 'Savon et ghassoul'] }, { name: 'Épicerie', kids: ['Miel et amlou', 'Épices', 'Plantes'] }],
  bijoux: [{ name: 'Homme', kids: ['Montres', 'Bracelets'] }, { name: 'Femme', kids: ['Montres', 'Bijoux'] }],
  maison: [{ name: 'Cuisine', kids: ['Ustensiles', 'Vaisselle'] }, { name: 'Maison', kids: ['Décoration', 'Rangement', 'Linge de maison'] }],
  enfants: [{ name: 'Bébé', kids: ['Vêtements', 'Puériculture'] }, { name: 'Enfants', kids: ['Fille', 'Garçon', 'Jouets'] }],
  gadgets: [{ name: 'Téléphone', kids: ['Coques', 'Chargeurs'] }, { name: 'Audio', kids: ['Écouteurs', 'Enceintes'] }, { name: 'Montres connectées' }],
  auto: [{ name: 'Mécanique', kids: ['Freinage', 'Moteur', 'Filtres'] }, { name: 'Extérieur', kids: ['Éclairage', 'Carrosserie'] }, { name: 'Accessoires' }],
}

/** Same name? Case, accents and extra spaces are ignored. */
export const normName = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
