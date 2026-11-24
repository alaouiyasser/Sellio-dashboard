The merchant dashboard looks generic ("AI generated"). Give it Sellio's own professional look on **every page**, not only Orders. The founder approved a mockup on 24/11. The rules below are that mockup written out, so nothing has to be guessed.

Work in the **Sellio-dashboard** repo, on the branch **`redesign`**. It already holds the carrier logos in `public/carriers/<id>.png`: sendit, ozon, ameex, coliix, aramex, forcelog, tawsilex, quicklivraison, olivraison, chronodiali, speedaf. Read `AGENTS.md` first (Next.js 16).

## 1. Design system (tokens in one place, used everywhere)

- **Theme**: light by default; dark stays available as an option in Paramètres.
  - Page background `#F6F6F8`. Surfaces white `#FFFFFF`, border `#E7E7EC`, row separators `#F2F2F5`.
  - Text `#14141A`, secondary `#6B6B76`, tertiary `#8B8B96`.
- **Brand**: `#1800AD` only for primary actions, the active menu item and selection (active tint `#EEEDFB` / `#F4F3FD`). Yellow `#FFDE59` (soft `#FFF8D6`) for positive money figures: credits, delivered amounts. Never as large backgrounds.
- **Status colours**, as soft badge background + strong text, 10–11px, uppercase, bold:

  | Status | Background | Text |
  |---|---|---|
  | à confirmer | `#FFF4D6` | `#8A5A00` |
  | confirmée | `#E8F6EE` | `#146C43` |
  | expédiée | `#EEEDFB` | `#1800AD` |
  | livrée | `#E8F6EE` | `#146C43` |
  | retour | `#FDECEC` | `#B42318` |
- **Type**: Inter only (the SELLIO wordmark keeps Poppins 800 with the yellow dot on the I). Sizes 12 / 13 (default body) / 14 / 16 / 22 (page titles) / 28 (key figures).
- **Spacing**: 4px scale. **Radius**: 8 for controls, 10–12 for cards, 999 for pills.
- **Buttons**: height 34 (32 small, 44 on mobile primary).
- **Icons**: lucide-react only, stroke 1.8, 16–17px.
- **Zero emoji anywhere in the dashboard UI**, the admin console included. Today emojis remain in: analytics, orders and orders/[id], integrations (Manager + Grid), layout, logs, onboarding, PhoneAuthForm, store-api and PhonePreview. Emojis inside message texts sent to customers on WhatsApp stay.
- **Motion**: 150–200 ms ease on hover, selection and panel open. Skeletons instead of spinners for lists. No bouncing. Respect `prefers-reduced-motion`.
- **Images**: a real product thumbnail (40–48px, radius 8–9) wherever an order or product appears. The carrier logo (20–26px, white tile, 1px border) wherever a carrier or tracking number appears. When there is no product image, use a neutral placeholder icon, never an emoji.

## 2. Shell

- **Top bar** (56px, white):
  - the wordmark;
  - a global search "Rechercher une commande, un client, un numéro de suivi" with a ⌘K hint (it can open the existing search for now);
  - the credits pill: "412 DH · ≈ 9 jours", where days = balance / average daily spend of the last 14 days, hidden when not computable;
  - notifications bell; avatar.
- **Left menu** (232px, white): Tableau de bord, Commandes (count badge), Stock, Retours (count badge), Messages, Analytiques, Rentabilité, Offres, Ma boutique, AI Coach. A "Réglages" group with Livraison, Intégrations, Crédits, Paramètres. On a phone it collapses into a drawer.

## 3. One pattern for every page: summary on top, click → detail

Each page starts with a compact summary: key figures or status tiles, with a period switch Aujourd'hui / Hier / 7 jours / 30 jours where data is dated. Clicking a figure opens the detailed list filtered by it. Example of the approved Orders page:

- A segmented period switch next to the title.
- One white band of 5 status tiles: Nouvelles, Confirmées, Expédiées, Livrées, Retours. Each shows the count, the DH total and a 2–3 word hint ("à confirmer", "chez le livreur"). The active tile has the `#F4F3FD` tint and a 3px `#1800AD` bottom line.
- Below, the list of that status, **grouped by day** ("Aujourd'hui", "Hier", "Il y a 2 jours"). Each row shows:
  - thumbnail, product, `#id · customer · city`;
  - carrier logo + current step;
  - an "IA" chip (`#EEEDFB` / `#1800AD`) or the agent's name (grey chip);
  - amount and time.
- Clicking a row opens a right panel with:
  - the order header (thumbnail, id, amount, client, city);
  - a vertical **parcours** (reçue → confirmée par l'IA / par X → remise au livreur → livrée or retour, with times);
  - the **WhatsApp conversation** as bubbles (customer white, Sellio green `#DCF3D8`).
- No kanban: the look must not resemble other COD tools.

Apply the same pattern, adapted, to Tableau de bord, Analytiques, Rentabilité, Crédits (history grouped by day), Messages, Offres and AI Coach. Intégrations and Livraison become grids of cards with the real carrier logos and a clear connected / not connected state.

## 4. Order of work (separate PRs, each with tsc + build + lint of touched files green)

1. Tokens + shell + zero emoji everywhere.
2. Commandes (list + detail panel) with the pattern above. Read only what the API already returns. If a field is missing (e.g. who confirmed), show nothing rather than inventing it, and list the gaps in the PR.
3. All other merchant pages, then the admin console (same tokens).
4. **Stock and Retours pages + return scan** need API work (stock for every merchant, "retour reçu", lookup by tracking number). They get their own issue: do not build them here, only add the menu entries as "Bientôt".

Never put demo numbers in the real UI. Use real data, or an empty state that says what will appear.
