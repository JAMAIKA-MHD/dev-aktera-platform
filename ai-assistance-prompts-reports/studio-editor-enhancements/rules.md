# Règles — Améliorations de l'éditeur Player Studio

**Date :** 2026-09-30
**Portée :** les 5 tâches de [`tasks.md`](./tasks.md) (E1 à E5), et toute autre retouche demandée dans le cadre de ce lot.
**Branche :** `feat/player-experience-backend` (la branche actuelle). Aucune nouvelle branche : c'est celle utilisée pour tout le travail récent sur le Player Experience.
**Statut :** en vigueur, à chaque tâche.

> **Ce qui compte :**
>
> 1. **Documentation en français, code entièrement en anglais (R0).**
> 2. **Commit fait par moi, à la fin de chaque tâche** (autorisation donnée le 2026-09-30, valable pour ce lot).
> 3. **On améliore l'éditeur, on ne touche à rien d'autre** : ni le runtime joueur, ni le domaine, ni la base de données.

---

## 1. Ordre de priorité

1. `CLAUDE.md` (règles non négociables du projet) ;
2. ce fichier `rules.md` ;
3. [`tasks.md`](./tasks.md) (le détail de chaque tâche) ;
4. [`plan.md`](./plan.md) (référence technique : composants, styles, décisions).

`tasks.md` fixe l'ordre d'exécution ; `plan.md` explique le « comment ». En cas de contradiction, `tasks.md` l'emporte.

## 2. Langue (R0)

| En français                             | En anglais, sans exception                                                |
| --------------------------------------- | ------------------------------------------------------------------------- |
| ce dossier de documents                 | identifiants : composants, fonctions, variables, classes CSS              |
| les résumés donnés dans la conversation | commentaires dans le code, noms et descriptions des tests                 |
|                                         | libellés visibles dans le Studio (déjà en anglais : « Brand », « Mode »…) |
|                                         | messages de commit                                                        |

## 3. Portée : ce qu'on touche, ce qu'on ne touche pas

### Fichiers concernés par ce lot (`src/features/player-experience/studio/`)

- `layout/StudioNav.tsx`, `layout/StudioTopBar.tsx`, `layout/PreviewPane.tsx` (+ un nouveau fichier `layout/ScreenTabs.tsx`) ;
- `panels/BrandPanel.tsx`, `panels/ContentPanel.tsx`, `panels/LanguagesSection.tsx` ;
- `store.ts` (un seul champ ajouté : `liveScreen`, ni historisé ni lié à la configuration) ;
- les tests déjà existants de ces fichiers, adaptés quand un texte ou une interaction change.

### Zones protégées (on n'y touche pas)

| Zone                                                                | Pourquoi                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `runtime/` (ce que voit le joueur)                                  | Terminé, vérifié à toutes les tailles ; hors sujet ici                 |
| `domain/` (types, schéma, validation, machine à états)              | Pur, testé ; aucune de ces 5 demandes n'en a besoin                    |
| `services/` (adaptateurs Supabase et locaux)                        | Hors sujet : ce lot ne change aucune donnée, seulement l'éditeur       |
| Base de données, migrations, Edge Functions                         | Hors sujet                                                             |
| Les autres panneaux du Studio (Sections, Form, Game, Legal, Export) | Non listés dans `tasks.md` ; on ne les modifie que si une tâche le dit |

### Une règle en plus pour ce lot

**Le champ « Mode » (clair/sombre) du panneau Brand > Colors n'est pas concerné.** Il porte le même mot que le sélecteur de scénario de l'aperçu, mais ce sont deux réglages différents. La tâche E2 ne touche que le second (`layout/PreviewPane.tsx`).

## 4. Git et commits

| Autorisé (sans redemander)                        | Interdit                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `git add` des fichiers précis de la tâche         | `git add -A` / `git add .`                                                  |
| `git commit` avec le message de la fiche de tâche | `--no-verify`, `--amend`, `rebase`, `reset`, `stash`, changement de branche |
| `git status`, `git diff`, `git log`               | `git push` (reste à toi)                                                    |

1. **Un commit par tâche**, avec le code et sa vérification.
2. **Message :** celui donné dans `tasks.md`, au format
   ```
   <type>(<scope>): <résumé en anglais, impératif>

   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```
   Types : `refactor` (renommage, retrait de duplication) ou `feat` (nouveau comportement, ex. le menu des langues). Scope : `Player-Experience`.
3. **Avant chaque commit :** `npx tsc --noEmit`, `npx eslint` sans nouvelle erreur ni nouvel avertissement (départ : 0 erreur, 26 avertissements), les tests touchés verts, puis `npm run verify` (lint + typecheck + tests + build) au complet.
4. **Si un hook échoue :** je corrige et je relance un nouveau commit, jamais `--no-verify`.

## 5. Non-régression

- Aucun changement ailleurs que dans l'éditeur (le runtime joueur et le sandbox de démonstration doivent rester identiques).
- Un texte affiché renommé (« Brand » → « Brand Identity », « Mode » → « Scenario ») ne change **que** l'affichage : les identifiants internes (`StudioPanel = "brand"`, `PreviewFlowMode = "demo" | "scripted" | "static"`, chemins de validation) ne bougent pas.
- Les tests existants passent sans perte de couverture : quand une interaction change de forme (par exemple un menu déroulant remplace une liste toujours visible), le test est réécrit pour vérifier le même comportement, pas supprimé.
- Aucune nouvelle dépendance npm : tout est déjà disponible (`lucide-react` pour les icônes, `usePopover` de `fields/Field.tsx` pour le menu déroulant).

## 6. Accessibilité et style

- Les contrôles gardent un rôle ARIA correct (`role="tab"`, `role="switch"`…) et un nom accessible clair.
- Le nouveau menu des langues se ferme à l'`Échap` et au clic en dehors (réutilise `usePopover`, déjà testé ailleurs).
- Les couleurs Tailwind écrites en dur sont acceptées dans `studio/` (ce n'est pas `runtime/`, seul dossier où `CLAUDE.md` l'interdit) ; on garde la palette déjà utilisée ailleurs dans le Studio (`emerald`, `amber`, `red`…) plutôt que d'en inventer une nouvelle.
- Un fichier de plus de 250 lignes est découpé (règle déjà suivie dans ce module). `store.ts` dépassait déjà cette limite avant ce lot (357 lignes) : je n'entreprends pas de le refactorer, seulement d'y ajouter les 2 lignes nécessaires (champ + action).

## 7. Modèle de résumé de fin de tâche

```markdown
## <ID> terminée — <Titre>

**Ce que j'ai fait :** …
**Fichiers :** créés … · modifiés …
**Vérification :** tsc, eslint, tests touchés, `npm run verify` → …
**Non-régression :** …
**Commit :** `<hash>` — `<message>`
```
