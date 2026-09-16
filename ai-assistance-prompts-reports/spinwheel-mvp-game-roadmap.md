# SpinWheel MVP — Roadmap d'implémentation client-side

> Analyse réalisée le 2026-09-16. Branche : `Fix/PlayerScreenEditor`.
> Périmètre : rendre le jeu de roue fonctionnel côté client dans l'éditeur. Pas de logique serveur.

---

## Contexte et objectif

**Fichier source de la logique de jeu :** `src/components/player-editor/games/spinn.tsx`
**Composant cible (UI + logique finale) :** `src/components/player-editor/engines/AkteraSpinWheel.tsx`
**Contexte d'exécution :** `AkteraPhoneSimulator.tsx` → Screen 2 (Interaction Engine)

La logique d'animation dans `spinn.tsx` et `AkteraSpinWheel.tsx` est **quasi-identique** (même `requestAnimationFrame`, même easing cubique `1-(1-t)^4`, même formule de rotation `360 - targetSliceAngle + 270`). Le travail principal est de :

1. Corriger les imports cassés dans `spinn.tsx` pour qu'il compile
2. Brancher `SpinWheel` (de `AkteraSpinWheel.tsx`) dans `AkteraPhoneSimulator.tsx` à la place de `AkteraWheelEngine`
3. Résoudre les incompatibilités de types et de callbacks entre les deux systèmes

---

## Diagnostic complet — Issues identifiées

### Catégorie A : Issues bloquantes — le fichier `spinn.tsx` ne compile pas du tout

---

#### ISSUE-01 — Import `../../types` cassé : types `BrandTokens`, `Prize`, `Language` inexistants

**Fichier :** `src/components/player-editor/games/spinn.tsx:2`

```typescript
// ❌ CASSÉ — le chemin résout vers src/components/types qui n'existe pas
import { BrandTokens, Prize, Language } from "../../types";
```

**Diagnostic :**

- Le chemin `../../types` depuis `src/components/player-editor/games/` pointe vers `src/components/types` — fichier inexistant
- `BrandTokens` n'existe nulle part dans le projet
- `Prize` dans `spinn.tsx` est utilisé pour les tranches de roue (`labelEn`, `labelFr`, `labelAr`, `probability`, `category`, `id`) — c'est exactement `WheelPrizeSlice` dans `AkteraSpinWheel.tsx`
- `Language` dans `spinn.tsx` est `'en' | 'fr' | 'ar'` — c'est exactement `WheelLanguage` dans `AkteraSpinWheel.tsx`

**Fix :**

```typescript
// ✅ Importer les types équivalents déjà existants
import {
  WheelPrizeSlice as Prize,
  WheelLanguage as Language,
} from "../engines/AkteraSpinWheel";
// BrandTokens → remplacer par { primaryColor: string; secondaryColor: string; logoText?: string }
interface BrandTokens {
  primaryColor: string;
  secondaryColor: string;
  logoText?: string;
  colorMode?: "dark" | "light";
}
```

---

#### ISSUE-02 — Import `../../data/campaigns` cassé : `WHEEL_PRIZES` inexistant

**Fichier :** `src/components/player-editor/games/spinn.tsx:3`

```typescript
// ❌ CASSÉ — src/components/data/campaigns n'existe pas
import { WHEEL_PRIZES } from "../../data/campaigns";
```

**Diagnostic :**

- Le fichier `src/components/data/campaigns.ts` n'existe pas
- L'équivalent est `DEFAULT_PRIZES` dans `AkteraSpinWheel.tsx` (ligne 44) — même structure, mêmes données

**Fix :**

```typescript
// ✅ Importer DEFAULT_PRIZES depuis AkteraSpinWheel (après l'avoir exporté — voir ISSUE-05)
import { DEFAULT_PRIZES as WHEEL_PRIZES } from "../engines/AkteraSpinWheel";
```

---

#### ISSUE-03 — Import `../../utils/audio` cassé : `soundManager` inexistant

**Fichier :** `src/components/player-editor/games/spinn.tsx:4`

```typescript
// ❌ CASSÉ — src/components/utils/audio n'existe pas, soundManager non défini
import { soundManager } from "../../utils/audio";
```

**Diagnostic :**

- Le fichier `src/components/utils/audio.ts` n'existe pas
- L'audio du projet est dans `src/components/player-editor/aktera-audio.ts`
- `aktera-audio.ts` exporte des fonctions nommées directement (pas d'objet `soundManager`)

**Fix :**

```typescript
// ✅ Importer les fonctions nommées depuis aktera-audio
import { playClick, playTick, playWin, playLose } from "../aktera-audio";
```

---

#### ISSUE-04 — API `soundManager.*` incompatible avec `aktera-audio.ts`

**Fichier :** `src/components/player-editor/games/spinn.tsx:40,47,52,91,95`

```typescript
soundManager.playClick(); // ligne 40
soundManager.playTick(); // ligne 47
soundManager.playMiss(); // ligne 52 — ❌ n'existe pas dans aktera-audio.ts
soundManager.playWin(); // ligne 91
// et aussi:
soundManager.playTick(); // dans animateSpin
```

**Diagnostic :**

- `aktera-audio.ts` exporte : `playClick`, `playTick`, `playWin`, `playLose` — PAS de `playMiss`
- `soundManager.playMiss()` doit être remplacé par `playLose()`

**Table de correspondance :**

| `spinn.tsx`                | `aktera-audio.ts` | Status      |
| -------------------------- | ----------------- | ----------- |
| `soundManager.playClick()` | `playClick()`     | ✅          |
| `soundManager.playTick()`  | `playTick()`      | ✅          |
| `soundManager.playMiss()`  | `playLose()`      | ⚠️ renommer |
| `soundManager.playWin()`   | `playWin()`       | ✅          |

---

### Catégorie B : Issues d'intégration — le jeu compile mais ne tourne pas dans l'éditeur

---

#### ISSUE-05 — `DEFAULT_PRIZES` non exporté depuis `AkteraSpinWheel.tsx`

**Fichier :** `src/components/player-editor/engines/AkteraSpinWheel.tsx:44`

```typescript
// ❌ Actuellement — pas d'export
const DEFAULT_PRIZES: WheelPrizeSlice[] = [ ... ];
```

**Diagnostic :**

- `DEFAULT_PRIZES` est utilisé en interne mais pas exporté
- `spinn.tsx` (après fix ISSUE-02) et `RenderedElement.tsx` (qui a sa propre copie dupliquée) en ont besoin
- `RenderedElement.tsx` a déjà une copie identique `DEFAULT_RUNTIME_WHEEL_PRIZES` (dette technique)

**Fix :**

```typescript
// ✅ Ajouter export
export const DEFAULT_PRIZES: WheelPrizeSlice[] = [ ... ];
```

---

#### ISSUE-06 — Aucune fonction de mapping `AkteraBrandPreset.prizes → WheelPrizeSlice[]`

**Fichiers concernés :** `AkteraSpinWheel.tsx` ou nouveau fichier utilitaire

**Diagnostic :**
`AkteraBrandPreset.prizes` et `WheelPrizeSlice` ont des structures différentes :

| Champ dans `AkteraBrandPreset.prizes` | Champ dans `WheelPrizeSlice` | Statut                           |
| ------------------------------------- | ---------------------------- | -------------------------------- |
| `id`                                  | `id`                         | ✅ direct                        |
| `nameEn`                              | `labelEn`                    | ❌ renommer                      |
| `nameFr`                              | `labelFr`                    | ❌ renommer                      |
| `nameAr`                              | `labelAr`                    | ❌ renommer                      |
| `icon`                                | `icon`                       | ✅ direct                        |
| `color`                               | `color`                      | ✅ direct                        |
| `value`                               | `value`                      | ✅ direct                        |
| `isWin: true/false`                   | `category: "win"/"empty"`    | ❌ convertir                     |
| _(absent)_                            | `probability: number`        | ❌ calculer (distribution égale) |

**Fix — fonction à créer :**

```typescript
export function presetPrizesToWheelSlices(
  prizes: AkteraBrandPreset["prizes"],
): WheelPrizeSlice[] {
  const equalProb = 1 / prizes.length;
  return prizes.map((p) => ({
    id: p.id,
    labelEn: p.nameEn,
    labelFr: p.nameFr,
    labelAr: p.nameAr,
    icon: p.icon,
    color: p.color,
    value: p.value,
    category: p.isWin ? "win" : "empty",
    probability: equalProb,
  }));
}
```

Peut être définie dans `AkteraSpinWheel.tsx` (exportée) ou dans `aktera-presets.ts`.

---

#### ISSUE-07 — `AkteraWheelEngine` hardcode toujours le gagnant à l'index 0

**Fichier :** `src/components/player-editor/engines/AkteraWheelEngine.tsx:83`

```typescript
// ❌ Hardcodé — toujours gagner, jamais perdre
const winningIndex = 0; // First slice is top reward
```

**Diagnostic :**

- Quel que soit le joueur, il gagne toujours le premier prix
- Ce comportement est incorrect pour un simulateur de jeu
- Ce composant sera remplacé par `SpinWheel` (ISSUE-08) — cette issue est donc implicitement résolue

---

#### ISSUE-08 — `AkteraWheelEngine` non remplacé par `SpinWheel` dans `AkteraPhoneSimulator`

**Fichier :** `src/components/player-editor/AkteraPhoneSimulator.tsx:358-365`

```typescript
// ❌ Actuellement — AkteraWheelEngine toujours utilisé
{mechanic === "wheel" && (
  <AkteraWheelEngine
    preset={preset}
    lang={lang}
    isLight={isLight}
    onWin={handleGameWin}
  />
)}
```

**Diagnostic :**

- `SpinWheel` (de `AkteraSpinWheel.tsx`) est le composant cible
- Il accepte `prizes?: WheelPrizeSlice[]`, `language?: WheelLanguage`, `onSpinComplete?`
- Il contient son propre bouton SPIN (pas besoin de CTA externe dans Slot 7)
- Il gère lui-même son état interne `isSpinning`

**Fix :**

```typescript
// ✅ Remplacer par SpinWheel avec prizes mappés et callback adapté
{mechanic === "wheel" && (
  <SpinWheel
    prizes={presetPrizesToWheelSlices(preset.prizes)}
    language={lang as WheelLanguage}
    primaryColor={preset.primaryColor}
    secondaryColor={preset.secondaryColor}
    logoText={preset.name}
    onSpinComplete={(result) => {
      if (result.isWin) {
        handleGameWin(result.rewardLabel, result.prize.value || '');
      } else {
        handleGameLose();
      }
    }}
  />
)}
```

---

#### ISSUE-09 — Mismatch de callback : `onSpinComplete(WheelSpinResult)` vs `onWin(name, val) / onLose()`

**Fichiers :** `AkteraSpinWheel.tsx` (source) ↔ `AkteraPhoneSimulator.tsx` (consommateur)

**Diagnostic :**

`SpinWheel.onSpinComplete` retourne :

```typescript
{
  prize: WheelPrizeSlice; // la tranche gagnante
  rewardLabel: string; // label localisé
  isWin: boolean;
  outcome: "win" | "lose";
}
```

Mais `AkteraPhoneSimulator` attend :

```typescript
onWin(name: string, val: string) → navigue vers screen 3 (Lead Capture)
onLose()                         → navigue vers screen 5 (Consolation)
```

**Fix :** L'adaptateur est dans ISSUE-08 — brancher `result.rewardLabel` → `name` et `result.prize.value` → `val`.

---

#### ISSUE-10 — Incompatibilité de types TypeScript : `AkteraLang` vs `WheelLanguage`

**Fichiers :** `aktera-i18n.ts` (source de `AkteraLang`) ↔ `AkteraSpinWheel.tsx` (source de `WheelLanguage`)

**Diagnostic :**

```typescript
// aktera-i18n.ts
export type AkteraLang = "fr" | "ar" | "en";

// AkteraSpinWheel.tsx
export type WheelLanguage = "en" | "fr" | "ar";
```

Les valeurs runtime sont **identiques**. TypeScript va quand même rejeter l'assignation directe entre les deux types.

**Fix :**

```typescript
// Cast dans AkteraPhoneSimulator lors du passage du prop
language={lang as WheelLanguage}
```

---

### Catégorie C : Issue secondaire — dette technique

---

#### ISSUE-11 — `DEFAULT_RUNTIME_WHEEL_PRIZES` dupliqué dans `RenderedElement.tsx`

**Fichier :** `src/components/player-ui-maker/runtime/RenderedElement.tsx:15-24`

**Diagnostic :**

- Copie exacte de `DEFAULT_PRIZES` depuis `AkteraSpinWheel.tsx`
- Après ISSUE-05 (export de `DEFAULT_PRIZES`), cette copie devient obsolète
- Non bloquant pour le MVP mais crée une divergence silencieuse

**Fix (après MVP stable) :**

```typescript
// Remplacer la constante locale par un import direct
import { DEFAULT_PRIZES } from "../player-editor/engines/AkteraSpinWheel";
// et supprimer DEFAULT_RUNTIME_WHEEL_PRIZES
```

---

## Résumé des issues

| #   | Issue                                                           | Fichier principal                   | Bloquant ?               | Taille |
| --- | --------------------------------------------------------------- | ----------------------------------- | ------------------------ | ------ |
| 01  | Import `../../types` cassé                                      | `spinn.tsx:2`                       | ✅ Oui                   | XS     |
| 02  | Import `../../data/campaigns` cassé                             | `spinn.tsx:3`                       | ✅ Oui                   | XS     |
| 03  | Import `../../utils/audio` cassé                                | `spinn.tsx:4`                       | ✅ Oui                   | XS     |
| 04  | API `soundManager.*` incompatible                               | `spinn.tsx:40,47,52`                | ✅ Oui                   | XS     |
| 05  | `DEFAULT_PRIZES` non exporté                                    | `AkteraSpinWheel.tsx:44`            | ✅ Oui                   | XS     |
| 06  | Pas de mapping `AkteraBrandPreset.prizes` → `WheelPrizeSlice[]` | `AkteraSpinWheel.tsx` (nouveau)     | ✅ Oui                   | S      |
| 07  | `AkteraWheelEngine` hardcode index 0                            | `AkteraWheelEngine.tsx:83`          | ✅ Oui (résolu par #08)  | —      |
| 08  | `SpinWheel` pas branché dans `AkteraPhoneSimulator`             | `AkteraPhoneSimulator.tsx:359`      | ✅ Oui                   | S      |
| 09  | Mismatch callback `onSpinComplete` vs `onWin/onLose`            | Adapter dans `AkteraPhoneSimulator` | ✅ Oui (résolu dans #08) | —      |
| 10  | Type `AkteraLang` vs `WheelLanguage` incompatibles              | `AkteraPhoneSimulator.tsx`          | ✅ Oui                   | XS     |
| 11  | `DEFAULT_RUNTIME_WHEEL_PRIZES` dupliqué                         | `RenderedElement.tsx:15`            | ❌ Non (post-MVP)        | XS     |

---

## Roadmap d'implémentation — ordre logique

### TÂCHE 1 — Exporter `DEFAULT_PRIZES` depuis `AkteraSpinWheel.tsx`

**Fichier :** `src/components/player-editor/engines/AkteraSpinWheel.tsx:44`

Ajouter `export` devant `const DEFAULT_PRIZES`.

**Dépendances :** aucune
**Résout :** ISSUE-05
**Taille :** 1 mot à ajouter
**Test :** `npm run typecheck` passe

---

### TÂCHE 2 — Ajouter la fonction `presetPrizesToWheelSlices` dans `AkteraSpinWheel.tsx`

**Fichier :** `src/components/player-editor/engines/AkteraSpinWheel.tsx`

Ajouter et exporter la fonction de mapping (voir code dans ISSUE-06). La placer juste avant le composant `SpinWheel`.

**Dépendances :** TÂCHE 1 (pour avoir les types disponibles)
**Résout :** ISSUE-06
**Taille :** ~15 lignes
**Test :** appeler `presetPrizesToWheelSlices(AKTERA_BRAND_PRESETS[0].prizes)` dans la console, vérifier que chaque slice a `labelEn`, `category`, `probability`.

---

### TÂCHE 3 — Corriger les imports de `spinn.tsx` (ISSUE-01 à 04)

**Fichier :** `src/components/player-editor/games/spinn.tsx:2-5`

Remplacer les 3 imports cassés et l'interface `BrandTokens` :

```typescript
// Avant (cassé)
import { BrandTokens, Prize, Language } from "../../types";
import { WHEEL_PRIZES } from "../../data/campaigns";
import { soundManager } from "../../utils/audio";

// Après (corrigé)
import {
  WheelPrizeSlice as Prize,
  WheelLanguage as Language,
  DEFAULT_PRIZES as WHEEL_PRIZES,
} from "../engines/AkteraSpinWheel";
import { playClick, playTick, playWin, playLose } from "../aktera-audio";

interface BrandTokens {
  primaryColor: string;
  secondaryColor: string;
  logoText?: string;
  colorMode?: "dark" | "light";
}
```

Remplacer aussi dans le corps du composant :

- `soundManager.playClick()` → `playClick()`
- `soundManager.playTick()` → `playTick()`
- `soundManager.playMiss()` → `playLose()`
- `soundManager.playWin()` → `playWin()`

**Dépendances :** TÂCHE 1 (export `DEFAULT_PRIZES`)
**Résout :** ISSUE-01, 02, 03, 04
**Taille :** ~10 lignes à modifier
**Test :** `npm run typecheck` ne signale plus d'erreur sur `spinn.tsx`

---

### TÂCHE 4 — Remplacer `AkteraWheelEngine` par `SpinWheel` dans `AkteraPhoneSimulator.tsx`

**Fichier :** `src/components/player-editor/AkteraPhoneSimulator.tsx`

**4a. Ajouter les imports nécessaires :**

```typescript
import {
  SpinWheel,
  WheelLanguage,
  presetPrizesToWheelSlices,
} from "./engines/AkteraSpinWheel";
// Supprimer ou laisser l'import AkteraWheelEngine (il peut rester inutilisé le temps de tester)
```

**4b. Remplacer le bloc `mechanic === "wheel"` (ligne ~358) :**

```typescript
{mechanic === "wheel" && (
  <SpinWheel
    prizes={presetPrizesToWheelSlices(preset.prizes)}
    language={lang as WheelLanguage}
    primaryColor={preset.primaryColor}
    secondaryColor={preset.secondaryColor}
    logoText={preset.name}
    onSpinComplete={(result) => {
      if (result.isWin) {
        handleGameWin(result.rewardLabel, result.prize.value || '');
      } else {
        handleGameLose();
      }
    }}
    className="w-full h-full"
  />
)}
```

**Dépendances :** TÂCHE 1 + TÂCHE 2
**Résout :** ISSUE-07, 08, 09, 10
**Taille :** ~15 lignes à modifier
**Test :**

1. Ouvrir l'éditeur Player Screen
2. Sélectionner mécanique "wheel" + n'importe quel preset
3. Cliquer SPIN → la roue doit animer avec les vrais prizes du preset
4. Vérifier que l'atterrissage sur une tranche `isWin: true` navigue vers Screen 3 (Lead Capture)
5. Vérifier que l'atterrissage sur la tranche `isWin: false` navigue vers Screen 5 (Consolation)
6. Tester en mode light et dark
7. Tester avec lang = fr, ar, en (les labels des tranches doivent changer)

---

### TÂCHE 5 (post-MVP) — Nettoyer `RenderedElement.tsx`

**Fichier :** `src/components/player-ui-maker/runtime/RenderedElement.tsx:15-24`

Supprimer `DEFAULT_RUNTIME_WHEEL_PRIZES` et importer `DEFAULT_PRIZES` depuis `AkteraSpinWheel.tsx`.

**Dépendances :** TÂCHE 1 (stable en prod)
**Résout :** ISSUE-11
**Test :** Ouvrir `PlayPreviewModal` depuis le player-ui-maker, vérifier que la roue s'affiche normalement.

---

## Dépendances entre tâches

```
TÂCHE 1 (export DEFAULT_PRIZES)
    ├── TÂCHE 2 (mapping function)
    │       └── TÂCHE 4 (brancher SpinWheel dans AkteraPhoneSimulator) ← POINT CLÉ MVP
    │
    └── TÂCHE 3 (fix imports spinn.tsx)
              (indépendant de TÂCHE 4)

TÂCHE 5 (nettoyage RenderedElement) — après MVP stable
```

---

## Ce qui fonctionne déjà dans `AkteraSpinWheel.tsx` sans modification

- Animation `requestAnimationFrame` avec easing identique à `spinn.tsx`
- Formule de rotation correcte (`360 - targetSliceAngle + 270`)
- Tick audio à chaque passage de tranche
- Son win/lose à la fin
- Multilangue (`WheelLanguage`)
- Signal externe `externalSpinSignal` (utilisé dans `PlayPreviewModal`, préservé)
- Support `primaryColor`, `secondaryColor`, `logoText` en props
- Bouton SPIN interne (centre de la roue)
- Affichage du label gagnant en bas après le spin

## Ce qui n'est PAS dans le scope MVP

- `forcedPrizeId` côté serveur (prévu pour une prochaine étape)
- Connexion à `PlayerFlowPage` et à l'Edge Function `select-prize`
- Remplacement de `PlayerGame.tsx` dans le flux public `/play/:slug`
- Animation confetti sur win dans le simulateur (optionnel, pas bloquant)
- Nettoyage de `AkteraWheelEngine.tsx` (supprimer le fichier)
