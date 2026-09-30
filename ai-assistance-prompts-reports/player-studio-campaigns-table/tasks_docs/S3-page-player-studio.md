# S3 — Page « Player Studio » (tableau des campagnes)

| Champ       | Valeur                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Statut      | Terminée                                                                                                      |
| Dépend de   | S2                                                                                                            |
| Démarrée le | 2026-09-30                                                                                                    |
| Terminée le | 2026-09-30                                                                                                    |
| Fiche       | tasks.md, S3 · plan, §5                                                                                       |
| Commit      | `feat(Player-Experience): list the brand campaigns before opening the Studio` — **à faire par toi** (D6, §12) |

## 1. Objectif

La page qui liste toutes les campagnes de la marque (recherche, filtres, tri, pagination, colonne Design), prête à être branchée dans `App.tsx` en S4. Un clic sur une campagne appelle `onOpenCampaign(id)` : c'est S4 qui ouvrira le Studio.

## 2. Avant / après

- **Avant :** aucune vue d'ensemble des campagnes côté Studio. Le menu ouvre directement le Studio sur la 1ʳᵉ campagne.
- **Après :** le composant `StudioCampaignsPage` existe, testé et contrôlé à l'écran. Il n'est **pas encore affiché** dans l'application : c'est S4.

```
StudioCampaignsPage (props : campaigns, loading, error, organizationId, onOpenCampaign, …)
 ├─ useExperienceSummaries(organizationId) ──► select campaign_id, updated_at from campaign_experiences
 ├─ toStudioCampaignRows(campaigns, savedAt, now)   : lignes + ordre par défaut          (studioCampaignRows.ts)
 ├─ StudioCampaignsToolbar : recherche, filtres statut / jeu, compteur               (StudioCampaignsToolbar.tsx)
 └─ DataTable (S2) + studioCampaignColumns : Campaign, Game, Status, Period, Players, Design, Open
                                  cellules et formats                               (studioCampaignCells.tsx)
```

## 3. Plan de travail

- [x] Conversion campagne → ligne (pure), statut « Ended », ordre par défaut, recherche, filtre de statut
- [x] Lecture des dates d'enregistrement des designs (`useExperienceSummaries`)
- [x] Colonnes et cellules
- [x] Page : en-tête, barre d'outils, tableau, 4 états
- [x] 21 tests
- [x] Découpage (2 fichiers dépassaient 250 lignes)
- [x] Contrôle visuel : clair / sombre, 4 largeurs, clavier, états ; 3 corrections (§5.6)
- [x] Suite complète, build, empreinte du dashboard

## 4. Fichiers créés et modifiés

| Fichier                                                                                | Créé / modifié | Rôle                                                                                      | Lignes |
| -------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- | ------ |
| `src/components/playerStudio/studioCampaignRows.ts`                                    | créé           | Campagne → ligne ; statut affiché ; ordre par défaut ; recherche ; filtre de statut (pur) | 104    |
| `src/components/playerStudio/useExperienceSummaries.ts`                                | créé           | Dates du dernier enregistrement des designs (Supabase, RLS)                               | 63     |
| `src/components/playerStudio/studioCampaignCells.tsx`                                  | créé           | Libellés et icônes des jeux, badges de statut, formats de dates, cellules                 | 194    |
| `src/components/playerStudio/studioCampaignColumns.tsx`                                | créé           | Les 7 colonnes du tableau (tri, filtres)                                                  | 111    |
| `src/components/playerStudio/StudioCampaignsToolbar.tsx`                               | créé           | Recherche, filtre de statut, filtre de jeu, compteur                                      | 103    |
| `src/components/playerStudio/StudioCampaignsPage.tsx`                                  | créé           | La page                                                                                   | 199    |
| `src/components/playerStudio/studioCampaignRows.test.ts`                               | créé           | 7 tests                                                                                   | 150    |
| `src/components/playerStudio/useExperienceSummaries.test.ts`                           | créé           | 4 tests                                                                                   | 67     |
| `src/components/playerStudio/StudioCampaignsPage.test.tsx`                             | créé           | 10 tests                                                                                  | 219    |
| `src/components/ui/data-table.tsx`, `data-table-parts.tsx`, `data-table.test.tsx` (S2) | modifiés       | Colonnes masquées selon la largeur du tableau, espacement, lignes fantômes (§5.6)         | —      |

## 5. Le code expliqué

### 5.1 `studioCampaignRows.ts` (pur)

- **`displayStatusOf(campaign, now)`** : une campagne `active` dont la date de fin est passée s'affiche **« Ended »** (elle ne se joue plus). Les autres statuts restent tels quels : `active`, `paused`, `draft`, `archived`. `useCampaigns` transforme déjà le statut `ended` de la base en `archived`.
- **`toStudioCampaignRows(campaigns, savedAt, now)`** : l'ordre par défaut du tableau.
  1. Par statut : Active, Paused, Draft, Ended, Archived ;
  2. puis par date de début, la plus récente d'abord.

  Un clic sur un en-tête trie autrement. Au 3ᵉ clic, le tri s'annule et cet ordre revient.

- **`matchesStudioSearch(row, query)`** : nom, nom arabe ou slug, sans tenir compte de la casse.
- **`matchesStatusFilter(row, filter)`** : le filtre « Ended » regroupe les campagnes terminées par la date **et** les archivées. Les deux ne se jouent plus.

La date `now` est un paramètre : la règle « Ended » se teste sans horloge.

### 5.2 `useExperienceSummaries(organizationId, client = supabase)`

```ts
const { data, error } = await client
  .from("campaign_experiences")
  .select("campaign_id, updated_at");
```

- **RLS** (tâche B1.2 du backend) ne renvoie que les designs de l'organisation du membre connecté : aucune table ni fonction SQL nouvelle.
- **Renvoie** `{ savedAt: Map<campagne, date>, loading, failed, refetch }`. Le plan (§5.4) parlait de `summaries` et `error` ; les noms `savedAt` et `failed` disent mieux ce qu'ils contiennent.
- **Une erreur ne bloque jamais la page** : la carte est vide (toutes les lignes affichent « Default »), et un `console.warn` donne le message d'erreur, jamais une donnée personnelle.
- **Pas d'organisation** (`null`) : aucune requête.
- **Rechargement :** la page est démontée pendant que le Studio est ouvert (S4), donc elle relit les dates à chaque retour du Studio, sans code de plus.
- **Le client est un paramètre** : les tests passent un faux client, sans réseau.

### 5.3 Les colonnes (`studioCampaignColumns.tsx`) et les cellules (`studioCampaignCells.tsx`)

| Colonne  | Contenu                                                                                            | Tri                                            | Filtre    | Masquée si le tableau fait moins de |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------- | ----------------------------------- |
| Campaign | Nom (tronqué, complet au survol), nom arabe (`dir="auto"`), `/play/<slug>`                         | alphabétique                                   | recherche | —                                   |
| Game     | Icône et libellé, **les mêmes que la liste Campaigns** (`CampaignsList.tsx`)                       | —                                              | jeu       | 56 rem (`md`)                       |
| Status   | Badge coloré : Active (vert), Paused (orange), Draft, Ended, Archived (gris)                       | —                                              | statut    | —                                   |
| Period   | « 1 Sep – 30 Sep 2026 », ou avec les deux années si elles diffèrent                                | date de début                                  | —         | 72 rem (`xl`)                       |
| Players  | Participations, séparateur de milliers, aligné à droite                                            | numérique                                      | —         | 64 rem (`lg`)                       |
| Design   | « Saved » + « 2 hours ago » (date exacte au survol), ou badge « Default »                          | date d'enregistrement ; « Default » en dernier | —         | 42 rem (`sm`)                       |
| (Open)   | Bouton « Open → » ; flèche seule quand le tableau est étroit. Nom accessible : « Open <campagne> » | —                                              | —         | —                                   |

- Les libellés des jeux passent par les clés déjà utilisées par la liste Campaigns (`campaigns.spinWheel`…). Les autres textes utilisent de nouvelles clés `playerStudio.*`, avec leur texte anglais par défaut (`t(clé, "texte")`, comme le reste du dashboard).
- Les couleurs des badges sont les mêmes classes Tailwind que la liste Campaigns, avec leur variante `dark:` (règles SH7).
- `GAME_LABELS` du module Player Experience n'est pas exporté par son `index.ts` ; le module ne doit pas être modifié. D'où une table locale.

### 5.4 La barre d'outils (`StudioCampaignsToolbar.tsx`)

- **Recherche** : champ `type="search"`, avec une loupe.
- **Statut** : groupe de boutons All · Active · Paused · Draft · Ended (`role="group"`, `aria-pressed` sur le bouton actif).
- **Jeu** : `<select>` natif stylé comme les champs shadcn. Un menu déroulant shadcn demanderait Radix (D1).
- **Compteur** annoncé aux lecteurs d'écran (`aria-live="polite"`) : « 14 campaigns », ou « 3 of 14 campaigns » quand un filtre est actif.

### 5.5 La page (`StudioCampaignsPage.tsx`)

| État            | Affichage                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Chargement      | Barre d'outils, et 5 lignes fantômes dans le tableau                                             |
| Erreur          | Carte « Could not load your campaigns. » + « Retry » (`onRetry`) ; pas de tableau                |
| Aucune campagne | « No campaigns yet », une phrase d'aide, « Create a campaign » (`onCreateCampaign`)              |
| Aucun résultat  | « No campaign matches your filters » + « Clear filters » (vide la recherche et les deux filtres) |
| Normal          | Le tableau ; clic, `Entrée` ou « Open » → `onOpenCampaign(id)`                                   |

En tête de page : « Player Studio », un sous-titre, et « Open standalone demo » (`onOpenStandalone`).

### 5.6 Corrections faites pendant le contrôle visuel

La page n'étant pas encore dans l'application, je l'ai affichée dans une **page d'aperçu temporaire** : `s3-preview.html` et `src/s3Preview.tsx`, avec 14 campagnes d'exemple. Les deux fichiers ont été **supprimés** après les captures et n'apparaissent pas dans `git status`.

| Constat                                                                                                              | Correction                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| À 1 024 px, le tableau débordait de 151 px. Sur téléphone, les colonnes Status et Open sortaient de l'écran (235 px) | Colonnes masquées selon la largeur **du tableau** (`@container`), et non celle de l'écran ; largeur du nom adaptée (11 → 16 → 22 rem) |
| Sur téléphone, il restait 59 px de défilement                                                                        | Espacement `px-3` sur tableau étroit, flèche seule pour « Open »                                                                      |
| Lignes fantômes presque invisibles en clair                                                                          | Gris `muted-foreground` à 15 %                                                                                                        |

**Vérifié, et pas un défaut :** le focus clavier d'une ligne semblait invisible à la 1ʳᵉ mesure. Elle avait été prise pendant la transition de couleur (150 ms). Mesuré après : fond `muted` et anneau bleu de 2 px, bien visibles sur la capture.

## 6. Décisions et alternatives

| Décision                                                   | Alternative écartée                                  | Raison                                                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordre par défaut calculé par la page (données déjà triées) | Tri initial TanStack sur Status + Period (plan §5.2) | TanStack ignore le tri d'une colonne non triable (Status). Avec des données déjà triées, le 3ᵉ clic sur un en-tête revient naturellement à cet ordre |
| Filtre « Ended » = terminées par la date + archivées       | Deux filtres « Ended » et « Archived »               | Pour la marque, les deux veulent dire « ne se joue plus » ; les badges restent distincts                                                             |
| `<select>` natif pour le jeu                               | Menu déroulant shadcn                                | Il demanderait Radix, hors de D1                                                                                                                     |
| Table locale des libellés de jeux                          | Exporter `GAME_LABELS` du module                     | Le module ne doit pas être modifié (règles §3.1)                                                                                                     |
| `savedAt` / `failed` dans `useExperienceSummaries`         | `summaries` / `error` (plan)                         | Noms plus explicites ; aucune autre différence                                                                                                       |
| Colonnes masquées selon la largeur du tableau              | Selon l'écran                                        | Défaut constaté à l'écran (§5.6)                                                                                                                     |

## 7. Tests

| Fichier                          | Tests | Ce qu'il vérifie                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `studioCampaignRows.test.ts`     | 7     | ligne construite ; design absent → `null` ; « Ended » après la date de fin ; autres statuts inchangés ; ordre par défaut ; recherche (nom, arabe, slug, casse) ; filtre « Ended »                                                                                                                                                                                           |
| `useExperienceSummaries.test.ts` | 4     | requête exacte et carte des dates ; erreur → carte vide sans exception ; pas de requête sans organisation ; `refetch`                                                                                                                                                                                                                                                       |
| `StudioCampaignsPage.test.tsx`   | 10    | toutes les campagnes, actives d'abord ; contenu d'une ligne (statut, jeu, « 1,204 », « Saved · 2 hours ago », slug, « Ended », « Default ») ; recherche en arabe et par slug ; filtres statut et jeu, « Clear filters » ; ouverture par clic, `Entrée` et « Open » (une seule fois) ; mode autonome ; chargement ; erreur + Retry ; aucune campagne + Create ; `dir="auto"` |

Lancer : `npx vitest run src/components/playerStudio`.

## 8. Vérification

| Commande / contrôle                                                   | Résultat réel                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/components/playerStudio src/components/ui`        | 1ᵉʳ passage : ✅ 21/21 (+16 de S2). Après le découpage : 9 échecs (une ancienne version de la page importait encore `gameLabel` ; mon écriture avait été refusée, le fichier ayant changé) ; corrigé → ✅ **37/37** |
| `npx prettier --check` (fichiers de S1 à S3)                          | ✅                                                                                                                                                                                                                  |
| `npm run lint`                                                        | ✅ 0 erreur, 27 avertissements (inchangé depuis le départ)                                                                                                                                                          |
| `npm run typecheck`                                                   | ✅ OK                                                                                                                                                                                                               |
| `npx vitest run --maxWorkers=2` (suite complète)                      | ✅ **93 fichiers, 1037 tests** (1000 au départ + 16 de S2 + 21 de S3)                                                                                                                                               |
| `npm run build`                                                       | ✅ OK. CSS 182,68 Ko (27,72 Ko gzip) ; bundle principal inchangé (1 408,80 Ko) : la page n'est pas encore importée                                                                                                  |
| `git diff --stat src/features/player-experience`                      | ✅ vide : module non touché                                                                                                                                                                                         |
| Empreinte du dashboard (12 écrans, clair / sombre) comparée au départ | ✅ **12/12 identiques**                                                                                                                                                                                             |

**Contrôle visuel** (aperçu temporaire, Chrome sans interface) :

| Largeur                             | Colonnes visibles                             | Débordement de la page | Défilement du tableau | Console |
| ----------------------------------- | --------------------------------------------- | ---------------------- | --------------------- | ------- |
| 1 440 px                            | les 7                                         | 0                      | 0                     | propre  |
| 1 440 px + menu du dashboard simulé | Campaign, Game, Status, Players, Design, Open | 0                      | 0                     | propre  |
| 1 024 px + menu simulé              | Campaign, Status, Design, Open                | 0                      | 0                     | propre  |
| 390 px (téléphone)                  | Campaign, Status, Open (flèche)               | 0                      | 0                     | propre  |

Mêmes résultats en clair et en sombre. Contrôlés aussi :

- page 2 (Next) ;
- filtre « Ended » : les 4 bonnes campagnes (Back to School, Ramadan Nights, Spring Wheel 2026, Old Trivia) ;
- état « aucun résultat » et « Clear filters » ;
- lignes fantômes ;
- focus clavier après 13 appuis sur `Tab`, puis `Entrée` qui ouvre la bonne campagne.

**À vérifier par toi :** rien pour l'instant. Tu verras la page dans le dashboard après S4.

## 9. Non-régression

- Dashboard : empreinte identique sur 12 écrans (clair et sombre).
- Module Player Experience : non touché.
- 1000 tests existants : tous verts, aucun modifié.

## 10. Écarts, imprévus et points d'attention

1. **Écarts avec le plan :** ordre par défaut calculé par la page ; filtre « Ended » regroupé ; noms `savedAt` / `failed` ; colonnes masquées selon la largeur du tableau (§6).
2. **Modification de S2 pendant S3 :** `data-table.tsx`, `data-table-parts.tsx` et leur test, pour la largeur du tableau, l'espacement et les lignes fantômes. La documentation de S2 est à jour. Si tu commites tâche par tâche, ces changements partent avec le commit de S2 (fichiers complets).
3. **Page d'aperçu temporaire** créée puis supprimée pour le contrôle visuel (§5.6).
4. **Colonne Design dans l'aperçu :** sans organisation, elle affiche partout « Default ». « Saved · … » est couvert par les tests, et sera visible avec les vraies données en S5.
5. **Dates :** le format `en-GB` de Chrome écrit « Sept » pour septembre (« 29 Sept – 9 Nov 2026 ») : c'est la forme britannique actuelle.

## 11. Après le MVP

- Colonne « visites » (impressions) à côté des participations.
- Garder les filtres et la page quand on revient du Studio (aujourd'hui, la page repart à zéro).

## 12. Commit à faire (D6)

```powershell
git add src/components/playerStudio/ ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/S3-page-player-studio.md ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/README.md ai-assistance-prompts-reports/player-studio-campaigns-table/tasks.md
git commit -m "feat(Player-Experience): list the brand campaigns before opening the Studio"
```

## Journal

- 2026-09-30 — Tâche démarrée, documentation créée.
- 2026-09-30 — Lignes, lecture des designs, colonnes, page, 21 tests : 21/21 au 1ᵉʳ passage.
- 2026-09-30 — Deux fichiers au-dessus de 250 lignes → découpés (cellules, barre d'outils). Une écriture refusée (fichier modifié par Prettier) a laissé l'ancienne page : 9 échecs, corrigés → 37/37.
- 2026-09-30 — Contrôle visuel par une page d'aperçu temporaire : débordements à 1 024 px et sur téléphone, lignes fantômes trop pâles → corrigés (§5.6). Focus clavier et `Entrée` vérifiés. Aperçu supprimé.
- 2026-09-30 — Empreinte du dashboard 12/12, lint 27, typecheck OK, 1037 tests, build OK, module non touché. Statut → Terminée.
