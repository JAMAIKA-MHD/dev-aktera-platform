# Règles — Tableau des campagnes avant le Player Studio

**Date :** 2026-09-30
**Portée :** toutes les tâches de [`tasks.md`](./tasks.md) (S0 → S5), et toute autre tâche demandée dans le cadre de ce travail.
**Branche :** `feat/player-experience-backend`, la branche actuelle (décision du 2026-09-30). **Aucune nouvelle branche.**
**Statut :** en vigueur. Ces règles s'appliquent **à chaque tâche, sans exception**.

> **Les quatre règles à retenir :**
>
> 1. **Documentation en français, code entièrement en anglais (R0).**
> 2. **Le Studio et le module Player Experience ne bougent pas** : on construit autour (R5).
> 3. **shadcn sans toucher à l'apparence du dashboard** : pas de `shadcn init`, pas de style global (§5).
> 4. **MVP : le minimum qui marche bien**, sans sur-ingénierie (R6).

---

## Sommaire

0. [Ordre de priorité et lecture obligatoire](#0-ordre-de-priorité-et-lecture-obligatoire)
1. [Règles de travail](#1-règles-de-travail)
2. [Règles Git et commits](#2-règles-git-et-commits)
3. [Ne pas casser ce qui marche](#3-ne-pas-casser-ce-qui-marche)
4. [MVP sans sur-ingénierie](#4-mvp-sans-sur-ingénierie)
5. [Règles shadcn et thème](#5-règles-shadcn-et-thème)
6. [Règles de code et de tests](#6-règles-de-code-et-de-tests)
   6 bis. [Règles des données de test (seed)](#6-bis-règles-des-données-de-test-seed)
7. [Règles d'interface (UX, accessibilité, responsive)](#7-règles-dinterface-ux-accessibilité-responsive)
8. [Modèle : documentation d'une tâche](#8-modèle--documentation-dune-tâche)
9. [Modèle : résumé de fin de tâche](#9-modèle--résumé-de-fin-de-tâche)
10. [Check-list avant de déclarer une tâche terminée](#10-check-list-avant-de-déclarer-une-tâche-terminée)

---

## 0. Ordre de priorité et lecture obligatoire

### Ordre de priorité en cas de conflit

1. **`CLAUDE.md`** (règles non négociables du projet) ;
2. **ce fichier `rules.md`** ;
3. **[`tasks.md`](./tasks.md)** (ce qu'il faut faire, tâche par tâche) ;
4. **[`plan.md`](./plan.md)** (référence technique : API des composants, extraits de code, couleurs) ;
5. **[`pipeline-final.md`](./pipeline-final.md)** et **[`analyse.md`](./analyse.md)** (contexte).

Si deux documents se contredisent sur un point qui change le résultat, **je m'arrête et je te le signale** avant d'écrire du code.

### À relire au début de chaque tâche

| Document                                   | Ce que j'y relis                                                |
| ------------------------------------------ | --------------------------------------------------------------- |
| `rules.md`                                 | Tout le fichier                                                 |
| `tasks.md`                                 | La fiche de la tâche, ses dépendances, §0.3 (décisions)         |
| `plan.md`                                  | Les sections citées par la fiche                                |
| `tasks_docs/`                              | Les documentations des tâches dont la tâche courante dépend     |
| `src/features/player-experience/README.md` | Seulement si la tâche touche l'import du module (`XP/index.ts`) |

---

## 1. Règles de travail

### R0 — Langue : documentation en français, implémentation en anglais _(règle prioritaire)_

| En **français**                                                                 | En **anglais**, sans exception                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| la documentation des tâches (`tasks_docs/`)                                     | noms des fichiers et dossiers de code                                          |
| les documents de `ai-assistance-prompts-reports/player-studio-campaigns-table/` | identifiants : variables, fonctions, types, composants                         |
| les résumés de fin de tâche                                                     | commentaires dans le code                                                      |
| nos échanges                                                                    | noms et descriptions des tests                                                 |
|                                                                                 | **libellés du dashboard** (colonnes, boutons, messages : `CLAUDE.md`, règle 5) |
|                                                                                 | messages de commit                                                             |

Un contenu arabe affiché (nom arabe d'une campagne) utilise `dir="auto"` et la police Noto Sans Arabic.

### R1 — Exécution des tâches

1. Tu me donnes **une tâche** (« fais S1 ») ou **un lot** (« fais S1 à S4 »).
2. J'exécute les tâches **dans l'ordre de `tasks.md`**. À la fin de chaque tâche : vérification, documentation, commit (selon R3).
3. J'enchaîne la tâche suivante **seulement si elle fait partie du lot demandé**. À la fin du lot, je m'arrête et je te donne le résumé.
4. **Je m'arrête avant la fin du lot si :**
   - une vérification échoue et que je ne peux pas la corriger dans le périmètre de la tâche ;
   - je découvre un imprévu qui change le périmètre, ou une contradiction entre documents ;
   - une tâche risquerait de casser quelque chose qui marche (R5), en particulier **l'apparence du dashboard**.

   Je te dis alors exactement ce qui bloque et ce que je propose.

5. **Pas de décision silencieuse.** Un choix mineur : je décide seul et je l'écris dans la documentation (§6 « Décisions »). Un choix qui change le périmètre, une dépendance ou un comportement visible : je te demande d'abord.

### R2 — Documentation par tâche

- **Un dossier :** `ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/`.
- **Une documentation par tâche :** `tasks_docs/<ID>-<titre-court-en-francais>.md` (par exemple `S2-composant-data-table.md`), suivant le modèle du §8.
- Elle est **créée au démarrage** de la tâche, avant le code, **mise à jour** à chaque étape importante, et **finalisée** avec les résultats **réels** des vérifications.
- Elle est **détaillée et pédagogique** : elle doit te permettre de comprendre le code sans le lire en entier.
- L'**index** (`tasks_docs/README.md`) est mis à jour : statut de la tâche et hash du commit.
- Le tableau d'avancement de `tasks.md` §0.5 est mis à jour à chaque tâche.
- Prettier est lancé sur les fichiers Markdown créés, avant le commit.

### R3 — Commits

Décision **D6** de `tasks.md` §0.3 :

- **Par défaut** (tant que tu ne m'as pas dit le contraire) : à la fin de chaque tâche, **je te propose** le message de commit et la liste exacte des fichiers. **Tu commites.**
- **Si tu m'y autorises** (par exemple « commite toi-même ») : je commite moi-même chaque tâche terminée, selon le §2, sans attendre ton feu vert. J'écris alors l'autorisation ici, avec sa date.

### R4 — Honnêteté des résultats

- Je rapporte les résultats **tels qu'ils sont** : un test qui échoue est signalé avec sa sortie, une étape sautée est dite sautée.
- Une tâche dont les vérifications échouent **n'est pas déclarée terminée**.
- Ce que je ne peux pas vérifier moi-même est listé dans « À vérifier par toi », avec la marche à suivre exacte.

---

## 2. Règles Git et commits

| Autorisé                                                    | Interdit                                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `git add <fichiers précis de la tâche>`                     | `git push` (quel que soit le remote) : le push reste à toi                                                                                |
| `git commit` avec le message de la fiche (si R3 l'autorise) | `git add -A` / `git add .`                                                                                                                |
| `git status`, `git diff`, `git log`, `git show`             | `--no-verify`, `--amend`, `rebase`, `reset`, `stash`, `merge`, `cherry-pick`, `checkout -- <fichier>`, `clean`, **changement de branche** |
|                                                             | commiter un fichier `.env*`, une clé, un mot de passe                                                                                     |

1. **Un commit par tâche**, qui contient le code **et** sa documentation `tasks_docs/`.
2. **Message :** celui de la ligne « Commit » de la fiche, avec la ligne `Co-Authored-By` si c'est moi qui commite :
   ```
   <type>(<scope>): <summary in English, imperative>

   <optional body in English>

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
   - Types : `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.
   - Scopes : `Dashboard` (base shadcn, composants génériques), `Player-Experience` (page du Studio, branchement dans `App.tsx`).
3. **Avant chaque commit :** lint, typecheck, tests et build passent (`npm run verify`, ou `npx vitest run --maxWorkers=2` sur cette machine, §6).
4. **Si le hook `pre-commit` échoue :** je corrige la cause et je relance un **nouveau** `git commit`.
5. Après le commit, je note son **hash** dans la documentation de la tâche et dans l'index.

---

## 3. Ne pas casser ce qui marche

### R5 — Principe : on ajoute, on ne change pas ce qui existe

Tout ce qui fonctionne aujourd'hui doit fonctionner **à l'identique** après chaque tâche, sauf ce que la fiche change explicitement : le menu « Player Screen » montre le tableau avant le Studio.

### 3.1 Zones protégées (on n'y touche pas)

| Zone                                                                                                     | Pourquoi                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Tout le module `src/features/player-experience/`** (Studio, runtime, domaine, services)                | Terminé et vérifié (refactor + branchement Supabase). Le Studio s'ouvre déjà sur une campagne donnée                       |
| Wizard (`CampaignWizard.tsx`) et « Edit in campaign settings »                                           | Il marche                                                                                                                  |
| Sandbox « Interactive Player Sandbox »                                                                   | Il marche ; il garde son propre état (`sandboxCampaignId`)                                                                 |
| Écrans Campaigns, Analytics, Inventory, Billing, Settings                                                | Ils marchent                                                                                                               |
| Tokens existants de `src/index.css` (`--theme-*`, `--color-brand-*`, `--color-card-*`…) et `@layer base` | Toute l'apparence du dashboard en dépend                                                                                   |
| Schéma de la base, migrations, Edge Functions                                                            | Hors sujet : **aucune** migration, **aucune** fonction SQL. Le seed de S5 écrit seulement des **données locales** (§6 bis) |
| Vite (`host 0.0.0.0`, port 3000), scripts npm existants, hooks Git                                       | `CLAUDE.md`, règle 6                                                                                                       |

### 3.2 Fichiers existants que les tâches ont le droit de modifier

Uniquement ceux listés dans la fiche de la tâche : `package.json` / `package-lock.json` (S1 ; S5 pour le script `studio:seed`), `src/index.css` (S1, **ajout** dans `@theme` seulement), `src/App.tsx` (S4), `docs/DATABASE_AND_TESTING_GUIDE.md` (S5). Toute autre modification d'un fichier existant doit être nécessaire, la plus petite possible, et justifiée dans la documentation (§8 « Écarts »).

### 3.3 Garanties à chaque tâche

- **Les tests existants passent sans être modifiés.** Si l'un doit changer, c'est un changement voulu, expliqué dans la documentation.
- **Aucun changement visuel** sur les écrans existants, en clair **et** en sombre.
- **Les entrées existantes vers le Studio** (« Customize player screen » depuis Campaigns, l'espace campagne, le Wizard) ouvrent toujours le Studio sur **leur** campagne.
- **Un problème trouvé hors périmètre** est **noté**, pas corrigé au passage.

---

## 4. MVP sans sur-ingénierie

### R6 — Le minimum qui marche bien

| On fait                                                                     | On ne fait pas                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Ce que la fiche demande, complètement et proprement                         | Une fonctionnalité « utile plus tard »                                            |
| Réutiliser : `useCampaigns`, `CampaignStudio`, le client Supabase, le thème | Recréer un chargement de campagnes, un thème, un Studio                           |
| Les composants shadcn **nécessaires** : Table, Button, Input, Badge         | Installer toute la bibliothèque shadcn « au cas où »                              |
| Un `DataTable` générique simple (tri, filtre, pagination, clic de ligne)    | Sélection multiple, édition dans les cellules, colonnes redimensionnables, export |
| Pagination côté navigateur                                                  | Pagination serveur (quelques dizaines de campagnes par marque)                    |

**Interdits sans ton accord explicite :**

- toute dépendance npm **autre** que celles de la décision D1 (`@tanstack/react-table`, `clsx`, `tailwind-merge`, `class-variance-authority`) ;
- une nouvelle **route**, une nouvelle **table**, une **migration** ;
- toute modification du module `XP/`.

**Une idée tentante mais hors périmètre ?** Je l'écris dans « Après le MVP » de la documentation de la tâche, et je ne la code pas.

---

## 5. Règles shadcn et thème

| #   | Règle                                            | En pratique                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SH1 | **Jamais `npx shadcn init`**                     | Il réécrit `src/index.css` (variables `:root`, `@layer base` sur `*` et `body`) et changerait **tout** le dashboard. `components.json` est écrit à la main (plan §3.2)                                                                                                                                |
| SH2 | **Composants copiés dans le dépôt**              | `src/components/ui/<nom>.tsx`, code de shadcn (modèle « copier-coller » de shadcn), adapté seulement pour les imports et les couleurs. Ajout par `npx shadcn@latest add <nom>` **ou** copie manuelle, puis **relecture du diff** : aucun autre fichier ne doit changer                                |
| SH3 | **Couleurs branchées sur le thème du dashboard** | Les noms de shadcn (`background`, `foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `primary`, `primary-foreground`, `accent`, `accent-foreground`) sont **ajoutés** dans `@theme` et pointent sur les `--theme-*` existants (plan §3.3). Clair et sombre suivent donc tout seuls |
| SH4 | **Aucun style global**                           | Pas de `* { @apply border-border }`, pas de style sur `body`, pas de nouvelle règle dans `@layer base`                                                                                                                                                                                                |
| SH5 | **Alias**                                        | `@/` pointe sur la **racine du dépôt** : `@/src/components/ui/…`, `@/src/lib/utils`. Dans le code, les imports relatifs du reste du dashboard restent acceptés                                                                                                                                        |
| SH6 | **Mode sombre**                                  | Il repose sur `data-theme="dark"` et la classe `.dark` (déjà posés par `ThemeContext`). Pas de `dark:` qui code une couleur en dur : les couleurs viennent des tokens                                                                                                                                 |
| SH7 | **Pas de couleur écrite en dur** dans la page    | Couleurs par tokens (`bg-card-bg`, `text-brand-text-muted`, tokens shadcn). Exception : les couleurs de statut (vert actif, orange en pause…), en classes Tailwind, alignées sur `CampaignsList.tsx`                                                                                                  |

---

## 6. Règles de code et de tests

1. **TypeScript :** pas de `any` dans le code nouveau. Les types des lignes du tableau sont dérivés de `Campaign` (`src/types.ts`).
2. **Taille :** un fichier de plus de 250 lignes doit être découpé ; une fonction fait une seule chose.
3. **Style :** celui du code autour. Un commentaire explique le **pourquoi**.
4. **`App.tsx` (881 lignes) :** on n'y ajoute que l'état et le branchement (une vingtaine de lignes). Toute l'interface vit dans `src/components/playerStudio/`.
5. **Le module `XP/` s'importe seulement par `XP/index.ts`** (ESLint le vérifie). La page n'en a normalement pas besoin.
6. **Tests (Vitest + Testing Library) :**
   - chaque composant nouveau a son test, dans le même dossier (`*.test.tsx`) ;
   - `DataTable` : rendu, tri, filtre, pagination, clic et `Entrée` sur une ligne, état vide ;
   - page : colonnes, recherche, filtres, états chargement / erreur / vide, ouverture d'une campagne, bouton du mode autonome ;
   - `App` : parcours menu → tableau → Studio → fermer → tableau (Studio remplacé par un faux composant léger dans ce test) ;
   - pas de réseau : faux client Supabase ou hook simulé.
7. **Commandes de vérification** avant chaque commit : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (= `npm run verify`).
   - **Sur cette machine**, `npm test` peut échouer au démarrage (`Failed to start forks worker`). Je relance alors avec `npx vitest run --maxWorkers=2`, et je rapporte les deux sorties. Base de départ : 89 fichiers, 1000 tests.
   - Le lint compte **27 avertissements** au départ (0 erreur) : une tâche ne doit pas en **ajouter**.
8. **Serveur de développement :** Vite recharge la page à chaque modification du dépôt. Pour une vérification visuelle longue, utiliser `npm run build` puis `npx vite preview --port 4173`. Un Vite resté ouvert s'arrête **par son port**.

---

## 6 bis. Règles des données de test (seed)

Pour le script `npm run studio:seed` (S5, plan §7 bis).

| #   | Règle                                                   | En pratique                                                                                                                                                              |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SD1 | **Local seulement**                                     | Le script refuse de démarrer si `VITE_SUPABASE_URL` n'est pas `http://127.0.0.1:54321` ou `http://localhost:54321` (code 2). Jamais contre le cloud                      |
| SD2 | **Additif**                                             | Il ne supprime et ne modifie **que** ses propres lignes : identifiants au préfixe fixe `5eed…`, slugs `seed-…`. **Chaque** suppression est filtrée sur ce préfixe        |
| SD3 | **Rejouable**                                           | Relancé, il nettoie ses données puis les recrée : toujours le même résultat. `--clean` retire tout, sans rien recréer                                                    |
| SD4 | **Jamais `npm run db:seed` ni `npx supabase db reset`** | Ils effacent les données de l'organisation ou toute la base, changent les identifiants des campagnes et font perdre les designs (`campaign_experiences`, `localStorage`) |
| SD5 | **Aucune donnée personnelle réelle**                    | Téléphones fictifs `0699 0N xx xx`, nom « Seed player », `metadata.source = "studio_seed"`                                                                               |
| SD6 | **Designs valides**                                     | Construits par `createDefaultExperience` du module (chargé par Vite `ssrLoadModule`), jamais écrits à la main : le Studio doit afficher « No issues »                    |
| SD7 | **Clé `service_role`**                                  | Lue dans `.env.local` par le script seulement ; jamais dans `src/`, jamais préfixée `VITE_`, jamais commitée                                                             |
| SD8 | **Preuve de non-destruction**                           | La recette de S5 compare le nombre de campagnes et de participations **hors seed**, avant et après `studio:seed` et `--clean` : ils doivent être identiques              |

---

## 7. Règles d'interface (UX, accessibilité, responsive)

1. **Même langage visuel que le dashboard** : titres, cartes, bordures et couleurs comme `CampaignsList.tsx` et `AnalyticsCenter.tsx`. Le tableau ne doit pas avoir l'air d'une autre application.
2. **Clair et sombre** vérifiés tous les deux, avec une capture de chacun dans la documentation.
3. **Clavier :** chaque ligne est atteignable par `Tab`, `Entrée` ouvre la campagne, et un bouton « Open » explicite existe dans la ligne. Focus visible.
4. **Lecteurs d'écran :** en-têtes triables avec `aria-sort` ; le tableau a un `aria-label`.
5. **Petits écrans :** pas de défilement horizontal de la **page**. Le tableau défile dans son conteneur, et les colonnes secondaires se masquent sous une largeur donnée (plan §4.3).
6. **États toujours prévus :** chargement (lignes fantômes), erreur (message + « Retry »), aucune campagne (« Create a campaign »), aucun résultat (« No campaign matches » + « Clear filters »).
7. **Libellés en anglais**, via `t("…", "fallback")` comme le reste du dashboard.

---

## 8. Modèle : documentation d'une tâche

Fichier `tasks_docs/<ID>-<titre-court>.md`, créé au démarrage de la tâche et tenu à jour jusqu'à la fin (R2).

```markdown
# <ID> — <Titre de la tâche>

| Champ       | Valeur                                               |
| ----------- | ---------------------------------------------------- |
| Statut      | En cours · Terminée · Bloquée (raison)               |
| Dépend de   | <IDs>                                                |
| Démarrée le | AAAA-MM-JJ                                           |
| Terminée le | AAAA-MM-JJ                                           |
| Fiche       | tasks.md, <ID> · plan, §<sections>                   |
| Commit      | `<type>(<scope>): <résumé>` — `<hash>` une fois fait |

## 1. Objectif

## 2. Avant / après

## 3. Plan de travail

- [ ] Étape 1

## 4. Fichiers créés et modifiés

| Fichier | Créé / modifié | Rôle | Lignes |
| ------- | -------------- | ---- | ------ |

## 5. Le code expliqué

Rôle de chaque fichier, extraits clés commentés, ce qu'il exporte, les cas limites gérés.

## 6. Décisions et alternatives

| Décision | Alternative écartée | Raison |
| -------- | ------------------- | ------ |

## 7. Tests

| Fichier de test | Ce qu'il vérifie | Comment le lancer |
| --------------- | ---------------- | ----------------- |

## 8. Vérification

| Commande | Résultat réel |
| -------- | ------------- |

**Captures :** clair / sombre, grand / petit écran (pour les tâches d'interface).

**À vérifier par toi :** marche à suivre exacte (ou « rien »).

## 9. Non-régression

## 10. Écarts, imprévus et points d'attention

## 11. Après le MVP

## 12. Comment relire cette tâche

## Journal

- AAAA-MM-JJ HH:MM — Tâche démarrée, documentation créée.
```

---

## 9. Modèle : résumé de fin de tâche

```markdown
## <ID> terminée — <Titre>

**Ce que j'ai fait :** …

**Fichiers :** créés … · modifiés …

**Vérification :**

- `npm run verify` → …
- <commandes de la fiche> → …
- À vérifier par toi : … (ou « rien »)

**Non-régression :** …

**Écarts et points d'attention :** … (ou « aucun »)

**Documentation :** `tasks_docs/<ID>-<titre-court>.md`

**Commit :** `<hash>` — `<message>` (ou : message proposé + fichiers, si tu commites)

**Suite :** <ID suivant> (enchaîné si dans le lot, sinon j'attends ta demande).
```

---

## 10. Check-list avant de déclarer une tâche terminée

- [ ] La fiche de `tasks.md` est entièrement réalisée, critères d'acceptation compris, **et rien de plus** (R6).
- [ ] **Langue (R0) :** code, tests, libellés et commits en anglais ; documentation en français.
- [ ] **Non-régression (R5) :** tests existants verts sans modification ; module `XP/` intact (`git diff --stat src/features/player-experience` vide) ; aucun changement visuel sur les écrans existants.
- [ ] **shadcn (§5) :** pas de `init`, pas de style global, couleurs par tokens ; `git diff src/index.css` ne contient que des **ajouts** dans `@theme`.
- [ ] **Vérifications** lancées, résultats rapportés tels quels ; `npm run verify` vert (ou lint + typecheck + `vitest --maxWorkers=2` + build) ; pas de nouvel avertissement de lint.
- [ ] **Seed (§6 bis, S5) :** local seulement ; suppressions filtrées sur `5eed…` ; décomptes hors seed identiques avant / après.
- [ ] **Interface (§7) :** clair et sombre, clavier, petit écran, les 4 états.
- [ ] **Documentation** complète, journal à jour, statut `Terminée`, index à jour.
- [ ] **Aucun secret** et aucun fichier hors tâche dans les fichiers indexés (`git diff --cached --stat`).
- [ ] **Commit** fait (ou proposé) selon R3, sans `--no-verify`, sans `--amend`, sans push.
- [ ] Résumé de fin de tâche donné (§9).
