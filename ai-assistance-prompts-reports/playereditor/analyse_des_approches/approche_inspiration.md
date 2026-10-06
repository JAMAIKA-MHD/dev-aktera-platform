# Analyse — Approche « Aktera » (grammaire à 8 slots) vs architecture actuelle

**Date :** 2026-09-17
**Dossier analysé :** `aktera---gamified-marketing-experience/` (non suivi par git)
**Branche :** `Fix/PlayerScreenEditor`
**Statut :** analyse uniquement, aucune modification de code
**Document lié :** [`approche_actuel.md`](./approche_actuel.md)

---

## 1. Résumé

| Question                                                  | Réponse courte                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Le **concept** Aktera correspond-il à ce qu'on veut ?     | **Oui.** Une grammaire d'écran fixe, des tokens de marque et des textes configurables : c'est exactement l'approche « templates + personnalisation limitée » recommandée dans le document lié.                                                   |
| Est-il meilleur que le Player UI Maker (canvas libre) ?   | **Oui, nettement.** Responsive par construction, pas de mise en page cassable, UX mobile cohérente, beaucoup moins de complexité.                                                                                                                |
| Le **code** peut-il être utilisé tel quel en production ? | **Non.** C'est un prototype de design généré avec Google AI Studio, sans backend. Il enfreint plusieurs règles non négociables du projet (tirage côté client, consentement pré-coché et placé après la partie) et contient des bugs de parcours. |
| Recommandation                                            | **Adopter la grammaire, les tokens et les composants visuels comme couche de rendu**, et reconstruire la couche données/flux sur l'existant de production (Supabase, `select-prize`, consentement, anti-doublon).                                |

---

## 2. Ce qu'est le projet Aktera

### 2.1 Carte d'identité

- **Origine :** application Google AI Studio (`metadata.json`, `assets/.aistudio/`, README AI Studio).
- **Stack :** React 19, Vite 6, Tailwind v4, `motion`, `lucide-react`.
- **Taille :** environ 7 200 lignes, dont `App.tsx` (640), `data/campaigns.ts` (736), `WelcomeTeaser.tsx` (558), `StudioControls.tsx` (522).
- **Backend :** aucun. Pas d'appel réseau, pas de Supabase, pas de persistance.
- **Dépendances inutilisées :** `@google/genai`, `express`, `dotenv` (aucun import trouvé dans `src/`).
- **Tests / lint :** aucun (le script `lint` se limite à `tsc --noEmit`).

### 2.2 Architecture

```
App.tsx (orchestrateur : état du parcours + configuration des slots par écran)
 ├─ PhoneFrame                     cadre téléphone de prévisualisation (375 px)
 │   └─ SlotContainer              colonne flex verticale, 8 slots toujours dans le même ordre
 │       ├─ Slot1BrandHeader       logo (icône) + nom de marque + point live
 │       ├─ Slot2HeroVisual        visuel dominant optionnel
 │       ├─ Slot3Title             titre (2 lignes max)
 │       ├─ Slot4SupportingCopy    sous-titre optionnel
 │       ├─ Slot5PrimaryInteraction  zone de jeu (≈50 % de la hauteur)
 │       │    └─ WelcomeTeaser | SpinWheel | SpeedQuiz | ScratchCard | LuckyBoxes |
 │       │       PersonaJourney | SwipeBattle | DropCatcher | FeatureDuel | MemoryRecall |
 │       │       ProductExplorer | PriceGuesser | MoodMatch | LeadCaptureForm |
 │       │       RewardVoucher | LoseConsolation
 │       ├─ Slot6Reinforcement     tentatives / timer / progression
 │       ├─ Slot7Cta               1 bouton principal + 1 secondaire max
 │       └─ Slot8FooterUtility     liens légaux + mention
 └─ StudioControls                 panneau : écran, mécanique, presets de marque, tokens, langue
```

- **Parcours :** `welcome → game → lead → win` ou `welcome → game → lose`.
- **Personnalisation :** `BrandTokens` (`src/types.ts:13`) regroupe couleurs primaire/secondaire/accent, fond (uni, dégradé, mesh, points, image), arrondis (`sharp` / `rounded` / `pill`), mode sombre/clair, nom et icône du logo.
- **Textes :** dictionnaire global `UI_STRINGS` en fr/ar/en (`src/data/campaigns.ts:393`), plus des chaînes écrites directement dans `App.tsx`.
- **Presets :** 14 marques de démonstration (`src/data/campaigns.ts:3-241`).

### 2.3 Lien avec le dépôt principal

- **Il existe déjà un portage partiel.** `src/components/player-editor/` (≈5 900 lignes : `AkteraPhoneSimulator`, `aktera-presets`, `aktera-i18n`, `AkteraScreenWelcome`…) reprend cette même grammaire à 8 slots. Ce portage n'est **pas branché** sur la page publique `/play/:slug`.
- **La capture de référence en vient.** Le design partagé pour le pregame (« Tentez votre chance instantanément », roue avec moyeu PLAY, carte GRAND JACKPOT, chips, LANCER LE JEU, footer Privacy/Terms/Support) correspond à l'écran d'accueil « Midnight Gold » de ce prototype.

---

## 3. Points forts

1. **La grammaire fixe est un vrai système de template.**
   - Chaque écran utilise les mêmes 8 zones dans le même ordre ; une zone peut être masquée mais jamais déplacée.
   - Le rendu est **responsive par construction** (colonne flex) : aucune position absolue à calculer.
   - C'est ce qui rend le rethémage instantané, y compris par des équipes non techniques.
2. **Le niveau de personnalisation est le bon.** Couleurs, fond (dont image de marque), arrondis, mode sombre/clair, nom de marque, langue : ce qu'un marketeur attend, sans pouvoir casser la mise en page.
3. **Des règles UX explicites** (`SlotInspectorModal.tsx`, bannière de `App.tsx`) :
   - un seul CTA dominant, zone tactile de 44 px minimum ;
   - marque identifiable en moins de 2 secondes ;
   - états de victoire/défaite jamais signalés par la couleur seule ;
   - aucune impasse (« no dead ends »).
4. **Bilingue fr/ar/en avec RTL**, pensé dès le départ (`dir` sur chaque slot).
5. **Une riche bibliothèque de mécaniques** (12), dont plusieurs orientées données déclarées (zero-party data) : duel de préférences, humeur, persona, swipe.
6. **Une qualité visuelle élevée** : c'est la référence visuelle actuelle du produit.
7. **Des boucles virales** : partage WhatsApp/Facebook du bon et « +1 essai » sur l'écran de défaite.
8. **Un « Studio » qui préfigure le bon éditeur** : presets, éditeur de tokens, choix de l'écran, de la mécanique et de la langue, avec aperçu en direct. C'est la bonne UX, à compléter.

---

## 4. Points faibles

### 4.1 Règles non négociables enfreintes (bloquant pour la production)

| #   | Problème                                                                                                                                                                      | Référence                                                                                                                                                                         | Règle `CLAUDE.md`                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | **Tirage du lot côté client** : `Math.random()` pondéré par des probabilités présentes dans le bundle.                                                                        | `components/games/SpinWheel.tsx:43-53`                                                                                                                                            | Tirage côté serveur uniquement         |
| 2   | **Les autres jeux décident eux-mêmes du lot.** Premier lot non vide, lot selon l'index de la boîte, ou toujours `WHEEL_PRIZES[0]` : tout le monde gagne, sans quota ni stock. | `DropCatcher.tsx:155`, `LuckyBoxes.tsx:37`, `SpeedQuiz.tsx:91` (+ `FeatureDuel`, `MemoryRecall`, `MoodMatch`, `PersonaJourney`, `PriceGuesser`, `ProductExplorer`, `SwipeBattle`) | Tirage côté serveur uniquement         |
| 3   | **Consentement pré-coché** (`useState(true)`).                                                                                                                                | `App.tsx:49`                                                                                                                                                                      | Consentement strict (loi 18-07)        |
| 4   | **Consentement recueilli après la partie** : `game → lead → win`.                                                                                                             | `App.tsx:62-68`                                                                                                                                                                   | Consentement avant toute participation |
| 5   | **Aucune protection anti-doublon.** Le « +1 essai » relance simplement le jeu, sans vérifier le partage.                                                                      | `LoseConsolation.tsx:26-41`, `App.tsx:257-260`                                                                                                                                    | Anti-doublon obligatoire               |
| 6   | **Codes promo en clair dans le bundle client.**                                                                                                                               | `data/campaigns.ts:250` et suivantes                                                                                                                                              | Sécurité des coupons                   |
| 7   | **Faux captcha** : case « Je suis humain / hCaptcha » pré-cochée et purement décorative.                                                                                      | `LeadCaptureForm.tsx:29`, `:191`                                                                                                                                                  | Intégrité des participations           |

### 4.2 Bugs fonctionnels

1. **Le bouton de la roue bloque le parcours.**
   - Sur l'écran de jeu, le CTA du slot 7 ne fait que `setIsSpinning(true)` (`App.tsx:390-394`).
   - `SpinWheel` ne réagit jamais à ce changement ; sa fonction de rotation sort même immédiatement si `isSpinning` est vrai (`SpinWheel.tsx:39`).
   - Résultat : le bouton reste figé sur « Tirage en cours… » et la roue ne tourne plus au clic. Impasse.
2. **Une défaite à la roue mène à l'écran de victoire.**
   - Le segment « Rejouez » (`category: 'empty'`) appelle quand même `onWin` (`SpinWheel.tsx:89-95`), et `onLose` n'est jamais utilisé.
   - Le joueur passe par le formulaire, puis voit un bon avec le code de secours `AKT-DZ-9824X` (`RewardVoucher.tsx:50`).
3. **Le champ wilaya n'est jamais affiché**, alors qu'il est passé en props et que la liste `WILAYAS_ALGERIA` existe. Le nom complet reste en état local et n'est pas remonté.
4. **La validation du téléphone est minimale** (`phone.length >= 8`) : aucune normalisation des formats algériens `05/06/07` ou `+213`.
5. **Le texte de secours du slot 6** est en français seulement (`TENTATIVE RESTANTE`), et certaines chaînes anglaises retombent sur le français.

### 4.3 Personnalisation incomplète (le contenu est encore du code)

- **Textes dispersés** entre le dictionnaire global `UI_STRINGS` et des ternaires imbriqués dans `App.tsx` (titre et CTA par mécanique, lignes 313-387). Ils ne sont pas configurables par campagne.
- **Carte jackpot et chips codées en dur** (« 5 000 DA Cash • 10 Go • Bons », couleurs ambre fixes) : `WelcomeTeaser.tsx:483-554`.
- **Footer figé** : les liens Privacy/Terms/Support sont écrits en dur et ouvrent tous la même modale (`Slot8FooterUtility.tsx:46-63`).
- **En-tête limité** : logo uniquement sous forme d'icône Lucide (pas d'image uploadée), et `brandTagline` est ignoré (`Slot1BrandHeader.tsx:22-25`).
- **Style « or » détecté par un contournement** sur l'id du preset ou la valeur hex de la couleur (`Slot7Cta.tsx:48-51`), au lieu d'un token.
- **Pas de schéma de campagne** : seuls les `BrandTokens` sont structurés ; lots, textes et formulaire restent globaux. Pas de persistance.

### 4.4 Qualité technique

- **Police arabe absente.** La classe `font-arabic` est utilisée 7 fois mais n'est définie nulle part (`index.css` ne contient que `@import "tailwindcss"`), donc aucune police arabe n'est appliquée. `CLAUDE.md` impose _Noto Sans Arabic_.
- **Variantes `dark:` sans effet** : aucune stratégie de classe `dark` n'est configurée.
- **Couleurs fragiles** : l'opacité est obtenue en concaténant un suffixe hex (`${tokens.primaryColor}25`), ce qui casse avec une couleur au format rgb ou nommée.
- **Tailles fixes** à plusieurs endroits : téléphone `w-[375px] h-[730px]`, `min-h-[620px]`, roue de 260/280 px.
- **`App.tsx` fait tout** : état, navigation et configuration de chaque écran via des `switch` et des ternaires.
- **Marques réelles dans les presets de démo** (Djezzy, Mobilis, Ooredoo, Yassir, Cevital, Rouiba, Ifri, Condor, UNO, BNA…) : risque d'image et juridique si on les montre à des prospects sans accord.
- **Dépendances et configuration AI Studio** à retirer (`@google/genai`, `express`, `DISABLE_HMR`…).

---

## 5. Comparaison des approches

| Critère                       | Player UI Maker (canvas libre)                           | Aktera (8 slots)                                              | Production actuelle (`PlayerFlowPage`)                    | Cible recommandée                                       |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Modèle de personnalisation    | Tout : position, taille, rotation, calques, animations   | Tokens de marque + choix de mécanique + langue                | Aucune (le `player_screen_config` est chargé mais ignoré) | Template fixe + tokens + textes + formulaire + sections |
| Responsive                    | Fragile (positions absolues en %, correctifs successifs) | Natif (colonne flex)                                          | Correct (composants codés)                                | Natif                                                   |
| Risque de mise en page cassée | Élevé                                                    | Très faible                                                   | Nul                                                       | Très faible                                             |
| Conformité 18-07              | Footer et consentement supprimables                      | Consentement pré-coché, après la partie                       | Géré dans le flux                                         | Intégrée au cadre, non désactivable                     |
| Tirage du lot                 | Simulation dans l'aperçu                                 | **Côté client**                                               | **Côté serveur** (`select-prize`)                         | Côté serveur                                            |
| Backend / persistance         | Enregistrement JSON (non lu en production)               | Aucun                                                         | Supabase                                                  | Supabase (configuration + flux)                         |
| i18n / RTL                    | Partiel                                                  | fr/ar/en + RTL (police arabe cassée)                          | Partiel                                                   | fr/ar/en + RTL + Noto Sans Arabic                       |
| Adapté aux marketeurs         | Non (outil de designer)                                  | Oui                                                           | —                                                         | Oui                                                     |
| Mécaniques disponibles        | 5 (aperçu)                                               | 12 (démo)                                                     | 5 (réelles)                                               | 5 au lancement, puis extension                          |
| Complexité / taille           | ~9 400 lignes                                            | ~7 200 lignes (dont ~5 900 déjà portées dans `player-editor`) | ~3 000 lignes                                             | Un seul système de rendu                                |
| Utilisé par les vrais joueurs | Non                                                      | Non                                                           | **Oui**                                                   | Oui                                                     |

---

## 6. Verdict

- **Sur le concept, l'approche Aktera est la bonne.** La grammaire à 8 slots _est_ un template, et ses tokens couvrent précisément le niveau de personnalisation visé. Elle est largement préférable au canvas libre.
- **Sur le code, c'est un prototype de design, pas un produit.** Il ne faut pas le brancher tel quel en production : tirage côté client, consentement non conforme, pas de backend, bugs de parcours.
- **La bonne stratégie :** garder de ce prototype la **couche de rendu** (cadre, slots, composants visuels, tokens, règles UX) et la faire reposer sur la **couche métier de production** qui existe déjà :
  - `select-prize` pour le tirage ;
  - normalisation du téléphone et anti-doublon ;
  - consentement avant la participation ;
  - Supabase pour la configuration.

---

## 7. Plan d'intégration proposé

| Étape | Objectif                    | Détails                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Schéma de configuration** | Étendre `PlayerScreenConfig` (`src/types.ts:156`) en un `CampaignDesign` : tokens (repris de `BrandTokens`), contenu par écran, par slot et par langue, champs du formulaire, sections (jackpot, chips), contenu légal et liens du footer, paramètres de mécanique. Ajouter une `schemaVersion`.                                                                           |
| 2     | **Cadre de rendu unique**   | Porter `SlotContainer` et les 8 slots dans un module unique (ex. `src/components/player-template/`). Tout le contenu vient de la configuration. Corriger : Noto Sans Arabic, `dir="auto"`, `color-mix()` pour les opacités, suppression du contournement `isGold`, tailles fluides.                                                                                        |
| 3     | **Flux conforme**           | Ordre des écrans : accueil → consentement + formulaire → jeu → résultat. Consentement **non coché** par défaut et bloquant. Résultat fourni par `select-prize`, la roue s'arrêtant sur le lot reçu (le composant de production `PlayerGame` accepte déjà un `targetPrize`). Normalisation `0XXXXXXXXX` / `+213`. Suppression du faux captcha (vrai captcha si nécessaire). |
| 4     | **Brancher `/play/:slug`**  | `PlayerFlowPage` affiche le cadre à partir de `player_screen_config`. L'aperçu de l'éditeur utilise **les mêmes composants**.                                                                                                                                                                                                                                              |
| 5     | **Éditeur en formulaires**  | Reprendre l'UX de `StudioControls` (presets, tokens, langue, écran), étendue à : upload du logo et de l'image de fond, textes par écran, champs du formulaire, sections activables, liens légaux. Lots lus depuis la base.                                                                                                                                                 |
| 6     | **Mécaniques**              | Au lancement, les 5 mécaniques de production (roue, quiz, grattage, boîtes, Hit It) dans le nouveau cadre. Les nouvelles (duel, humeur, persona, swipe, catcher, mémoire, explorer, juste prix) ensuite, chacune devant **recevoir** le résultat du serveur au lieu de le calculer.                                                                                        |
| 7     | **Nettoyage**               | Supprimer le canvas `player-ui-maker` et fusionner ou retirer `src/components/player-editor` (portage partiel en double). Retirer le dossier AI Studio une fois le portage terminé.                                                                                                                                                                                        |

---

## 8. Réutilisation fichier par fichier

| Élément Aktera                                                        | Décision              | Remarque                                                                                               |
| --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `SlotContainer.tsx` + `slots/Slot1…Slot8`                             | **Garder, adapter**   | Contenu piloté par la configuration ; en-tête avec logo image ; liens du footer configurables.         |
| `types.ts` → `BrandTokens`                                            | **Garder, étendre**   | Base des tokens du thème.                                                                              |
| `data/campaigns.ts` → `UI_STRINGS`                                    | **Adapter**           | Devient les valeurs par défaut du contenu par langue, surchargeables par campagne.                     |
| `data/campaigns.ts` → `BRAND_PRESETS`                                 | **Adapter**           | Presets génériques (styles), sans marques réelles.                                                     |
| `data/campaigns.ts` → `WHEEL_PRIZES`, codes                           | **Abandonner**        | Les lots et coupons viennent de la base et du serveur.                                                 |
| `WelcomeTeaser.tsx`                                                   | **Garder, adapter**   | Jackpot et chips deviennent des sections configurables.                                                |
| `LeadCaptureForm.tsx`                                                 | **Adapter fortement** | Champs configurables, wilaya, consentement non coché, suppression du faux captcha, placé avant le jeu. |
| `RewardVoucher.tsx`, `LoseConsolation.tsx`                            | **Garder, adapter**   | Code reçu du serveur ; « +1 essai » à encadrer côté serveur ou à retirer.                              |
| `SpinWheel.tsx`, `ScratchCard.tsx`, `LuckyBoxes.tsx`, `SpeedQuiz.tsx` | **Adapter**           | Mécaniques d'affichage pilotées par le résultat serveur.                                               |
| 8 nouvelles mécaniques                                                | **Plus tard**         | Même contrainte : le résultat vient du serveur.                                                        |
| `StudioControls.tsx`                                                  | **S'en inspirer**     | Base de l'UX de l'éditeur.                                                                             |
| `PhoneFrame.tsx`, `QrModal.tsx`, `SlotInspectorModal.tsx`             | **Optionnel**         | Outils d'aperçu et de documentation.                                                                   |
| `App.tsx`                                                             | **Abandonner**        | Remplacé par le flux de production et la configuration.                                                |
| `utils/audio.ts`                                                      | **Garder**            | Sons Web Audio (à rendre désactivables).                                                               |

---

## 9. Risques et points d'attention

- **Dette de duplication.** Sans décision nette, on garderait quatre systèmes : canvas, portage Aktera, prototype AI Studio et production. Il faut **un seul** système de rendu.
- **Promesses du design.** « Gain garanti » ou « 100 % gagnant » sont affichés dans les maquettes : ils ne doivent l'être que si la configuration de la campagne le permet réellement (probabilité de gain, stock).
- **Boucles virales.** « Partager = +1 essai » doit être validé côté serveur, sinon l'anti-doublon est contourné.
- **Performance mobile.** Les nombreuses animations infinies (`motion`, `animate-pulse`, flous) coûtent cher sur l'entrée de gamme ; respecter `prefers-reduced-motion`.
- **Marques réelles.** Ne pas présenter les presets Djezzy/Mobilis/Ooredoo… à des prospects sans accord.

---

## 10. Questions ouvertes

1. **Ordre du parcours :** formulaire et consentement **avant** le jeu (conforme), ou uniquement le consentement avant et le formulaire après un gain ?
2. **Mécaniques au lancement :** uniquement les 5 déjà en production, ou certaines nouvelles (duel, swipe…) dès la V1 ?
3. **Slots par écran :** configurables (afficher/masquer), ou figés par template ?
4. **Nombre de templates visuels** au lancement (ex. « Midnight Gold », « Clean Light ») ?
5. **Le « +1 essai par partage »** : fonctionnalité à conserver (et donc à sécuriser côté serveur) ?
6. **Sort du prototype AI Studio** et de `src/components/player-editor` une fois le portage terminé : archivage ou suppression ?
