# Analyse — Tableau des campagnes avant l'éditeur (Player Studio)

**Date :** 2026-09-30
**Statut :** analyse, **rien n'est codé**. Des décisions t'attendent (§9) avant de commencer.
**Branche de départ :** `feat/player-experience-backend` (dernier commit `5061ee7`).

---

## 1. La demande

> Dans le dashboard, l'élément de menu « Player éditeur » : quand la marque entre, elle voit un **data table shadcn** avec **toutes ses campagnes**. Quand elle clique sur une campagne, l'**éditeur Studio** s'ouvre avec **la configuration de cette campagne**, et elle peut la modifier.

Autrement dit : une **page de liste** s'intercale entre le menu et le Studio.

```
Aujourd'hui :  menu « Player Screen » ──► Studio plein écran (1ʳᵉ campagne choisie d'office)

Demandé :      menu « Player Screen » ──► Tableau des campagnes ──(clic sur une ligne)──► Studio de CETTE campagne
                                                 ▲                                              │
                                                 └───────────────── « Fermer » ─────────────────┘
```

---

## 2. Comment ça marche aujourd'hui

| Élément                       | Où                                                                                          | Constat                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrée du menu                | `src/App.tsx` (liste des éléments du menu, `id: "playerScreen"`, libellé « Player Screen ») | Un onglet parmi d'autres (`TabType`)                                                                                                                                |
| Ouverture du Studio           | `src/App.tsx`, bloc `activeTab === "playerScreen"`                                          | Le Studio (`CampaignStudio`) s'ouvre **tout de suite en plein écran** (`fixed inset-0 z-[100]`)                                                                     |
| Campagne ouverte              | `sandboxCampaignId` dans `App.tsx`                                                          | Au chargement, **la 1ʳᵉ campagne de la liste est choisie d'office**. La marque change de campagne par une liste déroulante en haut du Studio                        |
| État partagé                  | `sandboxCampaignId`                                                                         | Ce **même** état sert au Studio **et** au sandbox (« Interactive Player Sandbox ») : changer de campagne dans l'un la change dans l'autre                           |
| Fermer le Studio              | `onClose={() => setActiveTab("campaigns")}`                                                 | Renvoie vers l'onglet Campaigns                                                                                                                                     |
| Autres entrées vers le Studio | `handleOpenPlayerScreenEditor` (liste des campagnes, espace campagne, Wizard)               | Ouvrent le Studio directement sur une campagne précise                                                                                                              |
| Route `/studio`               | `src/AppRouter.tsx` → `<App initialTab="playerScreen" />`                                   | Ouvre directement le Studio                                                                                                                                         |
| Données des campagnes         | `useCampaigns(orgId)` (déjà appelé dans `App.tsx`)                                          | Nom, slug, type de jeu, statut, dates, `participantsCount`, `rewardsClaimed` : **tout ce qu'il faut pour le tableau est déjà chargé**, sans nouvelle requête        |
| Design enregistré             | Table `campaign_experiences` (B1.2)                                                         | Pas encore lu hors du Studio. Utile pour une colonne « Design : enregistré le … / par défaut »                                                                      |
| Composant Studio              | `XP/studio/CampaignStudio.tsx` (66 lignes)                                                  | Déjà **piloté de l'extérieur** : `campaignId` + `onCampaignChange` + `onClose`. **Aucune modification du Studio n'est nécessaire** pour ouvrir une campagne précise |

**Conclusion :** le Studio sait déjà s'ouvrir sur une campagne donnée. Le travail se fait **autour** de lui : une nouvelle page, et un petit changement d'état dans `App.tsx`.

---

## 3. shadcn dans ce projet : ce qui existe, ce qui manque

**Rien de shadcn n'est installé aujourd'hui :**

| Élément shadcn                                       | Présent ?                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `components.json`, dossier `components/ui/`          | ❌                                                                                                       |
| `@tanstack/react-table` (le moteur du data table)    | ❌                                                                                                       |
| `clsx`, `tailwind-merge` (fonction `cn()`)           | ❌                                                                                                       |
| `class-variance-authority` (variantes Button, Badge) | ❌                                                                                                       |
| Radix (`radix-ui`), pour les menus déroulants        | ❌                                                                                                       |
| Tailwind CSS v4 (`@tailwindcss/vite`)                | ✅ (shadcn le supporte)                                                                                  |
| `lucide-react` (icônes de shadcn)                    | ✅                                                                                                       |
| Alias `@/`                                           | ✅, mais il pointe sur la **racine du dépôt**, pas sur `src/` : il faudra écrire `@/src/components/ui/…` |

**Le « data table » de shadcn n'est pas un composant tout fait.** C'est une recette : le composant `Table` de shadcn (de simples balises `<table>` stylées) et **TanStack Table** pour le tri, le filtre et la pagination. Le code est copié dans le projet, puis adapté.

**Deux points de vigilance :**

1. **Le thème.** Les composants shadcn utilisent des couleurs nommées (`bg-background`, `text-muted-foreground`, `bg-primary`, `border-input`…). Le dashboard a son propre thème (`--color-brand-*`, `--color-card-bg`, clair / sombre par `data-theme` et la classe `.dark`).
   - Il ne faut **pas** laisser `npx shadcn init` réécrire `src/index.css` : il ajoute des styles de base qui changeraient **tout** le dashboard.
   - Il faut **brancher** les couleurs de shadcn sur celles du dashboard, dans `@theme` (par exemple `--color-background: var(--theme-bg)`, `--color-muted-foreground: var(--theme-text-muted)`), **sans** style de base global.
   - Aujourd'hui, aucune classe du dashboard n'utilise ces noms (vérifié) : pas de collision.
2. **Les nouvelles dépendances npm demandent ton accord** (règle des documents de travail) : `@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority`. Et `radix-ui` seulement si on veut les menus (colonnes à afficher, actions `⋯`).

---

## 4. Proposition d'interface

### 4.1 La page « Player Studio »

Elle s'affiche **dans la zone de contenu du dashboard**, avec le menu à gauche, comme les autres onglets. Elle n'est pas en plein écran.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Player Studio                                                  [ Open standalone demo ]  │
│ Design what players see for each campaign.                                               │
│                                                                                          │
│ [🔍 Search campaigns…      ]  [Status ▾]  [Game ▾]                          12 campaigns  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Campaign ↕               Game          Status     Period ↕           Players ↕  Design│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Summer Wheel             🎡 Wheel      ● Active   1 Sep – 30 Sep       1 204   Saved  │ │
│ │ /play/summer-wheel                                                           2 h ago │ │
│ │ Ramadan Quiz             ❓ Quiz       ◐ Paused   12 Mar – 10 Apr        318   Default│ │
│ │ …                                                                                    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                  Rows 1–10 of 12     ‹ Prev   Next ›      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

| Colonne  | Contenu                                                                      | Tri | Source                        |
| -------- | ---------------------------------------------------------------------------- | --- | ----------------------------- |
| Campaign | Nom (et nom arabe en `dir="auto"` s'il existe), lien `/play/<slug>` en petit | ✅  | `useCampaigns`                |
| Game     | Icône et nom du jeu (Wheel, Quiz, Scratch card, Mystery box, Hit It)         | —   | `useCampaigns`                |
| Status   | Badge Active / Paused / Draft / Archived                                     | —   | `useCampaigns`                |
| Period   | Du … au …, « Ended » si la date est passée                                   | ✅  | `useCampaigns`                |
| Players  | Nombre de participations                                                     | ✅  | `useCampaigns`                |
| Design   | « Saved · il y a 2 h » ou « Default » (jamais ouvert dans le Studio)         | ✅  | `campaign_experiences` (§5.3) |

- **Barre d'outils :** recherche par nom ou slug ; filtre par statut ; filtre par jeu ; compteur.
- **Tri** au clic sur l'en-tête. Par défaut : les campagnes actives d'abord, puis les plus récentes.
- **Pagination :** 10 lignes par page, côté navigateur (une marque a quelques dizaines de campagnes, pas des milliers).
- **Clic sur une ligne** (ou `Entrée` au clavier) → le Studio s'ouvre en plein écran sur **cette** campagne.
- **Bouton « Open standalone demo »** : garde l'accès au Studio sans campagne (mode autonome actuel).
- **États :**
  - chargement : lignes fantômes ;
  - erreur : message et « Retry » ;
  - aucune campagne : « No campaigns yet » et « Create a campaign », qui ouvre le Wizard ;
  - aucun résultat de recherche : « No campaign matches ».
- **Clair et sombre :** mêmes couleurs que le reste du dashboard (§3).
- **Petit écran :** le tableau défile horizontalement (conteneur de shadcn) ; les colonnes secondaires (Period, Players) se masquent sous une certaine largeur.
- **Libellés en anglais** (règle 5 de `CLAUDE.md`), via `t()` comme le reste du dashboard.

### 4.2 Le Studio

- Il s'ouvre en plein écran, **sur la campagne choisie**, avec son design enregistré (déjà le cas : `createStudioServices` → Supabase).
- **« Fermer »** ramène au **tableau**, et non plus à l'onglet Campaigns.
- La liste déroulante des campagnes, en haut du Studio, **reste** : on peut changer de campagne sans revenir au tableau. Elle peut être masquée si tu préfères (question §9).
- Les autres entrées (« Customize player screen » depuis Campaigns, l'espace campagne ou le Wizard) ouvrent **directement** le Studio sur leur campagne, comme aujourd'hui. « Fermer » ramène alors au tableau.

---

## 5. Architecture technique

### 5.1 Fichiers

| Fichier                                                               | Action  | Rôle                                                                                                                         |
| --------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                        | modifié | `@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority` (+ `radix-ui` si menus) — **après ton accord** |
| `components.json`                                                     | créé    | Configuration shadcn (style, alias `@/src/components/ui`, `@/src/lib/utils`, Tailwind v4, **sans** réécriture du CSS)        |
| `src/lib/utils.ts`                                                    | créé    | `cn()` (clsx + tailwind-merge)                                                                                               |
| `src/components/ui/table.tsx`, `button.tsx`, `input.tsx`, `badge.tsx` | créés   | Composants shadcn copiés (code de shadcn, dans le dépôt)                                                                     |
| `src/components/ui/data-table.tsx`                                    | créé    | Tableau générique TanStack : tri, filtre, pagination, clic sur une ligne. Réutilisable ailleurs (Participants…)              |
| `src/index.css`                                                       | modifié | Couleurs shadcn branchées sur le thème du dashboard, dans `@theme` uniquement                                                |
| `src/components/playerStudio/StudioCampaignsPage.tsx`                 | créé    | La page : titre, barre d'outils, tableau, états vide / chargement / erreur                                                   |
| `src/components/playerStudio/studioCampaignColumns.tsx`               | créé    | Définition des colonnes (rendu des cellules, tri)                                                                            |
| `src/components/playerStudio/useExperienceSummaries.ts`               | créé    | Date du dernier enregistrement du design, par campagne (§5.3)                                                                |
| `src/App.tsx`                                                         | modifié | Afficher la page dans la zone de contenu ; ouvrir le Studio seulement quand une campagne est choisie ; « Fermer » → tableau  |
| tests (`*.test.tsx`)                                                  | créés   | Page, colonnes, et un test du parcours dans `App`                                                                            |

**Le module `XP/` n'est pas modifié** : le Studio, le runtime et le domaine restent tels quels (zones protégées). La page n'importe du module que ce qu'exporte `XP/index.ts`, et seulement si besoin.

### 5.2 L'état dans `App.tsx`

Aujourd'hui, `activeTab === "playerScreen"` veut dire « Studio ouvert ». Proposition :

```ts
// null = the campaigns table is shown; a campaign id or STANDALONE_STUDIO = the Studio is open
const [studioCampaignId, setStudioCampaignId] = useState<string | null>(null);
```

- `activeTab === "playerScreen"` et `studioCampaignId === null` → **le tableau**, dans la zone de contenu.
- `studioCampaignId !== null` → **le Studio** en plein écran, avec `campaignId={studioCampaignId}`.
- `onClose` du Studio → `setStudioCampaignId(null)`, retour au tableau.
- `handleOpenPlayerScreenEditor(camp)` → `setActiveTab("playerScreen")` et `setStudioCampaignId(camp.id)`.
- **Séparer cet état de `sandboxCampaignId`.** Le Studio et le sandbox ne se modifient plus l'un l'autre, et la règle « la 1ʳᵉ campagne choisie d'office » ne concerne plus que le sandbox.

`App.tsx` fait déjà 881 lignes : la page vit dans son propre fichier. `App.tsx` ne reçoit que l'état et une dizaine de lignes de branchement.

### 5.3 La colonne « Design »

- Une requête légère : `select campaign_id, updated_at from campaign_experiences`. RLS ne renvoie que les campagnes de l'organisation (B1.2). Pas de nouvelle table ni de fonction SQL.
- Rechargée au retour du Studio : la date change dès qu'on a modifié le design.
- **Sans cette colonne**, le tableau marche quand même. C'est une option (question §9) : elle dit à la marque quelles campagnes ont déjà un design, et lesquelles montrent encore le design par défaut aux joueurs.

### 5.4 Route `/studio`

- `/studio` ouvre l'onglet : il affichera donc **le tableau**. C'est cohérent avec la demande.
- Option (question §9) : une adresse propre à chaque campagne, `/studio/:campaignId`, pour garder la campagne ouverte après un rechargement et partager le lien. Aujourd'hui le dashboard ne met pas les onglets dans l'adresse : ce serait nouveau.

---

## 6. Non-régression

| Ce qui marche aujourd'hui                                 | Comment on le garde                                                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Studio : enregistrement Supabase, conflit, images, import | Studio non modifié ; ouvert avec les mêmes props (`backend`, `campaignId`)                                                        |
| « Edit in campaign settings » → Wizard sur le Studio      | Inchangé (`studioWizard` dans `App.tsx`)                                                                                          |
| Sandbox « Interactive Player Sandbox »                    | Garde son propre état (`sandboxCampaignId`)                                                                                       |
| Entrées « Customize player screen »                       | Ouvrent toujours le Studio sur leur campagne                                                                                      |
| Studio autonome (démo)                                    | Bouton « Open standalone demo » sur la page                                                                                       |
| Apparence du dashboard                                    | Pas de style de base shadcn global ; couleurs branchées sur `--theme-*` ; aucune classe existante renommée                        |
| Tests existants                                           | Aucun test du module touché. Les tests de `App` qui ouvrent le Studio devront passer par le tableau (changement voulu, documenté) |

---

## 7. Risques et parades

| Risque                                                                      | Parade                                                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn init` réécrit `index.css` et change tout le dashboard               | Ne pas lancer `init`. Écrire `components.json` à la main, ajouter les composants un par un (`shadcn add` ou copie), relire le diff du CSS |
| Couleurs shadcn illisibles en mode sombre                                   | Couleurs branchées sur `--theme-*`, qui changent déjà avec `data-theme` ; contrôle visuel en clair **et** en sombre                       |
| Alias `@/` sur la racine du dépôt (et non `src/`)                           | Alias de `components.json` : `@/src/components/ui`, `@/src/lib/utils` ; vérifié par typecheck et build                                    |
| Poids du bundle                                                             | TanStack Table ≈ 15 Ko gzip ; la page est chargée à la demande (`lazy`), comme le Studio                                                  |
| Clic sur une ligne, peu accessible au clavier                               | Ligne focalisable, `Entrée` ouvre, lien explicite « Open » dans la dernière cellule                                                       |
| Double source de vérité de la campagne ouverte (tableau et liste du Studio) | Un seul état (`studioCampaignId`) : la liste du Studio le modifie par `onCampaignChange`                                                  |

---

## 8. Plan de travail proposé

| #   | Tâche                                                                                                                    | Durée  | Commit proposé                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| S1  | Installer la base shadcn (deps, `components.json`, `cn()`, couleurs, Table/Button/Input/Badge) sans changer le dashboard | 0,25 j | `chore(Dashboard): add the shadcn table primitives`                           |
| S2  | Composant générique `DataTable` (TanStack : tri, filtre, pagination, clic de ligne) + tests                              | 0,25 j | `feat(Dashboard): add a reusable data table`                                  |
| S3  | Page `StudioCampaignsPage` + colonnes + états + colonne Design + tests                                                   | 0,5 j  | `feat(Player-Experience): list the brand campaigns before opening the Studio` |
| S4  | Branchement dans `App.tsx` (état séparé, ouverture, retour au tableau, entrées existantes) + test du parcours            | 0,25 j | `feat(Player-Experience): open the Studio from the campaigns table`           |
| S5  | Vérification : clair / sombre, petits écrans, clavier, `npm run verify`, recette manuelle                                | 0,25 j | (dans S4)                                                                     |

**Total ≈ 1,5 jour.**

**Critères d'acceptation :**

- Le menu « Player Screen » affiche le tableau de **toutes** les campagnes de l'organisation, et d'aucune autre.
- Recherche, filtres, tri et pagination marchent.
- Un clic (ou `Entrée`) ouvre le Studio sur **cette** campagne, avec son design enregistré. Une modification est enregistrée (« Saved »).
- « Fermer » ramène au tableau, et la colonne Design est à jour.
- « Customize player screen » depuis Campaigns ouvre toujours le Studio sur la bonne campagne.
- Le sandbox n'est pas affecté.
- Le dashboard a la même apparence qu'avant, en clair et en sombre.
- `npm run verify` vert, sans nouvel avertissement de lint.

---

## 9. Décisions à prendre par toi

1. **Dépendances :** tu autorises `@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority` ? Et `radix-ui`, pour un menu « colonnes » et un menu d'actions `⋯` ?
   _Recommandation : oui aux quatre premières. `radix-ui` plus tard, seulement si on veut ces menus._
2. **Libellé du menu :** garder « Player Screen », ou le renommer « Player Studio » (ou « Player Editor ») ?
   _Recommandation : « Player Studio », le nom de l'écran._
3. **Colonne « Design »** (enregistré / par défaut, date) : on l'inclut ?
   _Recommandation : oui, c'est une requête légère et une vraie information pour la marque._
4. **Liste des campagnes en haut du Studio :** on la garde (changer de campagne sans revenir), ou le Studio ne montre que la campagne choisie ?
   _Recommandation : la garder, pour ne pas toucher au Studio._
5. **Adresse par campagne** (`/studio/:campaignId`) : maintenant, ou plus tard ?
   _Recommandation : plus tard. Le dashboard ne met aucun onglet dans l'adresse aujourd'hui._
6. **Règles de travail :** mêmes règles que le branchement Supabase (documentation par tâche en français, un commit par tâche fait par moi), ou tu commites toi-même ?

Dès que tu as répondu, je commence par S1.
