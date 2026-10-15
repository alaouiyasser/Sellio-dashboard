// Answers to onboarding step 1, shared by the wizard (choices) and the founder console (labels).
export const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', ai: 'IA (ChatGPT, Claude)',
  google: 'Google', referral: 'Recommandation', youtube: 'YouTube', other: 'Autre',
}

export const NICHE_LABEL: Record<string, string> = {
  cosmetique: 'Cosmétique', mode: 'Mode', electronique: 'Électronique', complements: 'Compléments',
  maison: 'Maison & déco', alimentaire: 'Alimentaire', autre: 'Autre',
}

export const VOLUME_LABEL: Record<string, string> = {
  '<50': '< 50', '50-200': '50-200', '200-500': '200-500', '500+': '500+',
}

// Accounts created before onboarding owned these answers stored the signup sector text.
const LEGACY_NICHE: Record<string, string> = {
  'Beaute & Cosmetique': 'cosmetique', 'Mode & Vetements': 'mode', 'Electronique': 'electronique',
  'Complements alimentaires': 'complements', 'Maison & Deco': 'maison', 'Alimentaire': 'alimentaire', 'Autre': 'autre',
}
export const nicheKey = (v: string | null | undefined) => (v ? LEGACY_NICHE[v] ?? v : null)

// "tanger", " Tanger " and "TANGER" are the same city.
export const cityKey = (v: string | null | undefined) => {
  const c = v?.trim()
  return c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : null
}
