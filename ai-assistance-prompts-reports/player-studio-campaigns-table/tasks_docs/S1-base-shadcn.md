# S1 — Base shadcn branchée sur le thème

| Champ       | Valeur                                                                              |
| ----------- | ----------------------------------------------------------------------------------- |
| Statut      | Terminée                                                                            |
| Dépend de   | S0 (non demandée : son état de départ est relevé ici, §2)                           |
| Démarrée le | 2026-09-30                                                                          |
| Terminée le | 2026-09-30                                                                          |
| Fiche       | tasks.md, S1 · plan, §3                                                             |
| Commit      | `chore(Dashboard): add the shadcn table primitives` — **à faire par toi** (D6, §12) |

## 1. Objectif

Disposer des composants shadcn nécessaires au tableau (Table, Button, Input, Badge) et de la fonction `cn()`, **sans aucun changement visible** sur le dashboard.

## 2. État de départ (relevé en remplacement de S0)

S0 ne faisait pas partie du lot demandé (« S1 à S3 »). Son rôle de **référence de non-régression** est rempli ici.

| Mesure                          | Valeur                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| Branche                         | `feat/player-experience-backend`, dernier commit `5061ee7`             |
| Lint                            | 0 erreur, 27 avertissements                                            |
| Typecheck                       | OK                                                                     |
| Tests (`--maxWorkers=2`)        | 89 fichiers, 1000 tests                                                |
| Build                           | OK ; CSS 173,23 Ko (26,35 Ko gzip) ; bundle principal 1 408,80 Ko      |
| Empreinte visuelle du dashboard | 12 écrans (6 onglets × clair / sombre), identique sur 2 relevés (§8.1) |

## 3. Plan de travail

- [x] État de départ, dont l'empreinte visuelle du dashboard
- [x] Dépendances (D1)
- [x] `components.json` écrit à la main (jamais `shadcn init`)
- [x] `cn()`
- [x] Table, Button, Input, Badge copiés de shadcn et adaptés
- [x] Couleurs shadcn ajoutées à `@theme`
- [x] Vérifications : empreinte après, typecheck, lint, tests, build

## 4. Fichiers créés et modifiés

| Fichier                        | Créé / modifié | Rôle                                                                                                   | Lignes |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| `package.json`                 | modifié        | +4 dépendances : `@tanstack/react-table` ^8.21.3, `class-variance-authority`, `clsx`, `tailwind-merge` | +4     |
| `package-lock.json`            | modifié        | Arbre de ces 4 dépendances                                                                             | +59    |
| `components.json`              | créé           | Configuration shadcn (style new-york, alias `@/src/…`, `src/index.css`)                                | 21     |
| `src/lib/utils.ts`             | créé           | `cn()`                                                                                                 | 7      |
| `src/components/ui/table.tsx`  | créé           | Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption               | 116    |
| `src/components/ui/button.tsx` | créé           | Button et `buttonVariants`                                                                             | 55     |
| `src/components/ui/input.tsx`  | créé           | Input                                                                                                  | 22     |
| `src/components/ui/badge.tsx`  | créé           | Badge et `badgeVariants`                                                                               | 39     |
| `src/index.css`                | modifié        | +17 lignes dans `@theme` (couleurs shadcn), **0 ligne retirée**                                        | +17    |

## 5. Le code expliqué

### 5.1 `components.json`

C'est le fichier que la CLI de shadcn lit pour savoir où mettre les composants. Il est écrit à la main, parce que `npx shadcn init` réécrirait `src/index.css` et changerait l'apparence de tout le dashboard (rules SH1).

- **Alias `@/src/…`** : dans ce projet, `@/` pointe sur la **racine du dépôt**, pas sur `src/`.
- **Imports internes relatifs** : dans les composants, les imports restent relatifs (`../../lib/utils`), comme dans le reste du dashboard (rules SH5).

### 5.2 `cn()`

`clsx` assemble les classes (conditions, tableaux), puis `tailwind-merge` résout les conflits : `cn("px-2", "px-4")` donne `px-4`. Les composants s'en servent pour qu'une classe passée en prop (`className`) l'emporte sur leurs classes par défaut.

### 5.3 Les 4 composants

Le code vient de shadcn (style « new-york », version Tailwind v4). **Trois adaptations**, écrites en commentaire en tête de chaque fichier :

1. **Couleur des bordures écrite dans le composant** (`border-border`, `border-input`). shadcn suppose une règle globale `* { border-color: var(--border) }`, qu'on n'ajoute pas (SH4). Sans cette adaptation, une bordure Tailwind v4 prendrait la couleur du texte.
2. **Pas de prop `asChild`** sur Button et Badge. Elle demande `Slot` de Radix, non installé (D1), et on n'en a pas besoin.
3. **`type="button"` par défaut** sur Button : un bouton du tableau ne doit jamais soumettre un formulaire par accident.

Les variantes restent celles de shadcn :

- Button : `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` ; tailles `default`, `sm`, `lg`, `icon` ;
- Badge : `default`, `secondary`, `destructive`, `outline`.

### 5.4 Les couleurs

```css
--color-background: var(--theme-card);          /* card background of the dashboard */
--color-foreground: var(--theme-text);
--color-muted: var(--theme-card-subtle);
--color-muted-foreground: var(--theme-text-muted);
--color-border: var(--theme-card-border);
--color-input: var(--theme-card-border);
--color-ring: var(--color-brand-accent);        /* the dashboard's blue */
--color-primary: var(--color-brand-accent);
--color-primary-foreground: #ffffff;
--color-secondary / accent (+ foreground), --color-destructive
```

- Les `--theme-*` changent déjà avec `data-theme="dark"` : les composants shadcn suivent donc le clair et le sombre **sans règle `dark:`**.
- **Aucun** style de base, **aucun** `:root` réécrit, **aucune** variable existante modifiée.

## 6. Décisions et alternatives

| Décision                                                   | Alternative écartée                       | Raison                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Table v8** (8.21.3)                             | v9 (9.2.4, installée d'office par npm)    | La v9 change d'API (`useTable` et « features »). La recette « Data Table » de shadcn et le plan (§4) sont écrits pour la v8 (`useReactTable`, `getCoreRowModel`…), stable et documentée. Même dépendance autorisée (D1), version fixée |
| Composants copiés à la main                                | `npx shadcn@latest add …`                 | Rien d'autre ne peut être modifié ; code relu ligne à ligne                                                                                                                                                                            |
| Couleur des bordures dans les composants                   | Règle globale `* { border-border }`       | Une règle globale changerait tout le dashboard (SH4)                                                                                                                                                                                   |
| `--color-primary` = bleu d'accent du dashboard (`#3b82f6`) | Couleur par défaut de shadcn (quasi noir) | Même couleur que les boutons d'action actuels                                                                                                                                                                                          |
| Empreinte des styles calculés, en plus des captures        | Comparaison de captures pixel par pixel   | Les graphiques et les nombres bougent d'une capture à l'autre. L'empreinte compare, élément par élément, 20 propriétés calculées : couleurs, bordures, police, marges, ombres                                                          |

## 7. Tests

Aucun test unitaire pour ces composants de présentation : ils sont exercés par les tests du `DataTable` (S2) et de la page (S3). La non-régression visuelle est vérifiée par l'empreinte (§8.1).

## 8. Vérification

### 8.1 Empreinte visuelle du dashboard

Un script jetable (hors du dépôt) pilote un Chrome sans interface avec le compte de test, en 1440 × 900. Pour chaque onglet (Overview, Campaign Radios, Reward Library, Analytics Desk, Billing & Quota, Organization), en clair **et** en sombre :

- il relève 20 propriétés calculées de **chaque** élément du menu et du contenu ;
- il en calcule une empreinte, et prend une capture d'écran.

Les graphiques (SVG, canvas) et les éléments animés sont exclus : ils changent d'un relevé à l'autre.

| Relevé                           | Résultat                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Avant (×2)                       | 12 écrans identiques entre les 2 relevés : l'empreinte est stable                    |
| **Après S1** comparé à « avant » | ✅ **12/12 écrans identiques** (296, 254, 207, 1 147, 143 et 91 éléments par onglet) |

### 8.2 Commandes

| Commande                                                                                                                                   | Résultat réel                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `git diff --stat src/index.css`                                                                                                            | ✅ 17 ajouts, 0 retrait                                                                                                                        |
| Recherche des classes que les nouveaux noms rendraient actives (`bg-primary`, `text-muted`, `border-border`…) hors de `src/components/ui/` | ✅ Aucune : rien d'existant ne change de couleur                                                                                               |
| `npm run typecheck`                                                                                                                        | ✅ OK                                                                                                                                          |
| `npm run lint`                                                                                                                             | ✅ 0 erreur, 27 avertissements (inchangé)                                                                                                      |
| `npx vitest run --maxWorkers=2`                                                                                                            | ✅ 89 fichiers, 1000 tests                                                                                                                     |
| `npm run build`                                                                                                                            | ✅ OK. CSS 179,76 Ko (27,39 Ko gzip, +1 Ko : classes des nouveaux composants et nouvelles variables) ; bundle principal inchangé (1 408,80 Ko) |
| `npm audit`                                                                                                                                | Signale 24 vulnérabilités, **toutes dans des paquets déjà présents** (`firebase-tools`, `xlsx`, `express`…), aucune dans les 4 nouveaux        |

**À vérifier par toi :** rien.

## 9. Non-régression

- Dashboard : empreinte identique sur 12 écrans (§8.1).
- Module Player Experience : non touché (`git diff --stat src/features/player-experience` vide).
- Tests existants : 1000/1000, aucun modifié.

## 10. Écarts, imprévus et points d'attention

1. **S0 non faite** (hors du lot). Son état de départ est au §2. Les documents de travail (`analyse.md`, `plan.md`, `tasks.md`, `rules.md`, `pipeline-final.md`) ne sont pas encore commités : je propose de les joindre au commit de S1 (§12).
2. **TanStack Table v8 au lieu de la v9** installée d'office (§6).
3. **Blocage `EBUSY` à la réinstallation** : le dossier `node_modules/@tanstack/react-table` était verrouillé par l'une de mes consoles, restée dedans. Relancé depuis la racine du projet : OK.

## 11. Après le MVP

- Passer à TanStack Table v9 quand shadcn aura publié sa recette pour cette version.

## 12. Commit à faire (D6)

```powershell
git add package.json package-lock.json components.json src/lib/utils.ts src/components/ui/table.tsx src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/badge.tsx src/index.css ai-assistance-prompts-reports/player-studio-campaigns-table/
git commit -m "chore(Dashboard): add the shadcn table primitives"
```

Le dossier `ai-assistance-prompts-reports/player-studio-campaigns-table/` contient les documents de travail et les documentations de S1 à S3. Si tu préfères un commit par tâche, ne prends ici que `tasks_docs/README.md`, `tasks_docs/S1-base-shadcn.md` et les 5 documents de travail.

## Journal

- 2026-09-30 — Tâche démarrée, documentation créée. État de départ relevé : lint 27 avertissements, 1000 tests, build.
- 2026-09-30 — Empreinte visuelle : un 1ᵉʳ essai varie à cause des éléments animés (`animate-pulse`, `animate-ping`) ; ils sont exclus → 12 écrans stables sur 2 relevés.
- 2026-09-30 — Dépendances installées ; TanStack Table fixée en v8 (npm avait pris la v9) ; `EBUSY` corrigé en relançant depuis la racine.
- 2026-09-30 — `components.json`, `cn()`, 4 composants, couleurs dans `@theme`.
- 2026-09-30 — Empreinte après S1 : 12/12 identiques. Typecheck OK, lint 27, 1000 tests, build OK. Statut → Terminée.
