# Analyse Architecture — Intégration AkteraSpinWheel

> Générée le 2026-09-16. Branche : `Fix/PlayerScreenEditor`.

---

## 1. Flux actuel des joueurs

Le flux est une machine à états gérée par la variable `screen` dans `PlayerFlowPage.tsx`.

```
loading
  ├── not-found / inactive / duplicate / error  (états terminaux)
  └── landing  (PlayerLanding — formulaire nom/téléphone/consentement)
        └── handleRegister()
              ├── gameType = quiz        → screen "quiz" (PlayerQuiz)
              │                                └── handleQuizComplete() → callSelectPrize() → screen "result"
              ├── gameType = hit_it      → screen "hit_it" (PlayerHitIt)
              │                                └── handleHitItComplete() → callSelectPrize() → screen "result"
              ├── gameType = mystery_box → screen "mystery_box" (PlayerMysteryBox)
              │                                └── handleMysteryBoxSelect() → callSelectPrize() → screen "result"
              └── gameType = lucky_wheel / scratch_card
                    └── callSelectPrize() immédiatement
                          └── screen "submitting" (spinner)
                                └── prize déterminé côté serveur → serverPrize setState
                                      ├── lucky_wheel  → screen "game" (PlayerGame)
                                      │                        └── handleGameComplete() → screen "result"
                                      └── scratch_card → screen "scratch_card" (PlayerScratch)
                                                               └── handleScratchComplete() → screen "result"
```

**Point critique :** pour `lucky_wheel`, le résultat est résolu par le serveur _avant_ que la roue tourne. La roue n'est qu'une animation qui _révèle_ un résultat déjà connu.

---

## 2. Comment fonctionne AkteraSpinWheel et comment il est intégré

`AkteraSpinWheel.tsx` exporte le composant `SpinWheel`. Son fonctionnement interne :

- **Rendu** : SVG avec tranches calculées trigonométriquement, bouton central "SPIN" cliquable
- **Animation** : `requestAnimationFrame` avec easing cubique `1-(1-t)^4` sur ~4 500 ms, sons tick/win/lose via `aktera-audio`
- **Sélection de tranche (⚠ risque)** : `selectPrizeIndex()` ligne 144 utilise `Math.random()` pondéré par `probability` — sélection 100% côté client
- **Signal externe** : prop `externalSpinSignal` (`WheelSpinSignal`) pour déclencher un spin depuis l'extérieur (utilisé dans le prévisualiseur)
- **Callback de résultat** : `onSpinComplete(WheelSpinResult)` retourne `{ prize, rewardLabel, isWin, outcome }`
- **Types propres** : `WheelPrizeSlice` avec `{ id, labelEn, labelFr?, labelAr?, icon?, probability, category, value?, color? }`

### Intégration actuelle — uniquement dans l'éditeur

| Fichier                       | Rôle                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `RenderedElement.tsx:294`     | Rendu du slot `wheel.spinner` dans le runtime du player-ui-maker                                                                      |
| `PlayPreviewModal.tsx:10,128` | Importe les types `WheelSpinResult`/`WheelSpinSignal`, gère les actions `wheel.spinAction` et `wheel.result` pour la prévisualisation |

**`AkteraSpinWheel` n'est pas connecté à `PlayerFlowPage` ni au vrai flux de jeu.**

---

## 3. Ce qui existe déjà dans la logique du jeu

### Côté serveur (robuste)

- **Edge Function `select-prize`** : détermine le résultat, normalise les numéros algériens, gère la déduplication, assigne les codes coupon
- **RPC `resolve_game_outcome`** : fallback direct DB si l'Edge Function est inaccessible
- **RPC `record_campaign_impression`** : analytics de temps de session
- **Protection doublon** : par numéro de téléphone + campaign_id

### Côté client

- `callSelectPrize()` dans `PlayerFlowPage` : appel serveur + fallback RPC + construction du `Prize` résolu
- `PlayerGame.tsx` : wheel de production actuel — accepte `targetPrize` (résultat serveur) et `forcedOutcome`, fait atterrir la tranche correcte par calcul CSS `transform: rotate(...)`
- `AkteraWheelEngine.tsx` : wheel du simulateur de l'éditeur (toujours gagnant, index 0 forcé, format `AkteraBrandPreset.prizes`)

---

## 4. Ce qui manque pour une vraie logique de jeu complète

### Problème principal : `AkteraSpinWheel` n'a aucun mode "résultat forcé par le serveur"

La fonction `startSpin()` choisit toujours le gagnant côté client (`selectPrizeIndex()`). Il n'existe aucun prop `forcedPrizeId` ni `targetIndex` pour lui imposer l'atterrissage sur une tranche spécifique.

### Problème secondaire : incompatibilité de types

| Contexte                        | Type utilisé                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PlayerFlowPage` + `PlayerGame` | `Prize` (`types.ts`) : `{ id, name, icon, isWin, color, textColor, couponCode? }`                      |
| `AkteraSpinWheel`               | `WheelPrizeSlice` : `{ id, labelEn, labelFr?, labelAr?, probability, category, ... }`                  |
| `AkteraWheelEngine`             | Objet interne `AkteraBrandPreset.prizes` : `{ id, nameEn, nameFr, nameAr, icon, isWin, color, value }` |

### Ce qui manque concrètement

1. Un prop `forcedPrizeId?: string` (ou `targetSliceIndex?: number`) dans `SpinWheel` pour bypasser `selectPrizeIndex()` avec le résultat serveur
2. Une fonction de mapping `Prize → WheelPrizeSlice[]` dans `PlayerFlowPage` ou un utilitaire partagé
3. Le remplacement (ou wrapping) de `PlayerGame.tsx` par `AkteraSpinWheel` dans `PlayerFlowPage`
4. La transmission du `serverPrize.id` à la roue pour qu'elle atterrisse sur la bonne tranche
5. Un gestionnaire `onSpinComplete` qui appelle `handleGameComplete()` dans `PlayerFlowPage`

---

## 5. Composants, états, fonctions et fichiers concernés

### À modifier

| Fichier                                                    | Ce qui change                                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/player-editor/engines/AkteraSpinWheel.tsx` | Ajouter prop `forcedPrizeId?: string` ; modifier `startSpin()` pour bypasser `selectPrizeIndex()` quand le prop est présent                                 |
| `src/pages/play/PlayerFlowPage.tsx`                        | Remplacer `<PlayerGame>` par `<AkteraSpinWheel>` ; convertir `brandPreset.prizes: Prize[]` → `WheelPrizeSlice[]` ; passer `forcedPrizeId={serverPrize?.id}` |

### À créer

| Fichier                 | Rôle                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `src/lib/wheelUtils.ts` | Utilitaire `prizesToWheelSlices(prizes: Prize[], loserSlot: Prize): WheelPrizeSlice[]` |

### À ne pas toucher (sauf bug)

- `callSelectPrize()` — la logique serveur est correcte
- `supabase/functions/select-prize/` — ne pas modifier
- `PlayerResult.tsx`, `PlayerLanding.tsx`, `PlayerQuiz.tsx` — hors scope

---

## 6. Dépendances entre les parties du système

```
PlayerFlowPage
    │
    ├── callSelectPrize() ──────────► Supabase Edge Function select-prize
    │         │                              ▼
    │         └── setServerPrize()   (résultat: Prize | null)
    │
    ├── brandPreset.prizes (Prize[])        ← DB campaigns.prizes (mapped in loadCampaign)
    │         │
    │         └── [MANQUANT] → WheelPrizeSlice[]  ← AkteraSpinWheel attend ce format
    │
    └── <PlayerGame forcedOutcome targetPrize>   ← wheel de production actuel
              (à remplacer par AkteraSpinWheel)
                    │
                    └── onGameComplete() → handleGameComplete() → screen "result"

AkteraSpinWheel (usage actuel: éditeur seulement)
    │
    ├── RenderedElement.tsx (slot wheel.spinner)
    └── PlayPreviewModal.tsx (types WheelSpinSignal/Result)
```

**Dépendance critique** : `AkteraSpinWheel` reçoit `prizes?: WheelPrizeSlice[]` — si `undefined`, il utilise `DEFAULT_PRIZES` (8 slices hardcodées). Pour l'intégration production, il faut lui passer les vraies tranches de la campagne.

---

## 7. Risques et problèmes d'architecture identifiés

### 🔴 Risques critiques

**1. `selectPrizeIndex()` est client-side** (ligne 144-165 de `AkteraSpinWheel.tsx`)  
Si le composant est branché tel quel sans prop `forcedPrizeId`, le résultat affiché divergera du résultat enregistré en DB : le joueur voit une case, le serveur a enregistré une autre. Violation directe de la règle de sécurité "prize selection is always server-side".

**2. Trois implémentations de wheel en parallèle** : `PlayerGame`, `AkteraWheelEngine`, `AkteraSpinWheel`  
Aucune source de vérité unique. Un bug de calcul d'angle corrigé dans l'une ne se propage pas aux autres.

### 🟡 Risques moyens

**3. Duplication de `DEFAULT_PRIZES`**  
Identique dans `AkteraSpinWheel.tsx` (ligne 44) et `RenderedElement.tsx` (ligne 15). Une mise à jour n'en touchera qu'une.

**4. Mapping de couleurs instable dans `loadCampaign`** (ligne 256 de `PlayerFlowPage`)  
Les couleurs sont assignées par index depuis `WHEEL_COLORS[]`. Si la DB renvoie les prizes dans un ordre différent entre deux chargements, les couleurs des tranches changent — visuellement instable.

**5. `PlayerContext.tsx` non utilisé par `PlayerFlowPage`**  
Le contexte définit `setGameResult`, `goToScreen`, etc., mais `PlayerFlowPage` gère tout en local state. Doublon architectural.

### 🟢 Risques faibles

**6. Math de rotation de `AkteraSpinWheel`** (ligne 213-218)  
`targetDegree = 360 - targetSliceAngle + 270` compense l'orientation de la roue. À vérifier que cette formule est aussi correcte quand `selectedIndex` est imposé de l'extérieur.

---

## Plan d'implémentation étape par étape

### Dépendances entre étapes

```
Étape 1 (AkteraSpinWheel: forcedPrizeId)  ──┐
                                              ├── Étape 3 (PlayerFlowPage: branchement réel) ← point critique
Étape 2 (wheelUtils: mapping Prize→Slice)  ──┘
                                                    └── Étape 4 (langue)
                                                          └── Étape 5 (nettoyage RenderedElement)
                                                                └── Étape 6 (archivage PlayerGame)
```

Les étapes 1 et 2 sont indépendantes et peuvent être faites en parallèle. L'étape 3 dépend des deux.

---

### Étape 1 — Ajouter `forcedPrizeId` à `AkteraSpinWheel`

**Ce qui doit être fait :**  
Ajouter un prop `forcedPrizeId?: string` à `SpinWheelProps`. Dans `startSpin()`, si ce prop est présent, remplacer l'appel à `selectPrizeIndex()` par une recherche de l'index correspondant dans `wheelPrizes`. Le reste de la logique d'animation est inchangé.

**Fichiers concernés :**  
`src/components/player-editor/engines/AkteraSpinWheel.tsx`

**Pourquoi :**  
Modification minimale qui rend le composant compatible avec une sélection serveur, sans casser l'usage existant dans l'éditeur (le prop est optionnel).

**Comment tester :**  
Dans `PlayPreviewModal`, passer temporairement `forcedPrizeId="voucher-20"` et vérifier que la roue atterrit systématiquement sur "20% Voucher". Sans le prop, le comportement aléatoire actuel doit rester intact.

---

### Étape 2 — Créer l'utilitaire de mapping `Prize → WheelPrizeSlice`

**Ce qui doit être fait :**  
Créer `src/lib/wheelUtils.ts` avec :

- `prizeToWheelSlice(prize: Prize, index: number): WheelPrizeSlice`
- `buildWheelSlices(prizes: Prize[]): WheelPrizeSlice[]`

Le `LOSER_SLOT` (`isWin: false`) devient une tranche `category: "empty"`.

**Fichiers concernés :**  
`src/lib/wheelUtils.ts` (nouveau fichier), `src/types.ts` (lecture uniquement)

**Pourquoi :**  
Centralise la conversion entre les deux représentations de prize. Sans ça, la même logique sera dupliquée dans chaque fichier qui branche `AkteraSpinWheel` à des données de campagne.

**Comment tester :**  
Donner un tableau `Prize[]` connu, vérifier que le résultat contient les bons `id`, `labelEn`, `category`, et que les probabilités sont cohérentes.

---

### Étape 3 — Remplacer `<PlayerGame>` par `<AkteraSpinWheel>` dans `PlayerFlowPage`

**Ce qui doit être fait :**  
Dans `PlayerFlowPage.tsx`, au screen `"game"` :

1. Appeler `buildWheelSlices(brandPreset.prizes)` pour obtenir les `WheelPrizeSlice[]`
2. Remplacer `<PlayerGame>` par `<AkteraSpinWheel prizes={wheelSlices} forcedPrizeId={serverPrize?.id} onSpinComplete={...} language={...} />`
3. Dans le callback `onSpinComplete`, appeler `handleGameComplete(serverPrize)` pour passer à l'écran résultat

**Fichiers concernés :**  
`src/pages/play/PlayerFlowPage.tsx`, `src/components/PlayerGame.tsx` (import supprimé)

**Pourquoi :**  
Branchement central — le composant visuellement finalisé remplace l'ancien. `forcedPrizeId` garantit l'alignement entre animation et résultat serveur.

**Comment tester :**

1. `npm run dev`, accéder à `/play/<slug>` d'une campagne `lucky_wheel` active
2. Soumettre le formulaire avec un numéro test
3. Vérifier que la roue atterrit sur la tranche correspondant au résultat en DB (table `entries`, colonne `prize_id`)
4. Tester le cas "no prize" (LOSER_SLOT) — la roue doit atterrir sur la tranche `category: "empty"`
5. `npm run typecheck` doit passer sans erreur

---

### Étape 4 — Propager la langue du contexte à la roue

**Ce qui doit être fait :**  
Détecter la langue active (depuis `LanguageContext` ou `i18n.language`) dans `PlayerFlowPage` et la passer en prop `language` à `AkteraSpinWheel`. Les labels arabes utilisent déjà `dir="auto"` dans le SVG.

**Fichiers concernés :**  
`src/pages/play/PlayerFlowPage.tsx`

**Pourquoi :**  
Sans ça, toutes les tranches s'affichent en anglais même si l'utilisateur est en arabe — les `labelAr` des `WheelPrizeSlice` ne sont jamais utilisés en production.

**Comment tester :**  
Changer la langue du navigateur en arabe, charger une campagne et vérifier que les labels des tranches s'affichent en arabe.

---

### Étape 5 — Nettoyage : supprimer `DEFAULT_RUNTIME_WHEEL_PRIZES` dans `RenderedElement.tsx`

**Ce qui doit être fait :**  
Supprimer la constante dupliquée `DEFAULT_RUNTIME_WHEEL_PRIZES` (lignes 16-24 de `RenderedElement.tsx`) et laisser `SpinWheel` utiliser ses propres defaults en passant `prizes={undefined}`, ou re-exporter `DEFAULT_PRIZES` depuis `AkteraSpinWheel.tsx`.

**Fichiers concernés :**  
`src/components/player-ui-maker/runtime/RenderedElement.tsx`

**Pourquoi :**  
Élimine la divergence silencieuse — si on modifie les prizes par défaut dans `AkteraSpinWheel`, `RenderedElement` ne suivrait pas.

**Comment tester :**  
Ouvrir `PlayPreviewModal` depuis l'éditeur et vérifier que la roue s'affiche toujours correctement. `npm run build` sans warning.

---

### Étape 6 (optionnel) — Archiver `PlayerGame.tsx` et aligner `PlayerContext`

**Ce qui doit être fait :**  
Une fois l'étape 3 validée, `PlayerGame.tsx` n'est plus importé nulle part — le supprimer ou le déplacer dans `_deprecated/`. Évaluer si `PlayerContext.tsx` doit prendre en charge le flux de `PlayerFlowPage` (refactoring plus large, hors scope immédiat).

**Fichiers concernés :**  
`src/components/PlayerGame.tsx`, `src/contexts/PlayerContext.tsx`

**Pourquoi :**  
Réduit la dette technique et clarifie quelle implémentation est authoritative.

**Comment tester :**  
`npm run build` — zéro import manquant, zéro warning.
