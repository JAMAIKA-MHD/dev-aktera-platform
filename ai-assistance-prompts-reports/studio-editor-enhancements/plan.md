# Plan technique — Améliorations de l'éditeur Player Studio

**Date :** 2026-09-30
**À lire avec :** [`rules.md`](./rules.md) (les règles, prioritaires) et [`tasks.md`](./tasks.md) (les tâches).

## 1. Les 5 demandes, et leur tâche

| #   | Demande, telle que reçue                                                                            | Tâche | Fichier(s) principal(aux)                                                                          |
| --- | --------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| 1   | Renommer le menu « Brand » en « Brand Identity »                                                    | E1    | `layout/StudioNav.tsx`, `panels/BrandPanel.tsx`                                                    |
| 2   | Renommer « Mode » en « Scenario »                                                                   | E2    | `layout/PreviewPane.tsx`                                                                           |
| 3   | Dans Content, enlever les onglets d'écran en double, garder seulement celui de l'éditeur            | E3    | `panels/ContentPanel.tsx`                                                                          |
| 5   | Les onglets d'écran passent dans la barre du haut (undo/saved…), au milieu, un peu plus grands      | E4    | `layout/ScreenTabs.tsx` (nouveau), `layout/StudioTopBar.tsx`, `layout/PreviewPane.tsx`, `store.ts` |
| 4   | Les langues (activer/désactiver, langue par défaut) : un menu déroulant, en haut du panneau Content | E5    | `panels/LanguagesSection.tsx`, `panels/ContentPanel.tsx`                                           |

**Ordre choisi :** E1, E2 (renommages, sans risque), puis E3 (retirer le doublon), puis E4 (déplacer l'onglet général — après E3, il est clair que c'est bien « le seul » qui reste), puis E5 (le plus gros morceau, un nouveau composant). J'ai inversé l'ordre des demandes 4 et 5 : la 5 change où vit l'onglet général que la 3 vient de laisser seul, donc je la fais avant. La 4 ne dépend de rien d'autre.

## 2. État des lieux (avant)

```
StudioTopBar   : logo/campagne · Undo/Redo ······· Saved · Issues · Open in window · Close
                                                      (rien au milieu)
StudioNav      : Template · Brand · Content · Sections · Form · Game · Legal · Share · Validation
PreviewPane    : [Onglets Welcome/Register/Play/Win/Lose/Status]   [FR AR EN]
                 [Mode ▾]  [Outcome ▾ si scripted]           [Restart]
                 [barre des appareils (device toolbar)]
ContentPanel   : [Onglets Welcome/Register/Play/Win/Lose]  ← doublon des onglets ci-dessus
                 Texts (Title, Subtitle, Main button…)
                 Around the text
                 Languages (toujours visible, en bas) : 3 interrupteurs + un <select> « Default language »
```

## 3. État visé (après)

```
StudioTopBar   : logo/campagne · Undo/Redo ··· [Welcome|Register|Play|Win|Lose|Status] ··· Saved · Issues · Open in window · Close
                                                 (un peu plus grands, centrés)
StudioNav      : Template · Brand Identity · Content · Sections · Form · Game · Legal · Share · Validation
PreviewPane    : [FR AR EN]
                 [Scenario ▾]  [Outcome ▾ si scripted]  [Restart]
                 [barre des appareils]
ContentPanel   : [Languages ▾]  ← nouveau menu déroulant, tout en haut
                 Texts (Title, Subtitle, Main button…)     (plus d'onglets ici : suit l'onglet du haut)
                 Around the text
```

## 4. E1 — « Brand » → « Brand Identity »

- `layout/StudioNav.tsx` : `PANEL_META.brand.label` : `"Brand"` → `"Brand Identity"`.
- `panels/BrandPanel.tsx` : `<PanelHeader title="Brand" .../>` → `title="Brand Identity"`.
- Rien d'autre : l'identifiant interne (`StudioPanel = "brand"`) ne change pas, ni le routage (`panelForPath.ts`).
- Tests : aucun à modifier (`PlayerExperienceStudio.test.tsx` et `CampaignStudio.supabase.test.tsx` cherchent le bouton par une expression régulière `/Brand/`, qui reconnaît toujours « Brand Identity »).

## 5. E2 — « Mode » → « Scenario »

- `layout/PreviewPane.tsx` : le texte du `<label>` qui entoure le `<select>` du mode d'aperçu (`demo` / `scripted` / `static`) passe de `Mode` à `Scenario`. Les valeurs des options ne changent pas (« Full flow (demo) », « Scripted », « Static screen »).
- **Ne pas toucher** au `<SegmentedControl label="Mode" .../>` de `panels/BrandPanel.tsx` (thème clair/sombre) : mot identique, réglage différent (rules.md §3).
- Tests : `PlayerExperienceStudio.test.tsx` — `screen.getByLabelText("Mode")` → `screen.getByLabelText("Scenario")`.

## 6. E3 — Retirer le doublon d'onglets dans Content

`ContentPanel.tsx` garde aujourd'hui un état local `key` (le contenu édité) synchronisé de deux façons :

1. il suit l'onglet général (`ui.screen`, celui du haut) — **à garder**, c'est justement « le général » que la demande veut garder ;
2. il suit `focusPath` quand on clique un texte dans l'aperçu ou une erreur de Validation, même pour un écran différent de celui affiché — **à garder**, ce n'est pas le doublon, c'est un raccourci utile ;
3. son propre `<SegmentedControl label="Screen" .../>`, qui permettait de changer d'écran **depuis Content aussi** — **c'est le doublon à retirer**.

Changement : supprimer le rendu du `SegmentedControl` (et son tableau `SCREENS` n'est plus utilisé pour l'affichage, seulement par `isScreenKey`), supprimer la fonction `pick` (qui ne servait qu'à ce contrôle) et l'import de `setScreen`, devenu inutile ici. Les deux `useEffect` qui synchronisent `key` restent intacts.

- Tests (`panels/contentSections.test.tsx`) : les deux tests qui cliquaient sur le radio « Screen » de Content sont réécrits pour piloter l'écran depuis le store (`store.getState().setScreen(...)`), exactement comme le ferait l'onglet général, puis vérifier que Content montre bien les champs du bon écran.

## 7. E4 — Les onglets d'écran dans la barre du haut

### 7.1 Un état partagé pour le petit point « en direct »

Le seul obstacle à déplacer les onglets : le petit point vert qui apparaît sur un onglet pendant qu'une partie de démonstration (Mode/Scenario = « Full flow ») le traverse réellement, sans faire bouger l'onglet choisi. Cet état (`live`) est aujourd'hui un `useState` local à `PreviewPane`. Comme les onglets et l'aperçu ne seront plus dans le même composant, cet état passe dans le store, à côté de `layoutIssues` (même famille : un retour d'affichage, jamais historisé) :

```ts
// store.ts — StudioState
liveScreen: PreviewScreen | null; // où en est une partie de démonstration, pour le petit point des onglets
setLiveScreen(screen: PreviewScreen | null): void;
```

- Initialisé à `null`.
- `setLiveScreen: (liveScreen) => set({ liveScreen })`.
- **`panels/formGame.test.tsx`** énumère toutes les actions du store dans un test : `setLiveScreen` doit y être ajouté à la liste attendue.

### 7.2 Nouveau composant `layout/ScreenTabs.tsx`

Reprend la liste `SCREENS` (Welcome/Register/Play/Win/Lose/Status) et le style des onglets de `PreviewPane.tsx`, agrandi (`min-h-9 px-3 text-xs` → `min-h-10 px-4 text-sm`, « un peu plus grand »). Lit `ui.screen`, `ui.mode` et `liveScreen` dans le store, appelle `setScreen`. Même rôle ARIA (`role="tablist"` / `role="tab"`, `aria-selected`) qu'avant, donc les tests qui cherchent `getByRole("tab", { name: "Win" })` continuent de le trouver, où qu'il soit dans l'arbre.

### 7.3 `layout/StudioTopBar.tsx`

Un bloc `<ScreenTabs />` prend place entre le groupe Undo/Redo et le groupe de droite (Saved/Issues/Open/Close) :

```tsx
<div className="order-last w-full justify-center py-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:py-0 flex">
  <ScreenTabs />
</div>
```

`sm:flex-1` lui donne l'espace du milieu sur un écran large (les onglets s'y centrent) ; en dessous de `sm:`, `order-last` et `w-full` le renvoient sur sa propre ligne, sous le reste de la barre (`flex-wrap` déjà en place sur le `<header>`), pour ne rien écraser sur un petit écran.

### 7.4 `layout/PreviewPane.tsx`

- Le premier bloc (onglets d'écran + langues) perd ses onglets : il ne reste que le sélecteur de langue, qui rejoint la ligne du dessous (Scenario/Outcome/Restart) — un seul bandeau de réglages au lieu de deux, puisqu'il n'a plus besoin de la place que prenaient les onglets.
- `onFlowScreen` (rapporté par `PreviewViewport`) appelle désormais `setLiveScreen(tabOf(screen))` (l'action du store) au lieu du `setLive` local, qui disparaît.
- La fonction `tabOf` reste ici : c'est `PreviewPane` qui sait, à partir d'un écran du parcours réel (`resolving`, `duplicate`…), à quel onglet il correspond.

## 8. E5 — Le menu déroulant des langues

`panels/LanguagesSection.tsx` garde son nom et son export `LOCALE_LABELS` (utilisé par `panels/game/QuizTranslationsEditor.tsx`), mais son contenu change complètement :

- **Un bouton déclencheur** (comme `fields/IconPicker.tsx` : icône, résumé, chevron), state géré par `usePopover` (`fields/Field.tsx`, déjà utilisé et testé ailleurs dans le Studio). Résumé affiché : les langues activées (« FR · AR · EN ») et la langue par défaut.
- **Un panneau qui s'ouvre en dessous**, une ligne par langue :
  - un bouton étoile pour la choisir par défaut (désactivé sur la langue déjà par défaut) ;
  - le nom de la langue ;
  - un interrupteur activer/désactiver (désactivé sur la langue par défaut : elle reste toujours offerte).
- **Choisir une langue par défaut qui était désactivée l'active du même geste** (le contraire serait absurde : la langue par défaut doit toujours être offerte). Petite amélioration par rapport à l'existant, qui ne permettait ce choix qu'à partir d'une langue déjà activée.
- Le menu **reste ouvert** après un clic (on peut enchaîner plusieurs réglages) ; il se ferme à l'Échap, au clic en dehors, ou en cliquant à nouveau sur le déclencheur.
- `<PanelIssues prefixes={["locales"]} />` (aujourd'hui sans effet : aucune règle de validation ne porte sur `locales.*`) reste appelé, **hors** du menu replié, pour qu'un futur avertissement ne se retrouve pas cliqué à un endroit qui ne l'affiche que replié.
- `panels/ContentPanel.tsx` : `<LanguagesSection />` déménage en tout début de `PanelBody`, avant la section « Texts ».
- Tests (`panels/contentSections.test.tsx`) : ouvrir le menu avant d'interagir ; remplacer `fireEvent.change(getByLabelText("Default language"), …)` par un clic sur le bouton étoile de la langue visée. Un test est ajouté : rendre par défaut une langue désactivée l'active aussi.

## 9. Vérifications de bout en bout

- `npx tsc --noEmit` et `npx eslint .` sans régression (0 erreur, ≤ 26 avertissements) à chaque tâche.
- `npx vitest run <fichiers concernés>` à chaque tâche, puis `npx vitest run --maxWorkers=2` (suite complète) au moins à la fin du lot.
- `npm run build` à la fin du lot (le Studio est chargé à la demande : vérifie qu'il compile toujours dans son propre fichier).
- Aucun changement dans `git diff --stat` en dehors des fichiers listés au §1.
