# Tâches — Tableau des campagnes avant le Player Studio

**Date :** 2026-09-30
**Règles :** [`rules.md`](./rules.md). Elles l'emportent sur ce fichier en cas de conflit.
**Référence technique :** [`plan.md`](./plan.md) (API, extraits, couleurs). Ce fichier l'emporte sur le plan s'ils diffèrent.
**Parcours final :** [`pipeline-final.md`](./pipeline-final.md) · **Constat :** [`analyse.md`](./analyse.md)
**Branche :** `feat/player-experience-backend` (la branche actuelle).

> **Objectif :** dans le dashboard, l'élément de menu du Player Studio affiche d'abord un **data table shadcn** de **toutes les campagnes** de la marque. Un clic sur une campagne ouvre le **Studio** sur sa configuration, pour la modifier. « Fermer » ramène au tableau.
>
> **Moyens, et rien de plus :** 4 dépendances npm, 4 composants shadcn, 1 `DataTable` générique, 1 page, une vingtaine de lignes dans `App.tsx`, 1 script de données de test (local). **Aucune** modification du module Player Experience, du schéma de la base ou des Edge Functions.

---

## 0. Mode d'emploi

### 0.1 Exécution

- Tu me donnes une tâche ou un lot. Je les fais dans l'ordre ([`rules.md`](./rules.md) R1).
- Chaque tâche a **une documentation** (`tasks_docs/<ID>-<titre>.md`) et **un commit** (le message de la ligne « Commit » de la fiche). Qui commite : décision D6.

### 0.2 Conventions

| Sujet            | Règle                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Branche          | `feat/player-experience-backend` (actuelle), aucune nouvelle branche                       |
| Scopes de commit | `Dashboard` (base shadcn, composants génériques) · `Player-Experience` (page, branchement) |
| Vérification     | `npm run verify` avant chaque commit, plus les commandes de la fiche                       |
| Langue           | Documentation en français ; code, tests, libellés et commits en anglais                    |

### 0.3 Décisions appliquées par défaut

Ce sont les recommandations de l'analyse (§9). Elles sont modifiables avant la tâche concernée : il suffit de me le dire.

| #   | Décision                                          | Valeur retenue                                                                                                                                                                                                                             | Tâche  |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| D1  | Dépendances npm                                   | `@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority`. **Pas** de `radix-ui` dans ce lot                                                                                                                           | S1     |
| D2  | Libellé du menu                                   | « Player Screen » → **« Player Studio »** (identifiant `playerScreen` inchangé)                                                                                                                                                            | S4     |
| D3  | Colonne « Design » (enregistré le … / par défaut) | **Oui**, par une lecture légère de `campaign_experiences` (RLS, aucune migration)                                                                                                                                                          | S3     |
| D4  | Liste des campagnes en haut du Studio             | **Gardée** (le Studio n'est pas modifié) ; elle suit l'état du tableau                                                                                                                                                                     | S4     |
| D5  | Adresse par campagne (`/studio/:campaignId`)      | **Plus tard** (hors périmètre)                                                                                                                                                                                                             | —      |
| D6  | Qui commite                                       | **Par défaut : je propose le message et les fichiers, tu commites.** Si tu me dis « commite toi-même », je commite chaque tâche                                                                                                            | toutes |
| D7  | Branche                                           | **La branche actuelle**, `feat/player-experience-backend` (décidé le 2026-09-30)                                                                                                                                                           | toutes |
| D8  | Données de test                                   | **Un seed à part, additif** (`npm run studio:seed`), pas `npm run db:seed` : ce dernier efface les données de l'organisation et change les identifiants des campagnes, ce qui supprimerait les designs enregistrés (demande du 2026-09-30) | S5     |
| D9  | Organisation remplie par le seed                  | Celle du compte `studio.test@octoreach.local` par défaut ; `--email <compte>` pour une autre organisation locale                                                                                                                           | S5     |

### 0.4 Avancement

| Tâche | Titre                                  | Statut                                       | Commit | Documentation                                       |
| ----- | -------------------------------------- | -------------------------------------------- | ------ | --------------------------------------------------- |
| S0    | Documents de travail et état de départ | Non demandée : état de départ relevé dans S1 | —      | —                                                   |
| S1    | Base shadcn branchée sur le thème      | Terminée (commit à faire)                    | —      | [S1](./tasks_docs/S1-base-shadcn.md)                |
| S2    | Composant `DataTable` générique        | Terminée (commit à faire)                    | —      | [S2](./tasks_docs/S2-composant-data-table.md)       |
| S3    | Page « Player Studio » (tableau)       | Terminée (commit à faire)                    | —      | [S3](./tasks_docs/S3-page-player-studio.md)         |
| S4    | Branchement dans le dashboard          | Terminée (commit à faire)                    | —      | [S4](./tasks_docs/S4-branchement-dashboard.md)      |
| S5    | Données de test et recette finale      | Terminée (commit à faire)                    | —      | [S5](./tasks_docs/S5-donnees-de-test-et-recette.md) |

**Statuts :** À faire · En cours · Terminée · Bloquée

---

## S0 — Documents de travail et état de départ

**Objectif :** partir d'une base connue, avec les documents du travail enregistrés.

**Description :**

- Vérifier la branche (`feat/player-experience-backend`) et un arbre de travail propre.
- Relever l'état de départ, référence de non-régression (R5) :
  - lint : 0 erreur, 27 avertissements attendus ;
  - typecheck ;
  - tests : 89 fichiers, 1000 tests attendus ;
  - build ;
  - taille du bundle principal.
- Captures de référence du dashboard **en clair et en sombre** (Overview, Campaigns, Analytics), pour comparer après S1 et S4.
- Créer `tasks_docs/README.md` (index) et `tasks_docs/S0-etat-de-depart.md`.
- Enregistrer les documents : `analyse.md`, `plan.md`, `tasks.md`, `rules.md`, `pipeline-final.md`.

**Fichiers :** `ai-assistance-prompts-reports/player-studio-campaigns-table/**`
**Dépend de :** —
**Durée :** 0,1 j

**Critères d'acceptation :** l'état de départ est écrit, avec les chiffres réels ; les captures de référence existent.

**Vérification :** `git status`, `npm run verify`
**Commit :** `docs(Player-Experience): plan the campaigns table before the Studio`

---

## S1 — Base shadcn branchée sur le thème

**Objectif :** disposer des composants shadcn nécessaires (Table, Button, Input, Badge) et de `cn()`, **sans aucun changement visible** sur le dashboard.

**Description** (plan §3) :

- `npm install @tanstack/react-table clsx tailwind-merge class-variance-authority` (D1).
- Écrire `components.json` **à la main** (plan §3.2). **Jamais `npx shadcn init`** (rules SH1).
- `src/lib/utils.ts` : `cn()`.
- Ajouter `table`, `button`, `input`, `badge` dans `src/components/ui/` : par `npx shadcn@latest add …` suivi de la relecture du diff, ou par copie manuelle (SH2). Retirer `asChild` / `Slot` du Button (pas de Radix).
- Ajouter les couleurs shadcn **à la fin** du bloc `@theme` de `src/index.css`, branchées sur les `--theme-*` (plan §3.3). Aucun style global (SH4).
- Aucun écran existant n'utilise encore ces composants.

**Fichiers :** `package.json`, `package-lock.json`, `components.json`, `src/lib/utils.ts`, `src/components/ui/{table,button,input,badge}.tsx`, `src/index.css`
**Dépend de :** S0
**Durée :** 0,25 j

**Critères d'acceptation :**

- `git diff src/index.css` ne montre **que** des ajouts dans `@theme` ;
- les captures du dashboard (clair / sombre) sont **identiques** à celles de S0 ;
- les 4 composants se compilent (typecheck, build) ;
- lint sans nouvel avertissement.

**Vérification :** `npm run verify`, comparaison des captures S0
**Commit :** `chore(Dashboard): add the shadcn table primitives`

---

## S2 — Composant `DataTable` générique

**Objectif :** un tableau de données réutilisable (TanStack Table + shadcn Table), avec tri, recherche, filtres, pagination et ouverture d'une ligne, accessible au clavier.

**Description** (plan §4) :

- `src/components/ui/data-table.tsx`, API du plan §4.1 : `columns`, `data`, `ariaLabel`, `getRowId`, `onRowOpen`, `globalFilter`, `globalFilterFn`, `columnFilters`, `initialSorting`, `pageSize`, `loading`, `emptyState`, `noResultsState`, `hiddenColumnsBelow`.
- En-têtes triables avec `aria-sort` ; lignes focalisables, clic et `Entrée` → `onRowOpen` ; lignes fantômes au chargement ; pagination « Rows x–y of n » avec Previous / Next.
- Conteneur `overflow-x-auto` : la page ne défile jamais horizontalement.
- Aucune connaissance des campagnes (générique).

**Fichiers :** `src/components/ui/data-table.tsx`, `src/components/ui/data-table.test.tsx`
**Dépend de :** S1
**Durée :** 0,25 j

**Critères d'acceptation :** les tests du plan §7 (ligne `data-table.test.tsx`) passent : tri et `aria-sort`, filtre global et de colonne, pagination et bornes, clic et `Entrée`, chargement, vide, sans résultat.

**Vérification :** `npx vitest run src/components/ui`, `npm run verify`
**Commit :** `feat(Dashboard): add a reusable data table`

---

## S3 — Page « Player Studio » (tableau des campagnes)

**Objectif :** la page qui liste toutes les campagnes de la marque, prête à être branchée.

**Description** (plan §5) :

- `studioCampaignRows.ts` : `toStudioCampaignRow(campaign, summaries, now)`, pur (statut affiché « Ended » si la date de fin est passée).
- `useExperienceSummaries.ts` : `select campaign_id, updated_at from campaign_experiences` (RLS). Une erreur ne bloque pas la page (D3).
- `studioCampaignColumns.tsx` : Campaign, Game, Status, Period, Players, Design, Open (plan §5.2). Libellés des jeux dans une table locale.
- `StudioCampaignsPage.tsx` :
  - titre, sous-titre, « Open standalone demo » ;
  - recherche (nom, nom arabe, slug) ; filtres statut et jeu ; compteur ;
  - `DataTable` ; tri par défaut (actives d'abord, puis les plus récentes) ; 10 lignes par page ;
  - états chargement, erreur + Retry, aucune campagne + « Create a campaign », aucun résultat + « Clear filters ».
- Même langage visuel que `CampaignsList.tsx` ; clair et sombre ; nom arabe en `dir="auto"`.
- La page n'est **pas encore** branchée dans `App.tsx` (S4).

**Fichiers :** `src/components/playerStudio/{StudioCampaignsPage.tsx, studioCampaignColumns.tsx, studioCampaignRows.ts, useExperienceSummaries.ts}` + tests
**Dépend de :** S2
**Durée :** 0,5 j

**Critères d'acceptation :** les tests du plan §7 (lignes `studioCampaignRows`, `useExperienceSummaries`, `StudioCampaignsPage`) passent ; aucun fichier de plus de 250 lignes ; pas de `any`.

**Vérification :** `npx vitest run src/components/playerStudio`, `npm run verify`
**Commit :** `feat(Player-Experience): list the brand campaigns before opening the Studio`

---

## S4 — Branchement dans le dashboard

**Objectif :** le menu « Player Studio » affiche le tableau. Une ligne ouvre le Studio sur sa campagne, et « Fermer » ramène au tableau.

**Description** (plan §6) :

- `App.tsx` :
  - nouvel état `studioCampaignId` (`null` = tableau), **séparé** de `sandboxCampaignId` ;
  - `activeTab === "playerScreen"` et `studioCampaignId === null` → `StudioCampaignsPage` (chargée à la demande) dans la zone de contenu ;
  - `studioCampaignId !== null` → le bloc Studio plein écran actuel. `campaignId` vient de `studioCampaignId`, `onCampaignChange` met `studioCampaignId` à jour, `onClose` ramène au tableau et recharge les résumés de design ;
  - `handleOpenPlayerScreenEditor` → onglet `playerScreen` + `studioCampaignId = camp.id` ;
  - `handleSidebarNavigate` remet `studioCampaignId` à `null` ;
  - « Open standalone demo » → `STANDALONE_STUDIO` ; « Create a campaign » → onglet du Wizard (`creator`) ;
  - lire aussi `error` de `useCampaigns`, pour la page ;
  - libellé du menu : « Player Studio » (D2).
- Test du parcours : `src/App.studio.test.tsx` (plan §7).
- Contrôle manuel rapide sur les campagnes locales existantes (le tableau s'affiche, une ligne ouvre le Studio, « Fermer » revient). La recette complète se fait en S5, sur les données de test.

**Fichiers :** `src/App.tsx`, `src/App.studio.test.tsx`
**Dépend de :** S3
**Durée :** 0,25 j

**Critères d'acceptation :** tous ceux du plan §9, en particulier :

- clic sur le menu → tableau de toutes les campagnes de l'organisation ;
- ligne → Studio sur **cette** campagne, modification → « Saved » ;
- « Fermer » → tableau, colonne Design à jour ;
- « Customize player screen » → Studio direct sur la bonne campagne ;
- le sandbox garde sa propre campagne ;
- `git diff --stat src/features/player-experience` vide ;
- apparence du dashboard inchangée.

**Vérification :** `npm run verify`, `npx vitest run src/App.studio.test.tsx`, contrôle manuel rapide
**Commit :** `feat(Player-Experience): open the Studio from the campaigns table`

---

## S5 — Données de test et recette finale

**Objectif :** remplir la base **locale** avec des campagnes variées pour essayer vraiment le tableau (plusieurs pages, tous les statuts, les 5 jeux, des designs enregistrés et d'autres par défaut), puis faire la recette complète de la fonctionnalité.

**Description** (plan §7 bis) :

- **Script** `scripts/studio/seed-studio-campaigns.mjs` + script npm `studio:seed` (`node --env-file=.env.local …`) :
  - **local seulement** : il refuse de tourner si `VITE_SUPABASE_URL` n'est pas `http://127.0.0.1:54321` ou `http://localhost:54321` (comme `backend:probe`) ;
  - **additif et rejouable** : identifiants fixes (préfixe `5eed…`) ; relancé, il remplace **seulement** ses propres données ; `--clean` les supprime toutes. Il ne touche **jamais** aux autres campagnes, ne lance pas `supabase/seed.sql`, et ne fait **jamais** de `db reset` ;
  - **organisation cible :** celle de `studio.test@octoreach.local`, ou `--email <compte>` (D9).
- **Contenu** (plan §7 bis.2) : **14 campagnes**, soit 2 pages de tableau.
  - Les 5 jeux, actifs et dans leur période, donc jouables sur `/play/<slug>` : lot, codes coupons, stock ; questions pour le quiz.
  - 2 campagnes actives dont la date de fin est passée (affichées « Ended »), 2 en pause, 2 brouillons, 2 archivées.
  - 1 campagne au nom long, avec un nom arabe.
  - Dates étalées sur 6 mois ; de 0 à ~60 participations fictives par campagne (colonne Players).
  - **Designs :** 8 campagnes sur 14 reçoivent une ligne `campaign_experiences`, construite avec `createDefaultExperience` du module (chargé par Vite, **sans nouvelle dépendance**). Chacune a un titre et un thème différents, et des dates d'enregistrement étalées (à l'instant, il y a 2 h, 3 jours, 3 semaines…). Les 6 autres restent « Default ».
- **Documentation :** ajouter `npm run studio:seed` à `docs/DATABASE_AND_TESTING_GUIDE.md`.
- **Recette complète** (plan §7), sur ces données :
  - clair et sombre ; 1440, 1024 et 390 px de large ; clavier seul ;
  - recherche, chaque filtre, chaque tri, les 2 pages ;
  - une campagne « Default » ouverte, modifiée (« Saved »), puis « Fermer » → sa colonne Design passe à « Saved · just now » ;
  - un design du seed ouvert dans le Studio → badge « No issues » (design valide) ;
  - `/play/<slug>` d'une campagne active du seed : le design s'affiche et une partie passe ;
  - « Customize player screen » depuis Campaigns ; sandbox indépendant ;
  - état vide : le compte `admin@gmail.com` (organisation sans campagne) voit « No campaigns yet ».
- **À la fin :** tu choisis de garder les données de test (pour tes propres essais) ou de les retirer avec `npm run studio:seed -- --clean`.

**Fichiers :** `scripts/studio/seed-studio-campaigns.mjs`, `package.json` (script `studio:seed`), `docs/DATABASE_AND_TESTING_GUIDE.md`, `tasks_docs/S5-…md` (recette)
**Dépend de :** S4
**Durée :** 0,5 j

**Critères d'acceptation :**

- `npm run studio:seed` lancé **deux fois** → toujours exactement 14 campagnes de seed (rejouable) ;
- `npm run studio:seed -- --clean` → 0 donnée de seed restante (campagnes, participations, lots, codes, designs, visites) ; les **autres** campagnes et participations sont **intactes** (décomptes avant / après identiques) ;
- les designs du seed s'ouvrent dans le Studio sans réparation (« No issues ») ;
- toutes les lignes de la recette ci-dessus sont OK, avec leur preuve (captures, requêtes) ;
- `npm run verify` vert, sans nouvel avertissement de lint.

**Vérification :** `npm run studio:seed` (×2), requêtes de décompte, `npm run studio:seed -- --clean`, `npm run verify`, recette manuelle
**Commit :** `chore(Player-Experience): seed local campaigns to try the Studio table`

---

## Récapitulatif

| Tâche     | Titre                             | Durée        | Commit                                                                        |
| --------- | --------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| S0        | Documents et état de départ       | 0,1 j        | `docs(Player-Experience): plan the campaigns table before the Studio`         |
| S1        | Base shadcn branchée sur le thème | 0,25 j       | `chore(Dashboard): add the shadcn table primitives`                           |
| S2        | `DataTable` générique             | 0,25 j       | `feat(Dashboard): add a reusable data table`                                  |
| S3        | Page « Player Studio »            | 0,5 j        | `feat(Player-Experience): list the brand campaigns before opening the Studio` |
| S4        | Branchement dans le dashboard     | 0,25 j       | `feat(Player-Experience): open the Studio from the campaigns table`           |
| S5        | Données de test et recette finale | 0,5 j        | `chore(Player-Experience): seed local campaigns to try the Studio table`      |
| **Total** | **6 tâches**                      | **≈ 1,85 j** |                                                                               |

**Ordre :** celui du tableau ; chaque tâche dépend de la précédente.
**Lot conseillé :** « fais S0 à S5 » d'un bloc, ou S0–S1 d'abord pour valider l'absence de changement visuel, puis S2–S5.
