# Plan technique — Tableau des campagnes avant le Player Studio

**Date :** 2026-09-30
**Branche :** `feat/player-experience-backend` (la branche actuelle, sans nouvelle branche).
**À lire avec :** [`rules.md`](./rules.md) (les règles, prioritaires), [`tasks.md`](./tasks.md) (les tâches), [`pipeline-final.md`](./pipeline-final.md) (le parcours final), [`analyse.md`](./analyse.md) (le constat).
**Rôle de ce document :** la **référence technique**. Il donne les API des composants, les extraits de code, les couleurs et les fichiers. `tasks.md` dit **quoi faire et dans quel ordre** ; en cas de différence, `tasks.md` l'emporte.

---

## Sommaire

1. [Objectif et périmètre](#1-objectif-et-périmètre)
2. [Architecture cible](#2-architecture-cible)
3. [Base shadcn (S1)](#3-base-shadcn-s1)
4. [Composant `DataTable` générique (S2)](#4-composant-datatable-générique-s2)
5. [Page `StudioCampaignsPage` (S3)](#5-page-studiocampaignspage-s3)
6. [Branchement dans `App.tsx` (S4)](#6-branchement-dans-apptsx-s4)
7. [Tests](#7-tests)
   7 bis. [Données de test (S5)](#7-bis-données-de-test-s5)
8. [Risques et parades](#8-risques-et-parades)
9. [Critères d'acceptation globaux](#9-critères-dacceptation-globaux)
10. [Hors périmètre](#10-hors-périmètre)

---

## 1. Objectif et périmètre

**Objectif :** quand la marque clique sur l'élément de menu du Player Studio, elle voit d'abord un **data table shadcn** avec **toutes ses campagnes**. Un clic sur une campagne ouvre le **Studio** sur la configuration de **cette** campagne, où elle peut la modifier. « Fermer » ramène au tableau.

**Dans le périmètre :**

- la base shadcn minimale (Table, Button, Input, Badge, `cn()`), branchée sur le thème du dashboard ;
- un `DataTable` générique (TanStack Table), réutilisable ;
- la page « Player Studio » (tableau, recherche, filtres, tri, pagination, états) ;
- une colonne « Design » (date du dernier enregistrement dans `campaign_experiences`) ;
- le branchement dans `App.tsx` : le tableau d'abord, le Studio ensuite, le retour au tableau ;
- le libellé du menu : « Player Screen » → « Player Studio » ;
- un **seed local additif** de campagnes variées, pour essayer la fonctionnalité (S5).

**Hors périmètre :** voir §10. En particulier, **aucune modification du module `XP/`, de la base de données ni des Edge Functions**.

---

## 2. Architecture cible

### 2.1 Qui affiche quoi

```
App.tsx
 ├─ activeTab === "playerScreen" && studioCampaignId === null
 │     └─ <StudioCampaignsPage>                       ← zone de contenu, menu à gauche
 │           ├─ useExperienceSummaries(organizationId) ← dates des designs (campaign_experiences)
 │           └─ <DataTable columns={studioCampaignColumns} data={rows} onRowOpen={…} />
 │                 └─ shadcn <Table> + TanStack Table (tri, filtre, pagination)
 │
 └─ activeTab === "playerScreen" && studioCampaignId !== null
       └─ <CampaignStudio campaignId={…} onClose={() => setStudioCampaignId(null)} … />   ← plein écran, INCHANGÉ
```

### 2.2 Fichiers

| Fichier                                                 | Tâche | Action   | Rôle                                                                                      |
| ------------------------------------------------------- | ----- | -------- | ----------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`                     | S1    | modifiés | `@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority`             |
| `components.json`                                       | S1    | créé     | Configuration shadcn, écrite à la main (§3.2)                                             |
| `src/lib/utils.ts`                                      | S1    | créé     | `cn()`                                                                                    |
| `src/components/ui/table.tsx`                           | S1    | créé     | shadcn Table                                                                              |
| `src/components/ui/button.tsx`                          | S1    | créé     | shadcn Button (variantes `default`, `outline`, `ghost` ; tailles `sm`, `default`, `icon`) |
| `src/components/ui/input.tsx`                           | S1    | créé     | shadcn Input                                                                              |
| `src/components/ui/badge.tsx`                           | S1    | créé     | shadcn Badge                                                                              |
| `src/index.css`                                         | S1    | modifié  | **Ajout** des couleurs shadcn dans `@theme` (§3.3)                                        |
| `src/components/ui/data-table.tsx`                      | S2    | créé     | `DataTable` générique (§4)                                                                |
| `src/components/ui/data-table.test.tsx`                 | S2    | créé     | Tests                                                                                     |
| `src/components/playerStudio/StudioCampaignsPage.tsx`   | S3    | créé     | La page (§5)                                                                              |
| `src/components/playerStudio/studioCampaignColumns.tsx` | S3    | créé     | Les colonnes (§5.2)                                                                       |
| `src/components/playerStudio/studioCampaignRows.ts`     | S3    | créé     | `Campaign` + résumé du design → ligne du tableau (pur, testé)                             |
| `src/components/playerStudio/useExperienceSummaries.ts` | S3    | créé     | Lecture de `campaign_experiences` (§5.4)                                                  |
| `src/components/playerStudio/*.test.ts(x)`              | S3    | créés    | Tests                                                                                     |
| `src/App.tsx`                                           | S4    | modifié  | État `studioCampaignId`, page ou Studio, libellé du menu (§6)                             |
| `src/App.studio.test.tsx`                               | S4    | créé     | Parcours menu → tableau → Studio → tableau                                                |
| `scripts/studio/seed-studio-campaigns.mjs`              | S5    | créé     | Seed local additif : 14 campagnes, participations, designs (§7 bis)                       |
| `package.json`                                          | S5    | modifié  | Script `studio:seed`                                                                      |
| `docs/DATABASE_AND_TESTING_GUIDE.md`                    | S5    | modifié  | Documente `npm run studio:seed`                                                           |

---

## 3. Base shadcn (S1)

### 3.1 Dépendances (décision D1)

```powershell
npm install @tanstack/react-table clsx tailwind-merge class-variance-authority
```

- Pas de `radix-ui` dans ce lot. Le Button de shadcn importe `Slot` de Radix pour sa prop `asChild` : on **retire** cette prop, inutile ici. C'est l'adaptation la plus simple, notée dans la documentation de S1.
- Taille ajoutée, estimée à environ 20 Ko gzip, chargée seulement avec la page (S4 la charge à la demande).

### 3.2 `components.json` (écrit à la main, **jamais** `shadcn init`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/src/components",
    "ui": "@/src/components/ui",
    "utils": "@/src/lib/utils",
    "lib": "@/src/lib",
    "hooks": "@/src/hooks"
  },
  "iconLibrary": "lucide"
}
```

Si `npx shadcn@latest add table button input badge` est utilisé, **relire le diff** : il ne doit créer que les 4 fichiers de `src/components/ui/`. Il ne doit **rien** changer à `src/index.css` ni à `package.json`, hors des dépendances de D1. Sinon, annuler et copier le code à la main depuis la documentation de shadcn.

### 3.3 Couleurs : ajout dans `@theme` de `src/index.css`

Les composants shadcn utilisent des classes comme `bg-background`, `text-muted-foreground`, `border-input`, `ring-ring`, `bg-primary`. On **ajoute** ces couleurs à la fin du bloc `@theme` existant. Elles pointent sur les variables du dashboard, qui changent déjà entre clair et sombre :

```css
@theme {
  /* …existing tokens, unchanged… */

  /* shadcn/ui tokens, mapped on the dashboard theme (no global base style). */
  --color-background: var(--theme-card);
  --color-foreground: var(--theme-text);
  --color-muted: var(--theme-card-subtle);
  --color-muted-foreground: var(--theme-text-muted);
  --color-border: var(--theme-card-border);
  --color-input: var(--theme-card-border);
  --color-ring: var(--color-brand-accent);
  --color-primary: var(--color-brand-accent);
  --color-primary-foreground: #ffffff;
  --color-accent: var(--theme-card-hover);
  --color-accent-foreground: var(--theme-text);
  --color-secondary: var(--theme-card-subtle);
  --color-secondary-foreground: var(--theme-text);
  --color-destructive: #ef4444;
}
```

- **Aucune** règle ajoutée dans `@layer base`, aucun `:root` réécrit (rules SH1, SH4).
- Vérifié le 2026-09-30 : aucune classe du dashboard n'utilise déjà ces noms (`bg-background`, `bg-primary`…). Les classes existantes `bg-card-bg`, `border-card-border` ne sont pas touchées.
- `--color-primary` reprend le bleu d'accent du dashboard (`#3b82f6`), celui des boutons d'action actuels.

### 3.4 `cn()`

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and lets the last Tailwind class win on conflicts (shadcn/ui helper).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 4. Composant `DataTable` générique (S2)

### 4.1 API

```ts
interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  ariaLabel: string; // accessible name of the table
  getRowId: (row: TData) => string;
  onRowOpen?: (row: TData) => void; // click or Enter on a row
  globalFilter?: string; // text search, controlled by the page
  globalFilterFn?: FilterFn<TData>; // which fields the search reads
  columnFilters?: ColumnFiltersState; // status / game filters, controlled by the page
  initialSorting?: SortingState;
  pageSize?: number; // default 10
  loading?: boolean; // skeleton rows
  emptyState?: ReactNode; // shown when data is empty
  noResultsState?: ReactNode; // shown when filters leave no row
  hiddenColumnsBelow?: Record<string, "sm" | "md" | "lg">; // responsive column hiding
}
```

### 4.2 Comportement

- **TanStack Table** avec `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel` et `getPaginationRowModel`.
- **En-têtes triables :** bouton dans l'en-tête, icône ↑ / ↓ / ↕, `aria-sort` sur le `<th>`.
- **Lignes :** `tabIndex={0}`, `role="button"` seulement si `onRowOpen` est fourni. `onClick` et `onKeyDown` (`Enter`) appellent `onRowOpen`. Focus visible (`focus-visible:ring-2 ring-ring`).
- **Chargement :** 5 lignes fantômes (`animate-pulse`) à la place du corps.
- **Pagination :** « Rows 1–10 of 23 », boutons « Previous » / « Next » (shadcn Button `outline`, `sm`), désactivés aux bornes. Masquée s'il n'y a qu'une page.
- **Conteneur :** `overflow-x-auto` et bordure arrondie. La page ne défile jamais horizontalement ; seul le tableau le peut.
- **Colonnes masquées sous une largeur** (`hiddenColumnsBelow`) : classes `hidden md:table-cell` sur l'en-tête et les cellules de la colonne. Les variantes `sm:` / `md:` / `lg:` sont permises dans le dashboard ; elles ne sont interdites que dans le runtime du module.
- **Aucune connaissance des campagnes :** le composant est générique (réutilisable pour Participants plus tard).
- **Taille visée :** moins de 200 lignes.

---

## 5. Page `StudioCampaignsPage` (S3)

### 5.1 Props

```ts
interface StudioCampaignsPageProps {
  campaigns: Campaign[]; // from useCampaigns (already loaded by App)
  loading: boolean;
  error: string | null;
  organizationId: string | null;
  onOpenCampaign: (campaignId: string) => void;
  onOpenStandalone: () => void;
  onCreateCampaign: () => void; // opens the Wizard (existing "creator" tab)
  onRetry: () => void; // refetch campaigns
}
```

### 5.2 Colonnes (`studioCampaignColumns.tsx`)

| Id        | En-tête  | Cellule                                                                                                                                                                                                                                                        | Tri                       | Masquée sous |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ |
| `name`    | Campaign | Nom (gras) ; nom arabe en dessous (`dir="auto"`, Noto Sans Arabic) s'il existe ; `/play/<slug>` en petit, gris                                                                                                                                                 | alphabétique              | —            |
| `game`    | Game     | Icône lucide et libellé : Spin Wheel, Quiz Challenge, Scratch Card, Mystery Box, Hit It. Mêmes libellés que `GAME_LABELS` du module, recopiés dans une table locale : `GAME_LABELS` n'est pas exporté par `XP/index.ts`, et le module ne doit pas être modifié | —                         | `md`         |
| `status`  | Status   | Badge : Active (vert), Paused (orange), Draft (gris), Archived (gris foncé), **Ended** (gris) si `endDate` est passée et le statut `active`                                                                                                                    | —                         | —            |
| `period`  | Period   | `1 Sep – 30 Sep 2026` (format court, `en-GB`)                                                                                                                                                                                                                  | par date de début         | `lg`         |
| `players` | Players  | `participantsCount`, séparateur de milliers                                                                                                                                                                                                                    | numérique                 | `md`         |
| `design`  | Design   | « Saved » et « 2 h ago » (relatif, `Intl.RelativeTimeFormat`) ou « Default » (badge discret)                                                                                                                                                                   | par date d'enregistrement | `sm`         |
| `open`    | —        | Button `ghost` `sm` « Open » avec icône, qui appelle `onOpenCampaign` (`stopPropagation`)                                                                                                                                                                      | —                         | —            |

**Tri par défaut :** statut (Active, Paused, Draft, puis Archived / Ended), puis date de début, la plus récente d'abord.

### 5.3 Barre d'outils et états

- **Titre :** « Player Studio ». Sous-titre : « Design what players see, campaign by campaign. »
- **Bouton à droite :** « Open standalone demo » (`outline`) → `onOpenStandalone`.
- **Recherche** (Input, icône loupe) : sur le nom, le nom arabe et le slug, sans tenir compte de la casse.
- **Filtres :** deux groupes de boutons compacts (ou `<select>` natifs stylés comme l'Input), sans nouvelle dépendance :
  - Status : All · Active · Paused · Draft · Archived ;
  - Game : All · les 5 jeux.
- **Compteur :** « 12 campaigns », ou « 3 of 12 campaigns » quand un filtre est actif.
- **États :**
  - **chargement** (`loading`) : lignes fantômes ;
  - **erreur** (`error`) : carte « Could not load your campaigns. » et « Retry » → `onRetry` ;
  - **aucune campagne :** « No campaigns yet » et « Create a campaign » → `onCreateCampaign` ;
  - **aucun résultat :** « No campaign matches your filters » et « Clear filters ».

### 5.4 `useExperienceSummaries(organizationId)`

```ts
// Last save of each campaign's Studio design. RLS returns the organization's rows only
// (campaign_experiences, backend task B1.2): no new table, no SQL function.
const { data, error } = await supabase
  .from("campaign_experiences")
  .select("campaign_id, updated_at");
```

- Retourne `{ summaries: Map<campaignId, updatedAt>, loading, error, refetch }`.
- **Une erreur ne bloque pas la page :** la colonne affiche « — » et un `console.warn` (jamais de donnée personnelle).
- **Rechargé** quand la page revient au premier plan (retour du Studio) : `refetch` appelé par `App` à la fermeture du Studio, ou au montage de la page.
- Utilise le client `src/lib/supabase.ts`, comme les autres hooks du dashboard (`src/hooks/`). Le module `XP/` n'est pas concerné.

### 5.5 `studioCampaignRows.ts` (pur)

`toStudioCampaignRow(campaign, summaries, now)` → `{ id, name, arabicName, slug, gameType, status, displayStatus, startDate, endDate, players, designSavedAt }`. Il calcule `displayStatus = "ended"` quand la campagne est `active` mais que sa date de fin est passée. Fonction pure, testée sans React.

---

## 6. Branchement dans `App.tsx` (S4)

### 6.1 État

```ts
// Campaign open in the Studio: null shows the campaigns table (Player Studio page).
// Separate from sandboxCampaignId: the sandbox drawer keeps its own selection.
const [studioCampaignId, setStudioCampaignId] = useState<string | null>(null);
```

| Situation                                                        | Effet                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Clic sur le menu « Player Studio »                               | `handleSidebarNavigate("playerScreen")` → `setStudioCampaignId(null)` → **tableau**               |
| Clic sur une ligne, ou « Open »                                  | `setStudioCampaignId(campaign.id)` → **Studio plein écran**                                       |
| « Open standalone demo »                                         | `setStudioCampaignId(STANDALONE_STUDIO)` → Studio en mode autonome                                |
| « Fermer » dans le Studio (`onClose`)                            | `setStudioCampaignId(null)` → **tableau** (au lieu de l'onglet Campaigns) ; `refetch` des résumés |
| Liste des campagnes en haut du Studio (`onCampaignChange`)       | `setStudioCampaignId(id ?? STANDALONE_STUDIO)` (au lieu de `setSandboxCampaignId`)                |
| « Customize player screen » (Campaigns, espace campagne, Wizard) | `handleOpenPlayerScreenEditor` → `setActiveTab("playerScreen")` et `setStudioCampaignId(camp.id)` |
| Route `/studio` (`initialTab="playerScreen"`)                    | Affiche le **tableau**                                                                            |

### 6.2 Rendu

- La page s'affiche **dans la zone de contenu** (`<main>`), comme les autres onglets, avec l'animation d'entrée des onglets existants.
- Elle est chargée **à la demande** (`lazy`, comme `CampaignStudio`), avec le même indicateur de chargement.
- Le bloc plein écran du Studio garde son code actuel. Sa condition devient `activeTab === "playerScreen" && studioCampaignId !== null`, et `campaignId={studioCampaignId === STANDALONE_STUDIO ? null : studioCampaignId}`.
- `useCampaigns` expose déjà `error` : `App` le lit en plus, pour la page.
- **Libellé du menu :** `t("nav.playerScreen", "Player Studio")`. L'identifiant `playerScreen` et la clé de traduction ne changent pas.

### 6.3 Ce qui ne change pas

- `sandboxCampaignId` et son choix d'office de la 1ʳᵉ campagne : ils ne servent plus qu'au sandbox.
- `studioWizard` (« Edit in campaign settings ») et `handleEditFromStudio`.
- Les props passées à `CampaignStudio` : `backend`, `campaigns`, `prizeTemplates`, `onEditCampaignSettings`, `onRefreshCampaign`.

---

## 7. Tests

| Fichier                                                      | Cas                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/data-table.test.tsx`                      | rendu des lignes ; tri ascendant / descendant et `aria-sort` ; filtre global ; filtre de colonne ; pagination (bornes, libellé) ; clic et `Entrée` → `onRowOpen` ; lignes fantômes ; état vide ; état sans résultat                           |
| `src/components/playerStudio/studioCampaignRows.test.ts`     | ligne construite ; `ended` quand la date de fin est passée ; design absent → `null`                                                                                                                                                           |
| `src/components/playerStudio/useExperienceSummaries.test.ts` | lecture OK → `Map` ; erreur → `Map` vide, sans exception                                                                                                                                                                                      |
| `src/components/playerStudio/StudioCampaignsPage.test.tsx`   | toutes les campagnes affichées ; recherche (nom, slug, nom arabe) ; filtres statut et jeu ; « Clear filters » ; ouverture par ligne et par « Open » ; « Open standalone demo » ; états chargement / erreur + Retry / aucune campagne + Create |
| `src/App.studio.test.tsx`                                    | menu → tableau ; ligne → Studio (faux `CampaignStudio` qui affiche son `campaignId`) ; fermer → tableau ; « Customize player screen » → Studio direct ; le sandbox garde sa propre campagne                                                   |

**Vérifications manuelles (S4) :** clair et sombre ; 1440 px, 1024 px et 390 px de large ; clavier seul ; une vraie campagne locale ouverte, titre modifié, « Saved », fermeture → colonne Design mise à jour.

---

## 7 bis. Données de test (S5)

### 7 bis.1 Pourquoi un seed à part

La base locale n'a aujourd'hui que **4 campagnes** dans l'organisation du compte de test : aucune active dans sa période, et aucune avec un design enregistré. Impossible d'y voir la pagination, les filtres ou la colonne Design.

Le seed existant (`npm run db:seed` → `supabase/seed.sql`) ne convient pas :

- il **efface** les données de l'organisation ;
- il recrée les campagnes avec des identifiants **aléatoires**. Les designs enregistrés (`campaign_experiences`, supprimés avec leur campagne) et les designs du navigateur (rangés par identifiant) seraient perdus.

D'où un seed **additif**, qui ne connaît que ses propres données.

### 7 bis.2 Contenu

| #   | Nom (exemple)                                                   | Jeu          | Statut en base | Période                   | Participations | Design                    |
| --- | --------------------------------------------------------------- | ------------ | -------------- | ------------------------- | -------------- | ------------------------- |
| 1   | Seed · Summer Spin                                              | lucky_wheel  | active         | en cours                  | 42             | Saved · à l'instant       |
| 2   | Seed · Culture Quiz                                             | quiz         | active         | en cours                  | 18             | Saved · il y a 2 h        |
| 3   | Seed · Scratch & Win                                            | scratch_card | active         | en cours                  | 7              | Default                   |
| 4   | Seed · Mystery Gifts                                            | mystery_box  | active         | en cours                  | 0              | Saved · il y a 3 jours    |
| 5   | Seed · Hit the Target                                           | hit_it       | active         | en cours                  | 25             | Default                   |
| 6   | Seed · Back to School                                           | lucky_wheel  | active         | **terminée** (fin passée) | 60             | Saved · il y a 3 semaines |
| 7   | Seed · Ramadan Nights (nom arabe : ليالي رمضان)                 | quiz         | active         | **terminée**              | 33             | Saved · il y a 2 mois     |
| 8   | Seed · Weekend Flash                                            | scratch_card | paused         | en cours                  | 12             | Default                   |
| 9   | Seed · Loyalty Boxes                                            | mystery_box  | paused         | en cours                  | 3              | Saved · hier              |
| 10  | Seed · New Year Draft                                           | lucky_wheel  | draft          | à venir                   | 0              | Default                   |
| 11  | Seed · Hit It Draft                                             | hit_it       | draft          | à venir                   | 0              | Saved · il y a 5 h        |
| 12  | Seed · Spring Wheel 2026                                        | lucky_wheel  | ended          | passée                    | 51             | Saved · il y a 4 mois     |
| 13  | Seed · Old Trivia                                               | quiz         | ended          | passée                    | 20             | Default                   |
| 14  | Seed · Very long campaign name to check truncation in the table | scratch_card | active         | en cours                  | 9              | Default                   |

- **Identifiants fixes** : campagnes `5eed0000-0000-4000-8000-0000000000NN` ; modèle de lot, codes, lots et questions sur le même préfixe ; slugs `seed-…`.
- **Lots jouables** pour les campagnes actives : un modèle « Seed voucher » avec 200 codes `SEED-xxx`, un lot par campagne (quantité 20, avec `prize_inventory`), probabilité de gain 0,5.
- **Questions** pour les quiz (2 chacune), avec leurs bonnes réponses en base. Elles ne sont jamais exposées au joueur : la page publique passe par `get_public_experience`.
- **Participations fictives** : téléphones `0699 0N xx xx`, `participant_name = "Seed player"`, `metadata.source = "studio_seed"`, une part de gagnants avec `prize_id`. Aucune donnée personnelle réelle.
- **Designs** : `createDefaultExperience({ gameType, campaign: buildCampaignSnapshot(campaign, templates), presetId })`, avec un `presetId` différent selon la ligne (`midnight-gold`, `telecom-red`, `clean-light`…). Le titre d'accueil (fr) est « Seed design — <nom> », et `updated_at` est fixé à la date du tableau.

### 7 bis.3 Fonctionnement du script

```
npm run studio:seed                       # (re)create the seed data in studio.test's organization
npm run studio:seed -- --email <email>    # another local account's organization
npm run studio:seed -- --clean            # remove every seed row, nothing else
```

1. **Garde-fous :** `VITE_SUPABASE_URL` doit être local, sinon arrêt (code 2). La clé `service_role` est lue dans `.env.local`, jamais dans `src/`.
2. **Organisation :** lue depuis le profil du compte (`auth.users` → `profiles.organization_id`), avec la clé `service_role`.
3. **Nettoyage d'abord**, toujours filtré sur le préfixe `5eed…`, dans cet ordre (clés étrangères) :
   - `entries` (les `coupon_redemptions` partent avec) ;
   - `campaign_impressions`, `prize_inventory`, `quiz_questions`, `prizes` ;
   - `campaign_experiences`, `campaigns` ;
   - `prize_template_items`, `prize_templates`.
4. **Création** (sauf avec `--clean`) : modèle et codes → campagnes → lots et stock → questions → participations → designs.
5. **Designs sans nouvelle dépendance :**
   - le script démarre un serveur Vite en mode middleware (`createServer({ server: { middlewareMode: true }, appType: "custom" })`) ;
   - il charge `src/features/player-experience/domain/defaults.ts` et `domain/campaign.ts` par `ssrLoadModule` ;
   - puis il ferme le serveur.

   Le module n'est **ni modifié, ni importé** par le code de l'application.

6. **Résumé** en fin de course : les 14 campagnes (slug, statut, design), et le compte avec lequel se connecter.

Le script est en JavaScript (`.mjs`), comme `scripts/backend/*.mjs`, et fait moins de 250 lignes. S'il dépasse, les données partent dans `scripts/studio/seedStudioData.mjs`.

---

## 8. Risques et parades

| Risque                                                                      | Parade                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `shadcn init` / `add` modifie `index.css` et change tout le dashboard       | Pas d'`init` (SH1) ; `add` suivi de la relecture du diff, sinon copie manuelle ; `git diff src/index.css` = ajouts dans `@theme` seulement |
| Couleurs shadcn illisibles en sombre                                        | Tokens branchés sur `--theme-*` (§3.3) ; captures en clair et en sombre                                                                    |
| Alias `@/` sur la racine du dépôt                                           | Alias `@/src/…` dans `components.json` ; typecheck et build                                                                                |
| Test de `App` lourd (beaucoup de hooks)                                     | Simuler les hooks de données et `CampaignStudio` dans ce test seulement ; la logique fine est testée dans la page                          |
| Le Studio change de campagne par sa propre liste, le tableau n'en sait rien | Un seul état, `studioCampaignId`, mis à jour par `onCampaignChange`                                                                        |
| Régression des entrées « Customize player screen »                          | Test du parcours dans `App.studio.test.tsx`                                                                                                |
| Nouveaux avertissements de lint                                             | Lint à chaque tâche ; base de départ : 27 avertissements                                                                                   |
| Le seed efface ou modifie des données qui ne sont pas à lui                 | Préfixe d'identifiants fixe sur **chaque** suppression ; décomptes avant / après dans la recette ; local seulement                         |
| Designs du seed invalides (le Studio les réparerait)                        | Construits par `createDefaultExperience` du module ; contrôle « No issues » à l'ouverture                                                  |

---

## 9. Critères d'acceptation globaux

- [ ] Le menu « Player Studio » affiche le tableau de **toutes** les campagnes de l'organisation, et seulement d'elle.
- [ ] Recherche, filtres (statut, jeu), tri (nom, période, joueurs, design) et pagination marchent.
- [ ] Un clic (ou `Entrée`) sur une ligne ouvre le Studio sur **cette** campagne, avec son design enregistré ; une modification donne « Saved ».
- [ ] « Fermer » ramène au tableau, et la colonne Design montre le nouvel enregistrement.
- [ ] « Open standalone demo » ouvre le Studio autonome.
- [ ] « Customize player screen » (Campaigns, espace campagne, Wizard) ouvre toujours le Studio sur la bonne campagne.
- [ ] Le sandbox garde sa propre campagne.
- [ ] Le dashboard a la même apparence qu'avant, en clair et en sombre ; `src/index.css` ne reçoit que des ajouts dans `@theme`.
- [ ] Le module `XP/` n'est pas modifié (`git diff --stat src/features/player-experience` vide).
- [ ] `npm run studio:seed` est rejouable et `--clean` ne laisse rien ; les autres données sont intactes.
- [ ] La recette complète est faite sur les données du seed (S5).
- [ ] `npm run verify` vert, sans nouvel avertissement de lint.

---

## 10. Hors périmètre

- Adresse par campagne (`/studio/:campaignId`) : plus tard (D5).
- Menus Radix (colonnes à afficher, actions `⋯`), sélection multiple, actions groupées.
- Aperçu miniature du design dans le tableau.
- Création ou duplication d'un design depuis le tableau.
- Pagination côté serveur.
- Réutilisation du `DataTable` dans les autres écrans (Participants…) : possible ensuite, pas dans ce lot.
