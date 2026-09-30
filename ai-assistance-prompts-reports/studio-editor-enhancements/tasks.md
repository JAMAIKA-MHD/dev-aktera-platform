# Tâches — Améliorations de l'éditeur Player Studio

**Date :** 2026-09-30
**Règles :** [`rules.md`](./rules.md). **Plan technique :** [`plan.md`](./plan.md).
**Branche :** `feat/player-experience-backend` (actuelle).
**Autorisation :** commit fait par moi à la fin de chaque tâche (donnée le 2026-09-30, pour ce lot).

## Avancement

| Tâche | Titre                                                       | Statut   | Commit      |
| ----- | ----------------------------------------------------------- | -------- | ----------- |
| E1    | Renommer « Brand » en « Brand Identity »                    | Terminée | (ce commit) |
| E2    | Renommer « Mode » en « Scenario » (aperçu)                  | À faire  | —           |
| E3    | Retirer les onglets d'écran en double dans Content          | À faire  | —           |
| E4    | Les onglets d'écran passent dans la barre du haut, agrandis | À faire  | —           |
| E5    | Menu déroulant des langues, en haut de Content              | À faire  | —           |

---

## E1 — Renommer « Brand » en « Brand Identity »

**Fichiers :** `layout/StudioNav.tsx`, `panels/BrandPanel.tsx`
**Vérification :** `npx tsc --noEmit`, `npx eslint`, `npx vitest run src/features/player-experience/studio`
**Commit :** `refactor(Player-Experience): rename the Studio Brand panel to Brand Identity`

## E2 — Renommer « Mode » en « Scenario »

**Fichiers :** `layout/PreviewPane.tsx`, `PlayerExperienceStudio.test.tsx`
**Attention :** ne pas toucher au `<SegmentedControl label="Mode">` de `BrandPanel.tsx` (thème clair/sombre, sans rapport).
**Vérification :** `npx tsc --noEmit`, `npx eslint`, `npx vitest run src/features/player-experience/studio`
**Commit :** `refactor(Player-Experience): rename the preview's flow Mode to Scenario`

## E3 — Retirer les onglets d'écran en double dans Content

**Fichiers :** `panels/ContentPanel.tsx`, `panels/contentSections.test.tsx`
**Description :** retirer le `SegmentedControl` « Screen » et la fonction qui ne servait qu'à lui ; garder les deux effets qui suivent l'onglet général et le clic sur un texte/une erreur.
**Critère d'acceptation :** changer d'écran depuis le store (comme le fera l'onglet général) change toujours les champs édités dans Content ; cliquer une erreur de Validation sur un autre écran l'ouvre toujours dans Content.
**Vérification :** `npx tsc --noEmit`, `npx eslint`, `npx vitest run src/features/player-experience/studio`
**Commit :** `refactor(Player-Experience): remove the duplicate screen tabs in the Content panel`

## E4 — Les onglets d'écran passent dans la barre du haut, agrandis

**Fichiers :** `store.ts`, `layout/ScreenTabs.tsx` (nouveau), `layout/StudioTopBar.tsx`, `layout/PreviewPane.tsx`, `panels/formGame.test.tsx`
**Description :** `liveScreen` + `setLiveScreen` dans le store ; nouveau composant `ScreenTabs` (onglets un peu plus grands qu'avant) rendu au milieu de `StudioTopBar`, entre Undo/Redo et Saved/Issues ; `PreviewPane` ne montre plus que le sélecteur de langue, le scénario, l'éventuel résultat et Restart, sur un seul bandeau.
**Critère d'acceptation :** les onglets sont visibles et cliquables dans la barre du haut, à toutes les tailles d'écran testées par la suite de tests ; le petit point « en direct » d'une partie en Full flow apparaît toujours sur le bon onglet.
**Vérification :** `npx tsc --noEmit`, `npx eslint`, `npx vitest run src/features/player-experience/studio`
**Commit :** `feat(Player-Experience): move the screen tabs to the top bar`

## E5 — Menu déroulant des langues, en haut de Content

**Fichiers :** `panels/LanguagesSection.tsx`, `panels/ContentPanel.tsx`, `panels/contentSections.test.tsx`
**Description :** un bouton (langues activées + langue par défaut en résumé) ouvre un menu : une ligne par langue (étoile = par défaut, interrupteur = activée). Choisir une langue par défaut l'active aussi si besoin. Déplacé en tout début du panneau Content.
**Critère d'acceptation :** on ne peut jamais désactiver la langue par défaut ; désactiver la langue en cours d'aperçu la fait retomber sur la langue par défaut ; choisir une langue désactivée comme langue par défaut l'active.
**Vérification :** `npx tsc --noEmit`, `npx eslint`, `npx vitest run src/features/player-experience/studio`
**Commit :** `feat(Player-Experience): turn the languages section into a dropdown menu`

---

## À la fin du lot

- `npx vitest run --maxWorkers=2` (suite complète), `npm run build`.
- `git diff --stat` hors de `src/features/player-experience/studio/` et de ce dossier de documents : doit être vide.
