# S2 — Composant `DataTable` générique

| Champ       | Valeur                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| Statut      | Terminée                                                                     |
| Dépend de   | S1                                                                           |
| Démarrée le | 2026-09-30                                                                   |
| Terminée le | 2026-09-30                                                                   |
| Fiche       | tasks.md, S2 · plan, §4                                                      |
| Commit      | `feat(Dashboard): add a reusable data table` — **à faire par toi** (D6, §12) |

## 1. Objectif

Un tableau de données réutilisable (TanStack Table v8 + Table de shadcn), avec tri, recherche, filtres, pagination, et ouverture d'une ligne au clic ou au clavier. Il ne sait rien des campagnes : S3 lui donne les colonnes et les données, et ce que veut dire « ouvrir une ligne ».

## 2. Avant / après

- **Avant :** chaque écran du dashboard écrit son propre tableau (`CampaignsList.tsx`, `AnalyticsCenter.tsx`…), avec son tri et ses filtres faits à la main.
- **Après :** un composant `<DataTable>` prêt à l'emploi. Il n'est encore utilisé nulle part : S3 sera le premier.

```
<DataTable columns data ariaLabel getRowId onRowOpen globalFilter columnFilters … />
   ├─ useReactTable (TanStack v8) : tri, filtre global, filtres de colonne, pagination
   ├─ <Table> (shadcn, S1)
   │    ├─ <DataTableHead>  : en-tête, bouton de tri + aria-sort  (data-table-parts.tsx)
   │    └─ lignes           : clic / Entrée → onRowOpen, lignes fantômes, états vide / sans résultat
   └─ <DataTablePagination> : « Rows 11–20 of 23 », Previous / Next      (data-table-parts.tsx)
```

## 3. Plan de travail

- [x] Composant, API du plan §4.1
- [x] 16 tests
- [x] Correction d'un défaut trouvé par les tests (retour intempestif en page 1, §5.3)
- [x] Découpage : le fichier dépassait 250 lignes
- [x] Typecheck, lint, tests, build

## 4. Fichiers créés et modifiés

| Fichier                                  | Créé / modifié | Rôle                                                              | Lignes |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------- | ------ |
| `src/components/ui/data-table.tsx`       | créé           | Le composant `DataTable` et ses props                             | 218    |
| `src/components/ui/data-table-parts.tsx` | créé           | En-tête triable, pagination, classes « masquée sous une largeur » | 122    |
| `src/components/ui/data-table.test.tsx`  | créé           | 16 tests                                                          | 249    |

## 5. Le code expliqué

### 5.1 L'API (`DataTableProps<TData>`)

| Prop                             | Rôle                                                                                                               | Par défaut             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `columns`, `data`                | Les colonnes TanStack (`ColumnDef`) et les lignes                                                                  | —                      |
| `ariaLabel`                      | Nom accessible du tableau                                                                                          | —                      |
| `getRowId`                       | Identifiant stable d'une ligne (clé React, identifiant TanStack)                                                   | —                      |
| `onRowOpen`                      | Appelé au clic ou sur `Entrée`. Absent : lignes non cliquables et non focalisables                                 | —                      |
| `globalFilter`, `globalFilterFn` | Recherche texte, **pilotée par la page** ; fonction de recherche                                                   | `""`, `includesString` |
| `columnFilters`                  | Filtres par colonne (par exemple `[{ id: "status", value: "active" }]`), pilotés par la page                       | `[]`                   |
| `initialSorting`                 | Tri de départ ; ensuite, l'utilisateur trie en cliquant sur les en-têtes                                           | `[]`                   |
| `pageSize`                       | Lignes par page                                                                                                    | 10                     |
| `loading`                        | 5 lignes fantômes, `aria-busy`, pas de pagination                                                                  | `false`                |
| `emptyState`                     | Affiché quand `data` est vide                                                                                      | —                      |
| `noResultsState`                 | Affiché quand les filtres ne laissent aucune ligne                                                                 | —                      |
| `hiddenColumnsBelow`             | Colonne masquée tant que **le tableau** est plus étroit que `sm` / `md` / `lg` / `xl` (§5.4) : `{ players: "md" }` | `{}`                   |

Chaque colonne peut aussi porter `meta.className` (alignement, largeur), appliqué à son en-tête et à ses cellules. C'est une petite extension du type `ColumnMeta` de TanStack, déclarée en tête du fichier.

### 5.2 Ouvrir une ligne

- Clic sur la ligne, ou `Entrée` quand la ligne a le focus (`tabIndex=0`), → `onRowOpen(ligne)`.
- **Un clic sur un contrôle dans la ligne** (bouton « Open », lien) est laissé à ce contrôle (`isFromControl`). Sans cela, cliquer « Open » ouvrirait deux fois.
- Focus visible : fond `muted` et anneau `ring`.
- **Pas de `role="button"` sur la ligne**, contrairement à ce que prévoyait le plan : ce rôle ferait perdre à la ligne sa nature de ligne de tableau pour les lecteurs d'écran. L'accès clavier est assuré par le focus et `Entrée`, et S3 ajoute un bouton « Open » explicite dans chaque ligne (règles §7.3).

### 5.3 La pagination et le défaut corrigé

**Défaut trouvé par les tests :** « Next » passait bien en page 2, puis revenait **aussitôt** en page 1.

- **Cause :** la valeur par défaut `columnFilters = []` crée un **nouveau** tableau à chaque rendu. TanStack y voit un changement de filtre et remet la pagination à zéro (`autoResetPageIndex`). Une page qui passerait ses filtres en tableau littéral aurait eu le même problème.
- **Correction :**
  - la pagination est un état du composant, et la remise à zéro automatique de TanStack est coupée ;
  - le composant revient en page 1 **seulement** quand les filtres changent **vraiment** : il compare `JSON.stringify([globalFilter, columnFilters])` ;
  - si les données diminuent (rechargement), il se place sur la dernière page qui existe encore, au lieu d'afficher une page vide.

Ces deux cas ont maintenant leur test.

### 5.4 Les colonnes masquées quand le tableau est étroit

`hiddenColumnsBelow={{ period: "xl" }}` masque une colonne tant que **le tableau lui-même** est plus étroit qu'une largeur donnée. La largeur de l'écran ne compte pas : ce sont des _container queries_ de Tailwind v4 (`@container` sur le cadre du tableau, puis `hidden @6xl:table-cell`), sans dépendance.

| Valeur | Colonne visible à partir d'une largeur de tableau de |
| ------ | ---------------------------------------------------- |
| `sm`   | 42 rem (672 px), `@2xl`                              |
| `md`   | 56 rem (896 px), `@4xl`                              |
| `lg`   | 64 rem (1 024 px), `@5xl`                            |
| `xl`   | 72 rem (1 152 px), `@6xl`                            |

**Pourquoi pas la largeur de l'écran** (`md:`, `lg:`), comme dans la 1ʳᵉ version : le contrôle visuel de S3 a montré qu'à 1 024 px d'écran, le tableau débordait de 151 px. Dans le dashboard, le menu de gauche prend déjà une partie de l'écran : seule la place réelle du tableau compte.

Les classes sont écrites en entier dans `HIDDEN_BELOW`, sinon Tailwind ne les générerait pas.

**Aussi réglé sur la place du tableau :**

- l'espacement horizontal des cellules : `px-3`, puis `px-4` à partir de 42 rem ;
- les lignes fantômes du chargement : gris `muted-foreground` à 15 %. La 1ʳᵉ version (`muted`) était presque invisible en clair.

## 6. Décisions et alternatives

| Décision                                                         | Alternative écartée                                   | Raison                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pas de `role="button"` sur les lignes                            | `role="button"` (plan §4.2)                           | Garder la sémantique de tableau ; accès clavier par focus + `Entrée`, et bouton « Open » en S3 |
| Pagination pilotée par le composant, sans remise à zéro auto     | `autoResetPageIndex` de TanStack                      | Défaut réel trouvé par les tests (§5.3)                                                        |
| Libellés de pagination en anglais écrits dans le composant       | Props de traduction                                   | Libellés du dashboard en anglais (`CLAUDE.md`, règle 5) ; pas d'option pour un seul usage (R6) |
| Découpage en `data-table-parts.tsx`                              | Un seul fichier de 311 lignes                         | Limite de 250 lignes (règles §6.2)                                                             |
| Colonnes masquées selon la largeur **du tableau** (`@container`) | Selon la largeur de l'écran (`md:`, `lg:`, plan §4.2) | Le tableau débordait à 1 024 px, et plus encore avec le menu du dashboard (§5.4)               |

## 7. Tests

`src/components/ui/data-table.test.tsx`, **16 tests** :

| Test                                                       | Ce qu'il vérifie                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| renders the first page…                                    | 10 lignes, nom accessible, « Rows 1–10 of 12 »                           |
| sorts a column both ways and exposes aria-sort             | `none` → `ascending` → `descending`, ordre des lignes                    |
| does not offer sorting on a column that disables it        | pas de bouton ni d'`aria-sort`                                           |
| applies the initial sorting                                | ordre décroissant de départ                                              |
| filters rows with the global filter                        | recherche « fruit 1 » → 3 lignes                                         |
| filters rows with a column filter                          | filtre `color = green` → 6 lignes                                        |
| pages with Previous and Next…                              | bornes désactivées, « Rows 11–12 of 12 »                                 |
| goes back to the first page when the filters really change | filtres égaux dans un nouveau tableau → page gardée ; recherche → page 1 |
| stays on an existing page when the data shrinks            | données réduites → dernière page existante                               |
| hides the pagination when everything fits…                 | pas de barre de pagination                                               |
| opens a row on click and on Enter, but not from a control  | clic, `Entrée`, et clic sur « Edit » sans ouverture                      |
| makes rows focusable only when they can be opened          | `tabindex` seulement avec `onRowOpen`                                    |
| shows skeleton rows while loading…                         | 5 lignes fantômes, `aria-busy`, pas de pagination                        |
| shows the empty state…                                     | état vide                                                                |
| shows the no-results state…                                | état sans résultat (et pas l'état vide)                                  |
| hides a column while the table is narrow…                  | `hidden @4xl:table-cell` sur l'en-tête et les cellules                   |

Lancer : `npx vitest run src/components/ui`.

## 8. Vérification

| Commande                           | Résultat réel                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/components/ui` | 1ᵉʳ passage : 13/14, la pagination revenait en page 1 (§5.3). Après correction et 2 tests de plus : ✅ **16/16** |
| `npm run typecheck`                | ✅ OK                                                                                                            |
| `npm run lint`                     | ✅ 0 erreur, 27 avertissements (inchangé)                                                                        |
| Suite complète et build            | Voir S3 §8 (lancés une fois pour S2 et S3)                                                                       |

**Contrôle visuel :** le tableau n'est affiché nulle part avant S3 ; il est contrôlé dans la page, en clair et en sombre (S3 §8).

**À vérifier par toi :** rien.

## 9. Non-régression

Composant nouveau, utilisé nulle part : aucun écran existant n'est touché. Module Player Experience non modifié.

## 10. Écarts, imprévus et points d'attention

1. **Défaut de pagination trouvé et corrigé** avant toute utilisation (§5.3).
2. **Écarts avec le plan :**
   - pas de `role="button"` sur les lignes ;
   - colonnes masquées selon la largeur du tableau, et non celle de l'écran (§5.4, changement fait pendant le contrôle visuel de S3).
3. **`data-table.test.tsx` fait 249 lignes**, juste sous la limite. Un test de plus devra aller dans un 2ᵉ fichier.

## 11. Après le MVP

- Réutiliser `DataTable` dans Participants et Inventory (tris et filtres faits à la main aujourd'hui).
- Menu « colonnes affichées » et sélection de lignes : ils demandent Radix, donc un accord (D1).

## 12. Commit à faire (D6)

```powershell
git add src/components/ui/data-table.tsx src/components/ui/data-table-parts.tsx src/components/ui/data-table.test.tsx ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/S2-composant-data-table.md ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/README.md
git commit -m "feat(Dashboard): add a reusable data table"
```

## Journal

- 2026-09-30 — Tâche démarrée, documentation créée.
- 2026-09-30 — Composant et 14 tests : 13/14. « Next » revenait en page 1 : cause trouvée (tableau de filtres recréé à chaque rendu + remise à zéro automatique de TanStack).
- 2026-09-30 — Pagination pilotée par le composant, remise à zéro seulement sur un vrai changement de filtre, garde sur les données qui diminuent ; +2 tests → 16/16.
- 2026-09-30 — Fichier de 311 lignes → découpé (218 + 119). Typecheck OK, lint 27. Statut → Terminée.
- 2026-09-30 — (Pendant S3) Contrôle visuel : débordement à 1 024 px et sur téléphone → colonnes masquées selon la largeur du tableau (`@container`), espacement réduit sur tableau étroit, lignes fantômes plus visibles en clair. Tests toujours 16/16.
