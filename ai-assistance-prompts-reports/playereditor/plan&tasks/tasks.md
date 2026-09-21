# Exécution du plan — Player Experience, tâche par tâche

**Référence :** [`plan.md`](./plan.md)
**Mode :** MVP 100 % côté client, sans aucune modification backend
**Méthode :** une tâche à la fois. Chaque tâche est autonome : objectif, fichiers, spécification, réutilisation, critères d'acceptation, vérification, commit.
**Règles :** [`rules.md`](../rules.md) s'applique à chaque tâche et **l'emporte sur ce fichier** en cas de conflit : documentation détaillée dans `tasks_docs/`, résumé de fin de tâche, message de commit proposé sans commit.

---

## 0. Mode d'emploi

### 0.1 Règles d'exécution

1. On exécute **une tâche par échange**. Je ne démarre pas la suivante sans ton feu vert.
2. Chaque tâche se termine par sa **vérification** (commandes) et par le **message de commit** au format indiqué. Je ne commite pas : c'est toi qui commites (`rules.md`, R3 et R4).
3. Si une tâche révèle un imprévu, je m'arrête et je te le signale au lieu d'élargir le périmètre.
4. L'ancien code (`player-ui-maker`, `player-editor`, `PlayerScreenConfig.tsx`) **reste en place** jusqu'à la phase 7.
5. `/play/:slug` et tout le dossier `supabase/` ne sont **jamais** modifiés.
6. **Toute tâche d'interface (phases 3 à 6) respecte les règles de design de [`rules.md`](../rules.md) §6** :
   - jamais moins beau que le prototype, qui est un plancher ;
   - jeux à parité visuelle, avec les améliorations visées ;
   - une section « Qualité visuelle » dans la documentation de la tâche.

   Une tâche visuellement en dessous de la référence n'est pas terminée.

### 0.2 Conventions

| Sujet                 | Règle                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Module                | `src/features/player-experience/`                                                           |
| Commits               | `feat(Player-Experience): …`, `refactor(…)`, `test(…)`, `chore(…)` + ligne `Co-Authored-By` |
| Langue du code        | Identifiants et commentaires en anglais                                                     |
| Langue de l'interface | Studio en anglais ; contenu joueur en fr/ar/en                                              |
| Types                 | Pas de `any` dans `domain/` ni `services/`                                                  |
| Taille                | Un composant > 250 lignes doit être découpé                                                 |
| Vérification          | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`                            |

### 0.3 Décisions appliquées par défaut (modifiables avant la tâche T1.4)

| #   | Décision                             | Valeur retenue                                                                                                                                                              |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Accueil et inscription               | **Deux écrans séparés**                                                                                                                                                     |
| 2   | Persistance MVP                      | **`localStorage` uniquement**                                                                                                                                               |
| 3   | Dépendances                          | **`zod` + `vitest` ajoutés**                                                                                                                                                |
| 4   | `/play/:slug`                        | **Inchangé**                                                                                                                                                                |
| 5   | Mécaniques                           | **Les 5 existantes** (roue, grattage, boîtes, quiz, Hit It)                                                                                                                 |
| 6   | Bonus de partage                     | **Désactivé** (`features.shareBonus = false`)                                                                                                                               |
| 7   | Lien de démo `/demo#cfg=`            | **Reporté** après le MVP                                                                                                                                                    |
| 8   | Prototype AI Studio                  | **Exclu du build**, archivé en fin de MVP                                                                                                                                   |
| 9   | Nom du module                        | **`player-experience`**                                                                                                                                                     |
| 10  | Rendu de l'aperçu                    | **Iframe `/xp-frame` à la taille CSS exacte**, zoom par `transform` autour de l'iframe (plan §9.3)                                                                          |
| 11  | Paysage et grands écrans             | **Disposition `split`** (deux volets) ; `stack` sinon (plan §8.3)                                                                                                           |
| 12  | Enveloppe supportée                  | **280–2560 × 320–1600 px**, portrait et paysage ; vérifiée par balayage                                                                                                     |
| 13  | Édition des lots et des questions    | **Dans le Wizard** (source unique, lue par le serveur) ; le Studio les montre en lecture seule avec « Edit in campaign settings » et gère leur **présentation** (plan §6.6) |
| 14  | Seuils, durée Hit It, chrono du quiz | **Règles de la campagne** (`game_logic_config`), hors `ExperienceConfig`                                                                                                    |
| 15  | Accroche de pregame                  | **Simulation automatique non jouable**, une par mécanique, issue de la configuration (plan §8.7)                                                                            |
| 16  | Thème des écrans joueur              | **Sombre par défaut** (preset `midnight-gold`, conforme à `CLAUDE.md`) ; styles clairs (`clean-light`, `retail-blue`) proposés en option — validé le 2026-09-21             |

> **Révision du 2026-09-21 — responsive sur toutes les tailles d'écran.** Voir `plan.md` §8.3 et §9.3.
>
> - La phase 3 est **renumérotée** : T3.2 et T3.3 sont nouvelles ; les anciennes T3.2 à T3.5 deviennent T3.4 à T3.7 ; T3.8 remplace l'ancienne T3.6.
> - T6.9 et T6.10 sont ajoutées à la phase 6 (T6.11 lors de la révision 2).
>
> **Révision (2) du 2026-09-21 — contenu du jeu et accroches de pregame** (plan §6.6 et §8.7).
>
> - Tâches amendées : T1.4, T1.7, T1.8, T1.11, T2.3, T4.2, T5.1 à T5.7, T6.6, T7.1 ; nouvelle tâche T6.11 (traductions du quiz).
> - Aucune renumérotation.

### 0.4 Sources de réutilisation (chemins courts utilisés ci-dessous)

| Alias     | Chemin réel                                   |
| --------- | --------------------------------------------- |
| `PROTO/`  | `aktera---gamified-marketing-experience/src/` |
| `EDITOR/` | `src/components/player-editor/`               |
| `MAKER/`  | `src/components/player-ui-maker/`             |
| `PROD/`   | `src/components/` et `src/pages/play/`        |
| `XP/`     | `src/features/player-experience/` (à créer)   |

### 0.5 Suivi

| Phase                            | Tâches       | Statut |
| -------------------------------- | ------------ | ------ |
| 0 — Préparation                  | T0.1 → T0.3  | ✅     |
| 1 — Domaine                      | T1.1 → T1.12 | ✅     |
| 2 — Services                     | T2.1 → T2.6  | ✅     |
| 3 — Thème, mise en page et cadre | T3.1 → T3.8  | 🟡     |
| 4 — Parcours et écrans           | T4.1 → T4.5  | ⬜     |
| 5 — Jeux                         | T5.1 → T5.7  | ⬜     |
| 6 — Studio                       | T6.1 → T6.11 | ⬜     |
| 7 — Intégration                  | T7.1 → T7.4  | ⬜     |

---

## Phase 0 — Préparation

### T0.1 — Branche et garde-fous du dépôt

**Objectif :** isoler le travail et empêcher le prototype AI Studio de casser `lint`, `typecheck` et `build`.

**Fichiers :** `tsconfig.json`, `eslint.config.js`
**Dépend de :** —

**Détails :**

1. Créer la branche `feat/player-experience` à partir de la branche courante (vérifier d'abord `git status` : le dépôt doit être propre).
2. `tsconfig.json` → ajouter `"aktera---gamified-marketing-experience"` dans `exclude` (aujourd'hui ce dossier est inclus, car il n'y a pas de clé `include`).
3. `eslint.config.js` → ajouter `"aktera---gamified-marketing-experience/**"` dans le premier bloc `ignores`.

**Critères d'acceptation :**

- `npx tsc --noEmit` ne renvoie plus aucune erreur provenant du prototype.
- `npx eslint .` n'analyse plus ce dossier.
- Aucun fichier du prototype n'est modifié.

**Vérification :** `npm run lint && npm run typecheck`
**Commit :** `chore(Player-Experience): exclude AI Studio prototype from build tooling`

---

### T0.2 — Dépendances et configuration des tests

**Objectif :** disposer de `zod` pour valider la configuration et de `vitest` pour tester le domaine.

**Fichiers :** `package.json`, `vitest.config.ts` (nouveau), `src/test/setup.ts` (nouveau)
**Dépend de :** T0.1

**Détails :**

1. Installer : `npm i zod` puis `npm i -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom`.
2. `vitest.config.ts` : environnement `jsdom`, `globals: true`, `setupFiles: ["src/test/setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`, couverture limitée à `src/features/player-experience/{domain,services}/**`.
3. `src/test/setup.ts` : import de `@testing-library/jest-dom` si ajouté, sinon fichier vide avec un commentaire.
4. `package.json` → scripts : `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:cov": "vitest run --coverage"`. Le script `verify` reste inchangé et exécutera désormais de vrais tests.
5. Vérifier que `eslint` ne signale pas les fichiers `*.test.ts` (ajouter les globals Vitest si besoin).

**Critères d'acceptation :**

- Un test temporaire (`expect(1 + 1).toBe(2)`) passe avec `npm test`.
- `npm run verify` reste vert.

**Vérification :** `npm test && npm run verify`
**Commit :** `chore(Player-Experience): add zod and vitest test harness`

---

### T0.3 — Squelette du module

**Objectif :** créer l'arborescence et les garde-fous d'import.

**Fichiers :** `XP/index.ts`, `XP/README.md`, dossiers vides avec `.gitkeep`, `eslint.config.js`
**Dépend de :** T0.2

**Détails :**

1. Créer les dossiers du plan §4.2 : `domain/`, `services/{local,supabase}/`, `theme/`, `presets/`, `runtime/{layout,host,frame/slots,sections,screens,games,legal,feedback,hooks}`, `studio/{layout,preview,panels,fields,validation}`.
2. `XP/README.md` : rappeler les 5 règles du module — la configuration est une donnée sérialisable ; la mise en page est du code ; le résultat vient d'une source d'autorité ; tous les ports sont asynchrones ; `domain/` n'importe jamais React.
3. `XP/index.ts` : exports publics prévus (`PlayerExperience`, `PlayerExperienceStudio`, `createLocalServices`, `ServicesProvider`, types principaux) — commentés tant que les fichiers n'existent pas.
4. `eslint.config.js` : règle `no-restricted-imports` interdisant, depuis l'extérieur du module, tout import d'un chemin interne autre que `src/features/player-experience` ; et interdisant `services/local` depuis `runtime/`.

**Critères d'acceptation :**

- L'arborescence correspond au plan §4.2.
- `npm run lint` passe.

**Vérification :** `npm run lint && npm run typecheck`
**Commit :** `chore(Player-Experience): scaffold feature module structure`

---

## Phase 1 — Domaine

### T1.1 — Langues et textes localisés

**Objectif :** socle multilingue du contenu joueur.

**Fichiers :** `XP/domain/locale.ts`, `XP/domain/locale.test.ts`
**Dépend de :** T0.3

**Spécification :**

```ts
export type Locale = "fr" | "ar" | "en";
export const LOCALES: Locale[];
export type LocalizedText = Partial<Record<Locale, string>>;

export function resolveText(
  text: LocalizedText | undefined,
  locale: Locale,
  fallback?: Locale,
): string; // "" si rien
export function hasText(
  text: LocalizedText | undefined,
  locale: Locale,
): boolean;
export function missingLocales(
  text: LocalizedText | undefined,
  enabled: Locale[],
): Locale[];
export function getDirection(locale: Locale): "rtl" | "ltr";
export function localized(fr: string, ar?: string, en?: string): LocalizedText; // helper des presets
```

**Détails :** chaîne de repli `locale demandée → langue par défaut de la configuration → fr → en → première valeur non vide`. `resolveText` ne renvoie jamais `undefined`.

**Critères d'acceptation :** tests couvrant texte vide, texte partiel, repli, `getDirection("ar") === "rtl"`.

**Vérification :** `npm test -- locale`
**Commit :** `feat(Player-Experience): add locale primitives for player content`

---

### T1.2 — Téléphone algérien

**Objectif :** normalisation strictement identique à celle du serveur.

**Fichiers :** `XP/domain/phone.ts`, `XP/domain/phone.test.ts`
**Dépend de :** T0.3

**Réutilisation :** copier la fonction de `supabase/functions/select-prize/index.ts:25-34` (identique à `PROD/../pages/play/PlayerFlowPage.tsx:380-389`).

**Spécification :**

```ts
export function normalizeDzPhone(raw: string): string; // "+213 555 12 34 56" → "0555123456"
export function isValidDzMobile(raw: string): boolean; // /^0[567]\d{8}$/ après normalisation
export function formatDzPhone(raw: string): string; // "0555 12 34 56" pour l'affichage
```

**Détails :** un commentaire d'une ligne doit signaler que cette fonction est la copie du serveur et doit rester synchronisée.

**Critères d'acceptation :** tests sur `0555123456`, `+213555123456`, `213555123456`, `555123456`, `05 55 12 34 56`, et rejets de `0455123456`, `055512345`, `""`, `"abc"`.

**Vérification :** `npm test -- phone`
**Commit :** `feat(Player-Experience): add Algerian phone normalization shared with server contract`

---

### T1.3 — Types de jeux et moment du tirage

**Objectif :** table de vérité des mécaniques.

**Fichiers :** `XP/domain/gameTypes.ts`
**Dépend de :** T0.3

**Spécification :**

```ts
export type GameType =
  "lucky_wheel" | "quiz" | "scratch_card" | "mystery_box" | "hit_it"; // = Campaign["gameType"]
export type OutcomeTiming = "before-animation" | "after-interaction";
export const OUTCOME_TIMING: Record<GameType, OutcomeTiming>;
export const GAME_LABELS: Record<GameType, string>; // anglais, pour le Studio
```

**Détails :** `lucky_wheel` et `scratch_card` → `before-animation` ; `quiz`, `mystery_box`, `hit_it` → `after-interaction` (source : `PlayerFlowPage.tsx:366-378`).

**Critères d'acceptation :** le type est compatible avec `Campaign["gameType"]` de `src/types.ts:123` (vérifié par une assertion de type).

**Vérification :** `npm run typecheck`
**Commit :** `feat(Player-Experience): declare game types and outcome timing table`

---

### T1.4 — Types de la configuration

**Objectif :** modèle de données central.

**Fichiers :** `XP/domain/types.ts`, `XP/domain/campaign.ts`
**Dépend de :** T1.1, T1.3

**Détails :** reprendre intégralement les types du plan §5.1 (`AssetRef`, `ThemeTokens`, `ScreenContent`, `ScreenKey`, `JackpotSection`, `PrizeChipsSection`, `FormConfig`, `LegalConfig`, `GameSettings`, `ExperienceConfig`) et §5.2 (`CampaignSnapshot`).

Ajouts obligatoires :

- `IconName` = union des clés de `presets/icons.ts` (créé en T1.7 ; utiliser `string` avec un commentaire si l'ordre l'impose, puis resserrer).
- Aucun champ ne contient de fonction, de `ReactNode` ou de code couleur non sérialisable.
- Chaque champ sensible porte un commentaire d'une ligne quand la règle n'est pas évidente (téléphone verrouillé, `shareBonus` figé à `false`).
- `ThemeTokens.background.focus: { x: number; y: number }` (0–100, défaut 50/50) : point d'intérêt de l'image de fond, pour un recadrage correct en portrait comme en paysage (plan §5.1).
- **Règles hors de la configuration** (plan §6.6) :
  - `GameSettings` ne contient **que de la présentation** : `teaser`, `wheel` (segments avec `icon`), `scratch` (avec `coverText`), `boxes` (`icon`, `color`), `quiz.translations` (avec `sourceHash`), `hitIt` (`targetIcon`, `targetImage`) ;
  - pas de `winThreshold`, `durationSeconds` ni `secondsPerQuestion` : ils vont dans `CampaignSnapshot.rules`.
- `ExperienceConfig.prizeDisplay: Record<prizeId, PrizeDisplay>` (libellé et message de gain par langue, icône, image).
- `CampaignSnapshot.rules` : `{ quiz?: { passThresholdPercent, secondsPerQuestion }, hitIt?: { winThreshold, durationSeconds } }` (plan §5.2).

**Critères d'acceptation :**

- `ExperienceConfig` est sérialisable : un test `JSON.parse(JSON.stringify(config))` conserve la structure.
- `npm run typecheck` passe.

**Vérification :** `npm run typecheck`
**Commit :** `feat(Player-Experience): define experience configuration types`

---

### T1.5 — Contrat de participation

**Objectif :** fixer le contrat aligné sur `select-prize`.

**Fichiers :** `XP/domain/participation.ts`
**Dépend de :** T1.2, T1.3

**Détails :** reprendre le plan §7.2 (`ConsentRecord`, `GamePayload`, `DrawRequest`, `ParticipationErrorCode`, `ParticipationError`, `DrawResult`, `DrawOutcome`).

Ajouter :

```ts
export function createClientRequestId(): string; // crypto.randomUUID()
export function isRetryable(code: ParticipationErrorCode): boolean; // NETWORK, UNKNOWN
export const PARTICIPATION_ERROR_MESSAGES: Record<
  ParticipationErrorCode,
  LocalizedText
>; // fr/ar/en
```

Un commentaire en tête du fichier renvoie au tableau de correspondance du plan §7.2.

**Critères d'acceptation :** les codes d'erreur sont exactement ceux du serveur (`ALREADY_PARTICIPATED`, `CAMPAIGN_CLOSED`, voir `select-prize/index.ts:212` et `:251`).

**Vérification :** `npm run typecheck`
**Commit :** `feat(Player-Experience): define participation contract mirroring select-prize`

---

### T1.6 — Schéma de validation (zod)

**Objectif :** valider toute configuration entrante.

**Fichiers :** `XP/domain/schema.ts`, `XP/domain/schema.test.ts`
**Dépend de :** T1.4

**Spécification :**

```ts
export const experienceConfigSchema: z.ZodType<ExperienceConfig>;
export interface ParseResult {
  config: ExperienceConfig;
  issues: string[];
  recovered: boolean;
}
export function parseExperienceConfig(
  raw: unknown,
  fallbackGameType?: GameType,
): ParseResult;
```

**Détails :**

- Contraintes : couleurs `#rrggbb`, `overlayOpacity` entre 0 et 1, 1 à 4 chips, 2 à 12 segments, `policyVersion` non vide, URL limitées à `https:`, `mailto:`, `tel:`.
- `parseExperienceConfig` ne jette jamais : en cas d'échec, il complète avec les valeurs par défaut, liste les problèmes dans `issues` et met `recovered: true`.

**Critères d'acceptation :** tests sur configuration valide, champ manquant, couleur invalide, JSON complètement étranger.

**Vérification :** `npm test -- schema`
**Commit :** `feat(Player-Experience): validate experience config with zod`

---

### T1.7 — Presets et contenus par défaut

**Objectif :** styles et textes prêts à l'emploi, repris du prototype.

**Fichiers :** `XP/presets/themePresets.ts`, `XP/presets/contentDefaults.ts`, `XP/presets/wilayas.ts`, `XP/presets/icons.ts`
**Dépend de :** T1.4

**Réutilisation :**

- styles : `PROTO/data/campaigns.ts:3-241` et `EDITOR/aktera-presets.ts` ;
- textes : `PROTO/data/campaigns.ts:393-736` (`UI_STRINGS`) ;
- wilayas : `EDITOR/aktera-i18n.ts:8` (`ALGERIA_WILAYAS`, liste complète).

**Détails :**

1. **5 presets génériques minimum** : `midnight-gold` (celui de la capture de référence), `obsidian-violet`, `clean-light`, `telecom-red`, `retail-blue`. **Aucun nom de marque réelle** (ni Djezzy, ni Yassir, ni Cevital…).
2. `contentDefaults.ts` :
   - `DEFAULT_SCREEN_CONTENT: Record<GameType, Record<ScreenKey, ScreenContent>>` en fr/ar/en : l'accueil a un titre, un sous-titre et un CTA **propres à chaque jeu**, comme dans le prototype (`wheelSubtitle`, `quizSubtitle`…) ;
   - les textes par défaut des sections, du formulaire et du bloc légal ;
   - les **modèles de légende d'accroche** par jeu (`{n} lots à gagner`, `{n} questions`, `{seuil} touches en {durée} s`…), en fr/ar/en, sans promesse de gain (plan §8.7) ;
   - les libellés par défaut des segments « perdu » (« Rejouez », « Presque ! »).
3. `icons.ts` : dictionnaire `IconName → composant lucide` (crown, trophy, gift, coins, zap, star, gem, ticket, percent, wifi, target, help-circle, box, flame, sparkles, shopping-bag) + `ICON_NAMES`.
4. Les textes du bloc légal reprennent le contenu de la modale d'Aktera (`PROTO/App.tsx:616-637`), en français, arabe et anglais.

**Critères d'acceptation :** chaque écran de chaque mécanique a un titre, un sous-titre et un CTA dans les trois langues ; aucun `TODO` ; aucune marque réelle.

**Vérification :** `npm run typecheck && npm test`
**Commit :** `feat(Player-Experience): add theme presets, default copy and icon registry`

---

### T1.8 — Configuration par défaut

**Objectif :** générer une configuration complète pour une campagne.

**Fichiers :** `XP/domain/defaults.ts`, `XP/domain/campaign.ts` (`buildCampaignSnapshot`), `XP/domain/display.ts` (`resolvePrizeDisplay`, `resolveQuizQuestion`), `XP/presets/demoCampaign.ts`, tests
**Dépend de :** T1.6, T1.7

**Spécification :**

```ts
export function createDefaultExperience(input: {
  gameType: GameType;
  campaign?: CampaignSnapshot | null;
  presetId?: string;
  brandName?: string;
}): ExperienceConfig;

export function buildDefaultWheelSegments(
  prizes: CampaignSnapshot["prizes"],
): GameSettings["wheel"];

// Lecture du modèle Campaign existant (src/types.ts, useCampaigns) — sans rien écrire.
export function buildCampaignSnapshot(campaign: Campaign): CampaignSnapshot; // sans poids, stock, probabilité ni bonnes réponses
export function resolvePrizeDisplay(
  prizeId: string,
  config: ExperienceConfig,
  campaign: CampaignSnapshot,
  locale: Locale,
): {
  label: string;
  winMessage: string | null;
  icon: IconName | null;
  image: AssetRef;
};
export function resolveQuizQuestion(
  question: CampaignSnapshot["quiz"][number],
  config: ExperienceConfig,
  locale: Locale,
): { text: string; options: string[]; outdated: boolean };
```

**Détails :**

- `id` via `crypto.randomUUID()`, `updatedAt` ISO.
- Segments de roue : un segment par lot actif + un segment perdant (`prizeId: null`), couleurs alternées issues des tokens (logique proche de `PlayerFlowPage.tsx:57-75`). Borner entre 4 et 12 : si la campagne a moins de 3 lots, compléter avec des segments « perdu » aux libellés variés.
- `teaser` par défaut : `{ mode: "attract", caption: null }` (légende automatique).
- `prizeDisplay` et `quiz.translations` vides par défaut : le repli sur les données de la campagne s'applique.
- `buildCampaignSnapshot` :
  - `rules.quiz.passThresholdPercent` = `gameLogicConfig.pass_threshold_percentage` (défaut 100, comme la RPC) ;
  - `rules.hitIt.winThreshold` = `gameLogicConfig.win_threshold` (défaut 1, comme la RPC) ;
  - `secondsPerQuestion` = `quiz_seconds_per_question` (défaut 0, sans chrono) ; `durationSeconds` = `hit_it_duration_seconds` (défaut 10) ;
  - questions triées, sans `correctIndex`.
- `resolveQuizQuestion` : traduction de la langue demandée si elle existe et si son `sourceHash` correspond au texte actuel ; sinon texte en base, avec `outdated: true` si une traduction existait. **L'ordre des options n'est jamais modifié**, pour que l'index envoyé reste celui de la base.
- Si aucune campagne n'est fournie, utiliser une **campagne de démonstration fixe** (`presets/demoCampaign.ts` : 4 lots, 3 questions, règles par défaut) et générer ses segments.
- Le résultat doit passer `experienceConfigSchema` sans problème.

**Critères d'acceptation :**

- Test pour les 5 mécaniques : `parseExperienceConfig(createDefaultExperience(...)).issues` est vide.
- `buildCampaignSnapshot` ne contient jamais `weight`, `quantity`, `winProbability` ni `correctIndex` (test sur les clés).
- Une traduction dont le `sourceHash` ne correspond plus au texte est ignorée et signalée `outdated`.

**Vérification :** `npm test -- defaults`
**Commit :** `feat(Player-Experience): generate default experience per game type`

---

### T1.9 — Migrations et import de l'ancien format

**Objectif :** versionner et récupérer l'ancienne configuration.

**Fichiers :** `XP/domain/migrations.ts`, `XP/domain/migrations.test.ts`
**Dépend de :** T1.8

**Spécification :**

```ts
export function migrateExperienceConfig(raw: unknown): unknown; // v0 → v1
export function importLegacyPlayerScreenConfig(
  legacy: unknown,
  gameType: GameType,
): ExperienceConfig | null;
```

**Détails :** appliquer la table de correspondance du plan §16.2. `uiProject` est ignoré. Si `legacy` ne contient ni `theme` ni `content`, renvoyer `null`.

**Critères d'acceptation :** test avec un `PlayerScreenConfig` complet (thème + contenu) et un autre ne contenant que `uiProject`.

**Vérification :** `npm test -- migrations`
**Commit :** `feat(Player-Experience): migrate legacy player screen config`

---

### T1.10 — Machine d'états du parcours

**Objectif :** cœur de la logique métier, testable sans interface.

**Fichiers :** `XP/domain/flow.ts`, `XP/domain/flow.test.ts`
**Dépend de :** T1.5

**Spécification :**

```ts
export type FlowScreen =
  | "welcome"
  | "register"
  | "play"
  | "resolving"
  | "revealing"
  | "win"
  | "lose"
  | "duplicate"
  | "closed"
  | "error";

export interface FlowState {
  screen: FlowScreen;
  gameType: GameType;
  timing: OutcomeTiming;
  participant: {
    fullName: string;
    phone: string;
    email: string;
    wilaya: string;
  };
  consentAccepted: boolean;
  clientRequestId: string | null;
  entryId: string | null;
  outcome: DrawOutcome | null;
  error: ParticipationError | null;
  couponConfirmed: boolean;
  startedAt: number;
}

export type FlowEvent =
  | { type: "START" }
  | {
      type: "UPDATE_FIELD";
      field: keyof FlowState["participant"];
      value: string;
    }
  | { type: "SET_CONSENT"; accepted: boolean }
  | { type: "SUBMIT" }
  | { type: "DRAW_STARTED" }
  | { type: "INTERACTION_DONE"; payload: GamePayload }
  | { type: "RESOLVED"; entryId: string; outcome: DrawOutcome }
  | { type: "FAILED"; error: ParticipationError }
  | { type: "REVEAL_DONE" }
  | { type: "CONFIRM_COUPON" }
  | { type: "RETRY" }
  | { type: "RESTART" };

export function createInitialFlowState(gameType: GameType): FlowState;
export function flowReducer(state: FlowState, event: FlowEvent): FlowState;
export function canSubmit(state: FlowState, form: FormConfig): boolean;
export function nextCommand(
  prev: FlowState,
  next: FlowState,
): FlowCommand | null; // "DRAW" | "CONFIRM" | null
```

**Détails :**

- `SUBMIT` n'avance que si `canSubmit` est vrai (champs requis remplis, téléphone valide, consentement accepté).
- Transitions selon le timing (plan §6.1).
- `RETRY` conserve le même `clientRequestId`.
- `RESTART` remet l'état initial **sans** effacer les données de participation déjà envoyées.
- Le reducer est **pur** : aucun appel réseau, aucun `Date.now()` caché (l'horodatage est passé dans l'événement ou fixé à l'initialisation).

**Critères d'acceptation :** tests couvrant les deux timings, les trois erreurs métier, `RETRY`, et le refus de `SUBMIT` sans consentement.

**Vérification :** `npm test -- flow`
**Commit :** `feat(Player-Experience): add player flow state machine`

---

### T1.11 — Contrôle qualité du design

**Objectif :** signaler dans le Studio ce qui casserait l'expérience.

**Fichiers :** `XP/domain/validation.ts`, `XP/domain/contrast.ts`, `XP/domain/validation.test.ts`
**Dépend de :** T1.4

**Spécification :**

```ts
export type IssueLevel = "error" | "warning";
export interface DesignIssue {
  id: string;
  level: IssueLevel;
  path: string;
  message: string;
} // message en anglais
export function validateExperience(
  config: ExperienceConfig,
  campaign?: CampaignSnapshot | null,
): DesignIssue[];
export function contrastRatio(foreground: string, background: string): number;
```

**Détails :** implémenter les règles du plan §6.5, dont celles du contenu du jeu :

- lot actif sans segment ;
- segment lié à un lot absent ;
- 4 à 12 segments ;
- libellé de segment trop long ;
- question sans traduction ou traduction périmée ;
- quiz sans question active ;
- `prizeDisplay` orphelin ;
- légende d'accroche qui promet un gain.

`path` doit permettre au Studio d'ouvrir le bon panneau (ex. `form.consent.text`, `game.quiz.translations.<id>`).

**Critères d'acceptation :** `contrastRatio("#FFFFFF", "#000000") === 21` ; consentement vide → erreur ; segments incohérents → erreur ; 3 segments → erreur ; titre trop long → avertissement ; traduction périmée → avertissement.

**Vérification :** `npm test -- validation`
**Commit :** `feat(Player-Experience): add design validation and contrast checks`

---

### T1.12 — Branchement dans les types globaux

**Objectif :** relier la nouvelle configuration au modèle de campagne.

**Fichiers :** `src/types.ts`
**Dépend de :** T1.4

**Détails :**

1. Importer `ExperienceConfig` depuis `XP/domain/types`.
2. Dans `PlayerScreenConfig` (`src/types.ts:156`), ajouter `experience?: ExperienceConfig;` avec un commentaire : nouvelle configuration versionnée ; `uiProject` est obsolète.
3. Ne rien supprimer à ce stade (la suppression a lieu en phase 7).

**Critères d'acceptation :** `npm run typecheck` passe ; aucun autre fichier modifié.

**Vérification :** `npm run typecheck && npm run build`
**Commit :** `feat(Player-Experience): expose experience config on campaign types`

---

## Phase 2 — Services et adaptateurs locaux

### T2.1 — Ports

**Objectif :** définir les interfaces d'accès au monde extérieur.

**Fichiers :** `XP/services/ports.ts`
**Dépend de :** T1.5

**Détails :** reprendre le plan §7.1 (`ExperienceRepository`, `ParticipationGateway`, `AssetStorage`, `AnalyticsTracker`, `HumanVerification`) plus :

```ts
export type ExperienceEvent = {
  name: ExperienceEventName;
  at: string;
  campaignId: string | null;
  sessionId: string;
  screen: FlowScreen;
  locale: Locale;
  data?: Record<string, string | number | boolean | null>;
};
export type ExperienceEventName =
  | "experience_viewed"
  | "cta_clicked"
  | "form_submitted"
  | "form_invalid"
  | "consent_opened"
  | "game_started"
  | "draw_requested"
  | "outcome_received"
  | "reveal_completed"
  | "coupon_copied"
  | "coupon_confirmed"
  | "share_clicked"
  | "error_shown";
export interface ExperienceServices {
  repository;
  participation;
  assets;
  analytics;
  humanVerification;
}
```

**Critères d'acceptation :** aucune implémentation dans ce fichier ; `npm run typecheck` passe.

**Vérification :** `npm run typecheck`
**Commit :** `feat(Player-Experience): declare service ports`

---

### T2.2 — Dépôt local de configuration

**Objectif :** sauvegarder et charger la configuration sans backend.

**Fichiers :** `XP/services/local/localExperienceRepository.ts`, test associé
**Dépend de :** T2.1, T1.9

**Détails :**

- Clé : `xp:experience:v1:${campaignId ?? "standalone"}`.
- `load` : lecture, `migrateExperienceConfig`, `parseExperienceConfig`, journalisation des problèmes.
- `save` : met à jour `updatedAt`, détecte un conflit si `expectedUpdatedAt` ne correspond plus (autre onglet) et renvoie une erreur explicite.
- Quota dépassé (`QuotaExceededError`) → erreur typée `STORAGE_FULL` avec un message clair.
- Tests avec un `localStorage` simulé.

**Critères d'acceptation :** aller-retour sauvegarde/chargement fidèle ; JSON corrompu → configuration par défaut + `issues` non vide.

**Vérification :** `npm test -- localExperienceRepository`
**Commit :** `feat(Player-Experience): add local experience repository`

---

### T2.3 — Moteur de tirage de démonstration

**Objectif :** simuler l'autorité du serveur, de façon isolée et honnête.

**Fichiers :** `XP/services/local/demoDrawEngine.ts`, `XP/services/local/demoEntryStore.ts`, `XP/services/local/demoRules.ts`, tests
**Dépend de :** T2.1

**Spécification :**

```ts
export interface DemoCampaignRules {
  campaignId: string;
  winProbability: number; // 0–100
  maxEntries: number; // 0 = illimité
  prizes: Array<{
    id: string;
    name: string;
    winMessage: string | null;
    weight: number;
    remaining: number;
  }>;
  quiz?: {
    passThresholdPercent: number;
    questions: Array<{ id: string; correctIndex: number }>;
  };
  hitIt?: { winThreshold: number };
}
export function drawDemoOutcome(
  rules: DemoCampaignRules,
  payload: GamePayload,
  random?: () => number,
): DrawOutcome;
```

**Détails :**

- **Même logique que la RPC `resolve_game_outcome`** (`supabase/migrations/20260831151000_resolve_game_outcome_rpc.sql:62-91`) :
  - quiz : score = bonnes réponses / questions actives × 100, réussi si score ≥ `passThresholdPercent` ;
  - Hit It : réussi si `hits ≥ winThreshold` ;
  - échec → défaite sans tirage.
- Les règles viennent de `buildDemoRules(campaign: Campaign): DemoCampaignRules` (`XP/services/local/demoRules.ts`, créé dans cette tâche, à partir du modèle `Campaign` lu par `useCampaigns`), **jamais** d'`ExperienceConfig`.
- Sinon, tirage : `random() * 100 < winProbability`, puis tirage pondéré parmi les lots dont `remaining > 0`.
- Code de coupon : `DEMO-XXXX-XXXX` (préfixe obligatoire pour éviter toute confusion).
- `demoEntryStore` : `localStorage` `xp:demo:entries:v1`, clé `campaignId|téléphone normalisé`, respect de `maxEntries`, décrément du stock, fonctions `reset(campaignId?)` et `list(campaignId)`.
- Fonction `random` injectable pour rendre les tests déterministes.

**Critères d'acceptation :** distribution conforme sur 1 000 tirages avec une graine fixe ; stock épuisé → défaite ; `winProbability = 0` → jamais de gain ; doublon détecté.

**Vérification :** `npm test -- demoDraw`
**Commit :** `feat(Player-Experience): add demo draw engine and entry store`

---

### T2.4 — Passerelles de participation

**Objectif :** implémenter `ParticipationGateway` en démo et en mode scripté.

**Fichiers :** `XP/services/local/demoParticipationGateway.ts`, `XP/services/local/scriptedParticipationGateway.ts`, tests
**Dépend de :** T2.3

**Détails :**

- **Démo** (`mode: "demo"`) : latence aléatoire 400–900 ms ; normalise le téléphone ; vérifie le doublon (`ALREADY_PARTICIPATED`) ; vérifie la disponibilité (`CAMPAIGN_CLOSED` si stock global épuisé) ; appelle `drawDemoOutcome` ; enregistre la participation ; renvoie un `entryId` UUID. Idempotence : même `clientRequestId` → même résultat.
- **Scriptée** (`mode: "scripted"`) : reçoit un scénario (`win-<prizeId>`, `lose`, `duplicate`, `closed`, `network-error`) et le renvoie sans effet de bord ; latence courte et fixe (300 ms).
- Les deux journalisent un avertissement en console la première fois : « Demo gateway — outcomes are simulated client-side. Never use on the public player route. »

**Critères d'acceptation :** la forme de `DrawResult` est identique pour les deux modes ; les codes d'erreur correspondent au serveur.

**Vérification :** `npm test -- Gateway`
**Commit :** `feat(Player-Experience): add demo and scripted participation gateways`

---

### T2.5 — Images, analytics et vérification humaine

**Objectif :** compléter les adaptateurs restants.

**Fichiers :** `XP/services/local/dataUrlAssetStorage.ts`, `consoleAnalyticsTracker.ts`, `noopHumanVerification.ts`, test de l'upload
**Dépend de :** T2.1

**Détails :**

- `dataUrlAssetStorage.upload` : refuse ce qui n'est pas une image ; redimensionne via `<canvas>` selon l'usage (`background` : 1920 px sur le grand côté, pour rester net sur grand écran ; `logo` : 512 px ; `scratchCover` : 1280 px) ; encode en WebP (repli JPEG) à 0,82 ; refuse au-delà de 400 Ko après compression avec un message explicite ; renvoie `{ kind: "dataUrl", url }`.
- `resolveUrl` : gère `dataUrl`, `remote` et `storage` (préparation future).
- `consoleAnalyticsTracker` : `console.debug` uniquement si `import.meta.env.DEV`.
- `noopHumanVerification.getToken()` : `null`.

**Critères d'acceptation :** upload d'un PNG de test → `dataUrl` valide ; fichier texte → erreur.

**Vérification :** `npm test -- assetStorage`
**Commit :** `feat(Player-Experience): add asset storage, analytics and verification adapters`

---

### T2.6 — Composition et contexte des services

**Objectif :** injecter les services proprement dans l'arbre React.

**Fichiers :** `XP/services/createLocalServices.ts`, `XP/services/ServicesProvider.tsx`, `XP/services/supabase/README.md`
**Dépend de :** T2.2, T2.4, T2.5

**Détails :**

```ts
export function createLocalServices(options?: {
  participation?: "demo" | "scripted";
  rules?: DemoCampaignRules;
  scenario?: ScriptedScenario;
}): ExperienceServices;
```

- `ServicesProvider` : contexte + hook `useExperienceServices()` qui jette une erreur explicite si le provider est absent.
- `services/supabase/README.md` : rappeler le tableau de correspondance du plan §7.2 et la liste des adaptateurs à écrire après le MVP.

**Critères d'acceptation :** un test monte un composant sous le provider et lit les services.

**Vérification :** `npm test && npm run typecheck`
**Commit :** `feat(Player-Experience): compose local services and provider`

---

## Phase 3 — Thème, mise en page adaptative et cadre à 8 slots

> **Numérotation révisée le 2026-09-21.**
>
> - T3.2 (mise en page adaptative) et T3.3 (hôte `/xp-frame`) sont nouvelles.
> - T3.4 à T3.7 correspondent aux anciennes T3.2 à T3.5, adaptées.
> - T3.8 (balayage responsive) remplace l'ancienne T3.6 (4 formats).

### T3.1 — Thème

**Objectif :** transformer les tokens en variables CSS, polices et fonds.

**Fichiers :** `XP/theme/tokens.ts`, `ThemeScope.tsx`, `backgrounds.ts`, `fonts.ts`
**Dépend de :** T1.4

**Détails :**

- `tokensToCssVars(theme)` → `--xp-primary`, `--xp-secondary`, `--xp-accent`, `--xp-surface`, `--xp-text`, `--xp-text-muted`, `--xp-radius-sm|md|lg|pill`, `--xp-font`, `--xp-on-primary` (noir ou blanc selon le contraste, via `contrastRatio`).
- `ThemeScope` : applique les variables, `dir`, `lang`, la classe de police et le fond ; ne touche jamais au `document`.
- Transparences : uniquement `color-mix(in srgb, var(--xp-primary) X%, transparent)`.
- `backgrounds.ts` : `solid`, `gradient`, `mesh`, `dots`, `image` (avec voile `overlayOpacity`), repris de `PROTO/components/SlotContainer.tsx:102-139`. L'image est en `cover`, positionnée sur `background.focus`.
- `fonts.ts` : Poppins ou Plus Jakarta Sans pour le latin ; **Noto Sans Arabic** systématiquement dans la pile (déjà importée dans `src/index.css:2`).

**Critères d'acceptation :** une page de démonstration temporaire affiche les 5 presets sans aucune couleur en dur (elle est remplacée par `/xp-frame?fixture=…` en T3.3).

**Vérification :** `npm run typecheck && npm run build`
**Commit :** `feat(Player-Experience): add theme scope, tokens and backgrounds`

---

### T3.2 — Système de mise en page adaptative _(nouvelle)_

**Objectif :** donner au runtime une mise en page qui fonctionne à **toutes** les tailles de l'enveloppe, en portrait comme en paysage, à partir d'une source unique de points de rupture (plan §8.3).

**Fichiers :** `XP/runtime/layout/{breakpoints,layoutMode,useLayoutMode,safeArea,useElementSize}.ts`, `XP/runtime/layout/layout.css`, `layoutMode.test.ts`, `noFixedSizes.test.ts`
**Dépend de :** T3.1

**Spécification :**

```ts
export const ENVELOPE = {
  minWidth: 280,
  maxWidth: 2560,
  minHeight: 320,
  maxHeight: 1600,
} as const;
export const BREAKPOINTS = {
  compactMaxWidth: 359, // < 360 px : palier compact
  wideMinWidth: 600, // colonne centrée et plafonnée (~640 px)
  splitMinWidth: 560, // + paysage → deux volets
  splitMinAspect: 6 / 5,
  tightMaxHeight: 599,
  roomyMinHeight: 900,
} as const;

export type Arrangement = "stack" | "split";
export type Density = "tight" | "regular" | "roomy";
export interface LayoutMode {
  arrangement: Arrangement;
  density: Density;
  compact: boolean;
  wide: boolean;
}

export function computeLayoutMode(width: number, height: number): LayoutMode; // pur
export function useLayoutMode(): LayoutMode; // matchMedia sur le viewport du document
export function useElementSize<T extends Element>(): [
  React.RefObject<T | null>,
  { width: number; height: number },
]; // ResizeObserver
export function ensureViewportFitCover(doc: Document): void;
```

**Détails :**

- `layout.css` : variantes Tailwind v4 dérivées de `BREAKPOINTS` :
  - `@custom-variant split (@media (min-aspect-ratio: 6/5) and (min-width: 560px));`
  - `tight`, `roomy`, `compact` et `wide` sur le même modèle.
  - Un test vérifie que les valeurs du CSS et celles de `breakpoints.ts` concordent (lecture du fichier CSS).
- Racine du runtime : `min-height: 100dvh`. Aucune autre unité `vh` dans `runtime/`.
- `safeArea.ts` :
  - variables `--xp-safe-top|right|bottom|left`, qui valent `env(safe-area-inset-*)` par défaut et que l'aperçu peut surcharger ;
  - `ensureViewportFitCover()` ajoute `viewport-fit=cover` à la meta viewport **du document du runtime**, au montage. Elle est absente aujourd'hui de `index.html:5`, donc `env()` vaut toujours 0.
- `noFixedSizes.test.ts` parcourt `src/features/player-experience/runtime/**` et **échoue** si le code contient :
  - une variante `\b(sm|md|lg|xl):` ;
  - une taille fixe `(w|h|size|min-h|max-h|min-w|max-w)-\[\d+px\]` ;
  - `100vh` ;
  - exceptions listées dans le test : les bordures, et les minima des zones tactiles (`min-h-[44px]` à `min-h-[56px]`, idem pour `min-w`).
- Compléter `XP/README.md` avec les règles du plan §8.3 : pas de variantes d'écran, pas de taille fixe, slot 5 en conteneur de taille, CTA collant, Pointer Events, redimensionnement à chaud.

**Critères d'acceptation :**

- `computeLayoutMode` renvoie le mode attendu pour les exemples du plan §8.3 :
  - 360×800 → `stack · regular` ;
  - 844×390 → `split · tight` ;
  - 834×1194 → `stack · roomy` ;
  - 1366×657 → `split · regular` ;
  - 1920×969 → `split · roomy` ;
  - 280×653 → `stack · regular · compact` ;
  - plus les cas limites de chaque seuil (559/560 px, rapport 1,19/1,20, 599/600 px, 899/900 px de haut).
- `noFixedSizes.test.ts` passe, et échoue sur un fichier de test contenant `w-[260px]`.

**Vérification :** `npm test -- layout && npm run lint`
**Commit :** `feat(Player-Experience): add adaptive layout system and breakpoints`

---

### T3.3 — Hôte isolé `/xp-frame` et pont d'aperçu _(nouvelle)_

**Objectif :** donner au runtime un document à lui, de la taille exacte de l'appareil simulé. C'est ce qui rend l'aperçu fidèle à toutes les tailles (plan, principe 10 et §9.3).

**Fichiers :** `XP/runtime/host/FrameHost.tsx`, `previewBridge.ts`, `previewBridge.test.ts`, `fixtures.ts`, `src/AppRouter.tsx` (une route)
**Dépend de :** T3.2, T2.2

**Spécification :**

```ts
// Studio → cadre
export type ToFrameMessage =
  | { type: "xp:config"; config: ExperienceConfig; campaign: CampaignSnapshot }
  | {
      type: "xp:ui";
      screen: ScreenKey | "status" | null;
      locale: Locale;
      mode: "demo" | "scripted" | "static";
      scenario?: ScriptedScenario;
      safeArea?: { top: number; right: number; bottom: number; left: number };
      restartKey: number;
    };

// Cadre → Studio
export type FromFrameMessage =
  | { type: "xp:ready" }
  | { type: "xp:flow-event"; screen: FlowScreen }
  | { type: "xp:edit-target"; path: string }; // clic sur un élément data-xp-edit
// "xp:layout-report" est ajouté en T3.8

export function createFrameBridge(win: Window): {
  post(message: FromFrameMessage): void;
  subscribe(listener: (message: ToFrameMessage) => void): () => void;
};
export function createStudioBridge(iframe: HTMLIFrameElement): {
  post(message: ToFrameMessage): void;
  subscribe(listener: (message: FromFrameMessage) => void): () => void;
};
```

**Détails :**

- **Route :** `/xp-frame` dans `AppRouter.tsx`, déclarée **avant** `/*` et hors `ProtectedRoute`, comme `/ui-maker` aujourd'hui.
  - Chargée en `lazy()` : le bundle du cadre ne contient que le runtime.
  - `<meta name="robots" content="noindex">`.
  - Toujours la passerelle de démo ou scriptée, avec le badge DEMO : la route ne lit aucune donnée serveur.
- **Trois sources de configuration** selon le paramètre d'URL :

  | Paramètre                    | Usage                                                                                                                        |
  | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
  | `?source=bridge`             | Aperçu du Studio : configuration reçue par `postMessage`                                                                     |
  | `?source=local&campaignId=…` | Onglet séparé (« Open in new window ») : lecture par `ExperienceRepository`, mise à jour en direct sur l'événement `storage` |
  | `?fixture=<nom>`             | Pages de contrôle et script de balayage (`fixtures.ts`)                                                                      |

- **Sécurité :** un message n'est traité que si `event.origin === window.location.origin` et `event.source === window.parent`. Tout autre message est ignoré sans erreur.
- **Au montage**, le cadre appelle `ensureViewportFitCover(document)` et applique les `--xp-safe-*` reçues.
- **Contenu rendu :**
  - au départ, la fixture `layout-debug` affiche le mode de mise en page courant (`stack · regular…`) et les tokens du thème ;
  - chaque tâche suivante ajoute ses fixtures (`welcome-midnight-gold`, etc.) ;
  - à partir de T4.1, le cadre rend `PlayerExperience` avec les services locaux.
- **Idempotence :** `xp:ready` précède tout envoi ; la configuration est toujours envoyée complète.

**Critères d'acceptation :**

- `/xp-frame?fixture=layout-debug` s'affiche.
- Redimensionner la fenêtre, ou utiliser le mode appareil des DevTools, fait passer l'affichage de `stack` à `split` aux bons seuils.
- Un message d'une autre origine est ignoré (test).

**Vérification :** `npm test -- previewBridge && npm run build`
**Commit :** `feat(Player-Experience): add isolated frame host and preview bridge`

---

### T3.4 — Cadre et slots 1 à 4 _(ex-T3.2)_

**Objectif :** l'ossature haute de l'écran.

**Fichiers :** `XP/runtime/frame/ExperienceFrame.tsx`, `slots/BrandHeaderSlot.tsx`, `HeroVisualSlot.tsx`, `TitleSlot.tsx`, `SupportingCopySlot.tsx`
**Dépend de :** T3.2, T3.3

**Réutilisation :** `PROTO/components/SlotContainer.tsx` et `PROTO/components/slots/Slot1…Slot4`, **après conversion** des variantes `sm:`/`md:` et des tailles fixes (plan §10.1).

**Détails :**

- `ExperienceFrame` reçoit `{ config, locale, screenContent, children (slot 5), cta, reinforcement }` : **du contenu, jamais de callbacks de mise en page**.
- La disposition est pilotée par `useLayoutMode()` (T3.2) :
  - `stack` : une colonne, pleine largeur sous 600 px, centrée et plafonnée à ~640 px au-delà ;
  - `split` : volet gauche (slots 1–4 et 6–7), volet droit (slot 5), slot 8 sur toute la largeur en bas ; scène plafonnée à ~1200 px, fond étendu à tout l'écran.
- Marges intérieures appuyées sur `--xp-safe-*`.
- Slot 2 masqué automatiquement en densité `tight` : c'est la mise en page qui décide, pas l'utilisateur.
- En-tête : logo image **ou** icône (`presets/icons.ts`), nom, tagline, point « live » optionnel ; logo en hauteur fluide.
- Titre : `line-clamp-2` marqué `data-xp-clamp`, `clamp()` sur la largeur plafonné par la hauteur, `dir="auto"`.
- Conteneurs de texte en `min-width: 0` + `overflow-wrap: anywhere`.
- Aucune taille fixe en pixels ; aucun `min-h-[620px]`.

**Critères d'acceptation :**

- Dans `/xp-frame`, avec le mode appareil des DevTools, les six tailles d'exemple du plan §8.3 s'affichent sans débordement et dans la bonne disposition.
- `noFixedSizes.test.ts` (T3.2) passe.

**Vérification :** `npm test -- noFixedSizes && npm run build`
**Commit :** `feat(Player-Experience): add experience frame with header, hero, title and copy slots`

---

### T3.5 — Slots 5 à 8 _(ex-T3.3)_

**Objectif :** zone de jeu, renfort, CTA et pied de page.

**Fichiers :** `slots/PrimaryInteractionSlot.tsx`, `ReinforcementSlot.tsx`, `CtaSlot.tsx`, `FooterSlot.tsx`, `XP/runtime/legal/TermsSheet.tsx`
**Dépend de :** T3.4

**Réutilisation :** `PROTO/components/slots/Slot5…Slot8` (après conversion) ; mentions légales de `PROTO/App.tsx:616-637`.

**Détails :**

- **Zone de jeu (slot 5)** :
  - `container-type: size`, pour que les moteurs se dimensionnent sur l'espace réellement restant ;
  - plancher `--xp-game-min` (≈ 200 px) : en dessous, la page défile plutôt que d'écraser le jeu ;
  - plus de `min-h-[250px]` ni de `min-h-[260px]`.
- **CTA** :
  - libellé, état désactivé et état de chargement fournis en props ;
  - hauteur minimale 52 px ; un secondaire au maximum ;
  - dégradé dérivé de `--xp-primary` (plus de détection `isGold`) ;
  - **collant en bas** (`position: sticky`) quand le contenu dépasse la hauteur ;
  - en `compact`, le CTA secondaire est rendu comme un lien.
- **Renfort** : type et texte issus de la configuration ; aucun texte français en dur.
- **Pied de page** :
  - liens configurables, chacun vers sa cible (feuille légale, `https:`, `mailto:`, `tel:`), URL filtrées ;
  - mention courte ; bandeau défilant figé si `prefers-reduced-motion`, réduit à une ligne en `tight` ;
  - **jamais masqué** : toujours présent et atteignable, dans toutes les dispositions.
- **TermsSheet** :
  - feuille modale, fermeture par Échap et par clic extérieur, focus piégé ;
  - `position: fixed` autorisée, puisqu'elle reste dans le document du runtime ;
  - hauteur maximale en `dvh`, contenu défilant.

**Critères d'acceptation :**

- Navigation clavier complète ; aucune URL non autorisée rendue en lien.
- À 844×390 et à 360×640, le CTA reste visible (collant) et le footer atteignable.

**Vérification :** `npm run build` + contrôle dans `/xp-frame` (mode appareil des DevTools)
**Commit :** `feat(Player-Experience): add interaction, reinforcement, CTA and footer slots`

---

### T3.6 — Sections jackpot et chips _(ex-T3.4)_

**Objectif :** les blocs de la capture de référence.

**Fichiers :** `XP/runtime/sections/JackpotCard.tsx`, `PrizeChips.tsx`
**Dépend de :** T3.4

**Réutilisation :** `PROTO/components/games/WelcomeTeaser.tsx:483-515` (jackpot) et `:517-553` (chips), sans `max-w-[320px]`.

**Détails :**

- Contenu entièrement issu de `config.sections` ; couleurs dérivées des tokens ; 1 à 4 chips ; troncature propre (`data-xp-clamp`) ; masquées si `enabled` est faux.
- **Placement** : en `stack`, sous l'accroche du slot 5 ; en `split`, dans le volet gauche sous le slot 4 (le volet droit reste réservé au jeu).
- **Chips** : sur une ligne tant qu'elles tiennent, puis à la ligne (`flex-wrap`), jamais écrasées ; 2 par ligne en `compact`.

**Critères d'acceptation :**

- Rendu fidèle à la capture en mode « midnight-gold ».
- Aucun texte coupé à 280 et à 360 px ; placement correct en `split` (844×390, 1366×657).

**Vérification :** `npm run build` + contrôle dans `/xp-frame`
**Commit :** `feat(Player-Experience): add jackpot and prize chips sections`

---

### T3.7 — Retours sensoriels et hooks _(ex-T3.5)_

**Objectif :** sons, confettis et utilitaires transverses.

**Fichiers :** `XP/runtime/feedback/audio.ts`, `confetti.ts`, `XP/runtime/hooks/{useReducedMotion,useSessionId,useCopyToClipboard,useDwellTime}.ts`
**Dépend de :** T3.1, T3.2

**Réutilisation :** `EDITOR/aktera-audio.ts` (gère déjà le mode muet) et `MAKER/utils/confettiUtils.ts`.

**Détails :**

- Audio : contexte créé au premier geste utilisateur ; muet tant que `features.sound` est faux ; jamais d'erreur bloquante.
- Confettis :
  - `confetti.create(canvas, { resize: true })` sur un canvas **créé et possédé par le runtime**, pas le canvas plein écran par défaut de `canvas-confetti` ;
  - dimensionné sur le viewport du document ;
  - supporte un redimensionnement pendant l'animation.
- `useReducedMotion` : combine `prefers-reduced-motion` et `features.animations`.
- `useSessionId` : réutilise `sessionStorage` `octoreach_session_id` (même clé que la production, `PlayerFlowPage.tsx:303`).
- `useDwellTime` : secondes depuis le montage, pour `DrawRequest.context`.

**Critères d'acceptation :** aucun son avant interaction ; confettis désactivés en mouvement réduit ; confettis confinés au document du runtime.

**Vérification :** `npm run typecheck && npm run build`
**Commit :** `feat(Player-Experience): add feedback utilities and runtime hooks`

---

### T3.8 — Vérification responsive automatisée (balayage) _(remplace l'ancienne T3.6)_

**Objectif :** vérifier **toutes** les tailles de l'enveloppe, pas 4 échantillons, et outiller toutes les phases suivantes (plan §13.1).

**Fichiers :** `XP/runtime/layout/layoutAudit.ts`, `layoutAudit.test.ts`, `XP/presets/devices.json`, `XP/runtime/host/previewBridge.ts` (message `xp:layout-report`), `scripts/xp-responsive-check.mjs`, `package.json` (script `xp:responsive`), `tsconfig.json` (`resolveJsonModule`)
**Dépend de :** T3.3, T3.6

**Spécification :**

```ts
export type LayoutIssueKind =
  | "horizontal-overflow"
  | "text-clipped"
  | "slot-overlap"
  | "cta-too-small"
  | "cta-unreachable"
  | "game-below-floor"
  | "wheel-not-square";
export interface LayoutIssue {
  kind: LayoutIssueKind;
  selector: string;
  editPath: string | null;
  detail: string;
}
export function layoutAudit(root: HTMLElement): LayoutIssue[];
```

**Détails :**

- **`layoutAudit`** : une **seule** implémentation, utilisée par le cadre (audit en direct du Studio, T6.10) et par le script. Contrôles :
  - défilement horizontal du document (`scrollWidth > innerWidth`) ;
  - élément qui sort du viewport horizontalement ;
  - texte coupé (`scrollWidth > clientWidth` ou `scrollHeight > clientHeight`) hors des zones `data-xp-clamp` ;
  - chevauchement des boîtes des 8 slots ;
  - CTA principal sous 44×44 px, ou hors d'atteinte (ni visible ni collant) ;
  - slot 5 sous le plancher `--xp-game-min` ;
  - roue non carrée (tolérance ± 1 px).

  `editPath` reprend l'attribut `data-xp-edit` le plus proche, pour que le Studio ouvre le bon champ.

- **Exposition** : le cadre expose `window.__xpLayoutAudit()` et ajoute le message `xp:layout-report` au pont : `{ width, height, mode: LayoutMode, issues: LayoutIssue[] }`, envoyé après chaque rendu et chaque redimensionnement (débouncé à 150 ms).
- **`presets/devices.json`** : le catalogue du plan §9.3.
  - Champs : `id`, `label`, `group` (`phone` | `tablet` | `laptop`), `width`, `height`, `dpr`, `touch`, `safeArea` en portrait.
  - Ajouter `"resolveJsonModule": true` dans `tsconfig.json`.
- **`scripts/xp-responsive-check.mjs`** : Node 22, **sans dépendance** (`WebSocket` natif + protocole DevTools de Chrome headless ; chemin de Chrome détecté aux emplacements Windows standard ou fourni par `CHROME_PATH`).
  - **Largeurs** : 280 → 2560 px par pas de 16 px, à 640 et 900 px de haut.
  - **Hauteurs** : 320 → 1200 px par pas de 20 px, à 360 et 1366 px de large.
  - **Catalogue** : chaque preset de `devices.json`, en portrait et en paysage, avec la densité de pixels et le tactile émulés (`Emulation.setDeviceMetricsOverride`, `Emulation.setTouchEmulationEnabled`). Captures d'écran pour ces seules tailles.
  - **Redimensionnement continu** : de 280 à 1920 px sans rechargement ; aucune erreur console.
  - **Langues** : fr et ar (et en en mode complet) ; option `--quick` (pas de 48 px, fr seulement) pour l'usage courant.
  - **Rapport** : défauts par taille et par écran, erreurs et avertissements de console ; code de sortie ≠ 0 s'il y a des défauts.
  - Utilisation : `npm run xp:responsive -- <url> [--quick] [--out <dossier>]`.

**Critères d'acceptation :**

- Tests unitaires de `layoutAudit` sur des fixtures DOM (débordement, texte coupé, chevauchement, CTA trop petit).
- Sur les fixtures du cadre : 0 défaut, 0 erreur console ; le rapport liste les tailles testées.

**Vérification :** `npm test -- layoutAudit` puis, serveur de dev lancé, `npm run xp:responsive -- "http://localhost:3000/xp-frame?fixture=welcome-midnight-gold" --quick`
**Commit :** `chore(Player-Experience): add shared layout audit and responsive sweep script`

---

## Phase 4 — Parcours et écrans

### T4.1 — Hook de parcours et composant racine

**Objectif :** relier la machine d'états aux services.

**Fichiers :** `XP/runtime/useExperienceFlow.ts`, `XP/runtime/PlayerExperience.tsx`
**Dépend de :** T1.10, T2.6, T3.5, T3.3

**Détails :**

- `useExperienceFlow({ config, campaign, services, locale })` : `useReducer(flowReducer)` + effets déclenchés par `nextCommand` (appel `draw`, puis `confirmCoupon`), analytics, `clientRequestId`, `dwellTime`.
- `PlayerExperience` : props du plan §8.1, dont `allowedGatewayModes`. Si le mode de la passerelle n'est pas autorisé, afficher un écran d'erreur explicite au lieu du jeu.
- **Pas de prop `surface`** : le runtime n'a qu'un mode de rendu, le document plein (plan §8.1).
- Badge « DEMO » affiché en haut à droite quand le mode n'est pas `live`, en respectant `--xp-safe-*`.
- `FrameHost` (T3.3) rend désormais `PlayerExperience` avec les services locaux, et relaie `xp:flow-event` à chaque changement d'écran.
- Un changement de taille pendant le parcours ne réinitialise jamais l'état : l'état vit dans le reducer, pas dans la mise en page.
- Aucune logique métier dans le composant : tout vient du domaine.

**Critères d'acceptation :** un test avec la passerelle scriptée parcourt gain, perte, doublon, fermée et erreur puis nouvelle tentative.

**Vérification :** `npm test -- flow`
**Commit :** `feat(Player-Experience): wire flow state machine to services`

---

### T4.2 — Écrans d'accueil et d'inscription

**Objectif :** l'entrée du parcours, conforme à la loi 18-07.

**Fichiers :** `XP/runtime/screens/WelcomeScreen.tsx`, `RegisterScreen.tsx`
**Dépend de :** T4.1, T3.6

**Réutilisation :** visuel de `PROTO/components/games/LeadCaptureForm.tsx` (après conversion des variantes `sm:`/`md:`) ; règles de validation de `PROD/PlayerLanding.tsx:30-56`.

**Détails :**

- **Accueil** :
  - slot 5 = `registry[campaign.gameType].Teaser` (plan §8.7), avec `active` piloté par `IntersectionObserver` + `visibilitychange` ;
  - jusqu'à la phase 5, `FallbackTeaser` (icône du jeu + légende automatique) ;
  - sections jackpot et chips (placement `stack`/`split` de T3.6) ;
  - titre, sous-titre et CTA par défaut propres au jeu (T1.7) ;
  - CTA `START` ; **toucher l'accroche émet aussi `START`**, jamais une partie.
- **Formulaire à toutes les hauteurs** : en densité `tight` (téléphone en paysage, clavier virtuel ouvert), le formulaire défile dans le slot 5 et le CTA reste collant. Un champ qui reçoit le focus est amené dans la zone visible (`scrollIntoView({ block: "nearest" })`).
- **Inscription** : champs issus de `config.form.fields` (nom, téléphone, email, wilaya avec la liste des 58 wilayas) ; téléphone toujours présent et requis ; validation à la soumission et au `blur` ; messages d'erreur traduits reliés au champ (`aria-describedby`, `aria-live="polite"`).
- **Consentement** : case **non cochée**, obligatoire, avec lien vers la feuille légale ; le CTA reste désactivé tant qu'elle n'est pas cochée.
- **Pas de captcha factice.**

**Critères d'acceptation :** impossible de soumettre sans consentement ni téléphone valide ; `0555123456` et `+213555123456` acceptés ; formulaire utilisable et soumissible à 844×390 et à 360×400.

**Vérification :** `npm test && npm run xp:responsive -- "http://localhost:3000/xp-frame?fixture=register" --quick`
**Commit :** `feat(Player-Experience): add welcome and registration screens`

---

### T4.3 — Écrans d'attente et de statut

**Objectif :** couvrir tous les cas non nominaux.

**Fichiers :** `XP/runtime/screens/ResolvingScreen.tsx`, `StatusScreen.tsx`
**Dépend de :** T4.1

**Réutilisation :** écrans `submitting`, `duplicate`, `inactive` et `error` de `PROD/../PlayerFlowPage.tsx:726-835`.

**Détails :**

- `ResolvingScreen` : indicateur et texte « Préparation de votre partie… » dans les trois langues.
- `StatusScreen` : variantes `duplicate`, `closed`, `error` ; chaque variante propose une sortie (réessayer, revenir à l'accueil, lien légal).
- Textes issus de `PARTICIPATION_ERROR_MESSAGES`.

**Critères d'acceptation :** aucune impasse ; `RETRY` réutilise le même `clientRequestId`.

**Vérification :** `npm test`
**Commit :** `feat(Player-Experience): add resolving and status screens`

---

### T4.4 — Écrans de gain et de défaite

**Objectif :** la fin du parcours.

**Fichiers :** `XP/runtime/screens/WinScreen.tsx`, `LoseScreen.tsx`
**Dépend de :** T4.1

**Réutilisation :** `PROTO/components/games/RewardVoucher.tsx` et `LoseConsolation.tsx` ; comportement de copie et de confirmation de `PROD/PlayerResult.tsx:30-46`.

**Détails :**

- **Gain** : nom du lot, `winMessage`, code (si présent) avec bouton « Copier » et confirmation « J'ai copié mon code » → `CONFIRM_COUPON` ; partage WhatsApp et Facebook optionnels ; confettis si le mouvement n'est pas réduit.
- **Défaite** : message de consolation, partage simple **sans** essai supplémentaire (`features.shareBonus` est figé à `false`).
- Aucun code n'est inventé côté client : si `couponCode` est `null`, afficher les instructions de retrait à la place.

**Critères d'acceptation :** la copie fonctionne ; la confirmation n'est envoyée qu'une fois ; aucun repli du type `AKT-DZ-9824X`.

**Vérification :** `npm test`
**Commit :** `feat(Player-Experience): add win and lose screens`

---

### T4.5 — Tests du parcours complet

**Objectif :** verrouiller la logique métier avant d'ajouter les jeux.

**Fichiers :** `XP/runtime/__tests__/flow.integration.test.tsx`
**Dépend de :** T4.2, T4.3, T4.4

**Détails :** avec Testing Library et la passerelle scriptée, jouer les 5 scénarios de bout en bout avec un moteur de jeu factice, en vérifiant les écrans affichés et les appels aux services.

**Critères d'acceptation :** 5 scénarios verts ; aucune fuite d'avertissement React.

**Vérification :** `npm test`
**Commit :** `test(Player-Experience): cover the full player flow`

---

## Phase 5 — Moteurs de jeu et accroches de pregame

> Chaque tâche T5.2 à T5.6 livre **le moteur et son accroche**, dessinés avec une primitive graphique commune (`WheelFace`, `ScratchCardFace`, `BoxFace`, `QuizCardFace`, `HitTarget`) : l'accueil montre exactement le jeu qui suivra.

### T5.1 — Contrat et registre

**Objectif :** cadre commun à toutes les mécaniques, moteurs et accroches.

**Fichiers :** `XP/runtime/games/types.ts`, `registry.ts`, `FallbackEngine.tsx`, `FallbackTeaser.tsx`, `useTeaserActivity.ts`, `gamesContract.test.ts`
**Dépend de :** T4.1

**Détails :**

- Contrats `GameEngineProps` (plan §8.6) et `GameTeaserProps` (plan §8.7).
- `registry` associe chaque `GameType` à `{ Engine, Teaser, defaultSettings, labels, autoCaption }` :
  - `autoCaption(campaign, locale)` renvoie la légende automatique de l'accroche, calculée à partir des règles publiques et des modèles de T1.7 ;
  - le moteur et l'accroche sont en `lazy()`, pour ne charger que le jeu de la campagne.
- `FallbackEngine` et `FallbackTeaser` affichent un message clair si une mécanique n'est pas encore branchée.
- `useTeaserActivity(ref)` : `active` = élément visible (`IntersectionObserver`) **et** onglet visible (`visibilitychange`).
- **Règles des accroches**, documentées dans `types.ts` (plan §8.7) :
  - montrer le jeu, jamais un résultat ;
  - non jouable (le toucher appelle `onStart`) ;
  - issue de la configuration ;
  - en pause quand `active` est faux ;
  - image fixe si `reducedMotion` ou `teaser.mode === "static"`.
- **Contrat de dimensionnement** (plan §8.6), documenté dans `types.ts` :
  - un moteur remplit le conteneur du slot 5 et ne lit jamais la taille de l'écran ;
  - tout canvas se redessine sur `useElementSize` à `taille × devicePixelRatio`, sans perdre sa progression ;
  - zones interactives ≥ 44×44 px ;
  - redimensionnement en cours de partie supporté ;
  - Pointer Events uniquement.
- `gamesContract.test.ts` échoue si `runtime/games/**` contient `window.innerWidth`, `window.innerHeight`, `matchMedia`, `vw`/`vh` ou un import de `services/local`.

**Critères d'acceptation :** ajouter une mécanique ne demande qu'une entrée dans le registre (moteur + accroche) ; aucun moteur ni aucune accroche n'importe `services/local` ; `gamesContract.test.ts` passe ; changer `gameType` dans une fixture change l'accroche de l'accueil.

**Vérification :** `npm run lint && npm run typecheck && npm test -- gamesContract`
**Commit :** `feat(Player-Experience): add game engine and teaser contracts and registry`

---

### T5.2 — Roue

**Objectif :** la mécanique principale, avec le bug du CTA corrigé.

**Fichiers :** `XP/runtime/games/wheel/WheelFace.tsx` (dessin partagé), `WheelEngine.tsx`, `WheelTeaser.tsx`, `wheelMath.ts`, `wheelMath.test.ts`
**Dépend de :** T5.1

**Réutilisation :** visuel de `PROTO/components/games/SpinWheel.tsx` et de l'accroche `WelcomeTeaser.tsx:25-118` (sans ses 6 segments codés en dur) ; atterrissage de `PROD/PlayerGame.tsx:119-207`.

**Détails :**

- **`WheelFace`** : dessine la roue (segments, libellés via `resolvePrizeDisplay` quand le libellé du segment est vide, couleurs, icônes, jante, pointeur, moyeu) à partir de `game.wheel`. Utilisée **à la fois** par le moteur et par l'accroche.
- `wheelMath.ts` : `pickSegmentForOutcome(segments, outcome, random)` (segment dont `prizeId` correspond à `outcome.prize.id`, sinon segment perdant, sinon repli), et `computeFinalRotation(segmentIndex, segmentCount, currentRotation, extraTurns)`. Le `segment_index` du serveur est ignoré (plan §6.4).
- La rotation démarre **quand `phase` passe à `revealing`**, jamais depuis un état interne : le CTA du slot 7 et le clic sur la roue émettent le même événement.
- Le moteur **ne tire rien** : il reçoit `outcome`.
- **Taille :** carré `width: min(100cqw, 100cqh)` + `aspect-ratio: 1` sur le conteneur du slot 5 (plus de `w-[260px]`/`w-[280px]`/`sm:w-[280px]`) ; pointeur et moyeu dans le `viewBox` du SVG, donc mis à l'échelle avec la roue ; `useId()` pour les identifiants SVG (plusieurs roues peuvent coexister).
- **Redimensionnement :** la rotation est portée par un angle, pas par des pixels. Un redimensionnement pendant la rotation ne change ni l'angle ni le segment d'arrivée.
- Sons de tic pendant la rotation ; désactivés en mouvement réduit.
- **Accroche (`WheelTeaser`)** :
  - la vraie roue de la campagne tourne lentement, avec de temps en temps une petite relance ;
  - jamais d'arrêt sur un segment, jamais de surbrillance d'un lot ;
  - pause quand `active` est faux ; image fixe en mouvement réduit ;
  - toucher = `onStart` ;
  - légende automatique « {n} lots à gagner ».

**Critères d'acceptation :**

- Pour chaque lot et pour la défaite, la roue s'arrête sur un segment compatible (test unitaire sur `wheelMath`).
- Le CTA lance bien la rotation.
- La roue reste carrée de 280 à 2560 px de large et en paysage (audit `wheel-not-square`).
- L'accroche affiche les mêmes segments, libellés et couleurs que le jeu ; modifier un segment dans la configuration change les deux.

**Vérification :** `npm test -- wheelMath`
**Commit :** `feat(Player-Experience): add wheel engine and teaser driven by configuration and server outcome`

---

### T5.3 — Grattage

**Objectif :** la carte à gratter.

**Fichiers :** `XP/runtime/games/scratch/ScratchCardFace.tsx` (dessin partagé), `ScratchEngine.tsx`, `ScratchTeaser.tsx`
**Dépend de :** T5.1

**Réutilisation :** canvas de `PROTO/components/games/ScratchCard.tsx` ; comportement de `PROD/PlayerScratch.tsx` ; foil animé de l'accroche `WelcomeTeaser.tsx:178-216` (sans ses textes codés en dur).

**Détails :**

- **Comportement :**
  - le lot est connu avant le grattage (`before-animation`) ;
  - seuil configurable (`revealThresholdPercent`) ;
  - image et texte de couverture de la marque (`coverImage`, `coverText`) ; lot révélé affiché via `resolvePrizeDisplay` ;
  - **bouton accessible « Révéler »** pour le clavier et les lecteurs d'écran ;
  - Pointer Events (doigt, souris, stylet) ;
  - nettoyage des écouteurs au démontage.
- **Taille :** carte en `aspect-ratio: 3 / 2`, largeur `min(100cqw, 150cqh)`, plus de `w-[290px]`/`w-[320px]` ni de `h-[190px]`/`h-[200px]`.
- **Redimensionnement sans perte :**
  - le masque de grattage est conservé en coordonnées normalisées (0–1) ;
  - sur `useElementSize`, le canvas est redimensionné à `taille × devicePixelRatio` et le masque est redessiné ;
  - le pourcentage déjà gratté est conservé.
- **Accroche (`ScratchTeaser`)** :
  - le même ticket (couverture et texte de la marque) ;
  - une pièce animée gratte une petite zone qui ne laisse voir que des reflets, **jamais un lot**, puis la zone se referme ;
  - légende automatique « Grattez pour découvrir votre surprise ».

**Critères d'acceptation :** révélation au seuil ; aucune fuite d'écouteur ; fonctionne au doigt et à la souris ; redimensionner de 360 à 1366 px en cours de grattage conserve la surface grattée et le pourcentage ; l'accroche utilise la couverture configurée et ne révèle aucun lot.

**Vérification :** `npm run build` + contrôle visuel
**Commit :** `feat(Player-Experience): add scratch card engine and teaser`

---

### T5.4 — Boîtes mystère

**Fichiers :** `XP/runtime/games/boxes/BoxFace.tsx` (dessin partagé), `BoxesEngine.tsx`, `BoxesTeaser.tsx`
**Dépend de :** T5.1

**Réutilisation :** `PROTO/components/games/LuckyBoxes.tsx` ; enchaînement de `PROD/PlayerMysteryBox.tsx` ; boîtes flottantes de l'accroche `WelcomeTeaser.tsx:218-260`.

**Détails :**

- **Jeu :**
  - le choix émet `{ kind: "boxes", selectedIndex }` → `awaiting-outcome` (boîte qui vibre) → ouverture avec le lot reçu (`resolvePrizeDisplay`) ;
  - **le lot ne dépend plus de l'index** (correction du prototype) ;
  - les deux autres boîtes se révèlent ensuite, sans promettre de faux lots.
- **Apparence** : icône et couleur de `game.boxes`. Les 3 boîtes restent alignées sur une ligne ; leur taille dérive de `cqmin` (jamais sous 44 px de zone tactile).
- **Accroche (`BoxesTeaser`)** :
  - les 3 mêmes boîtes flottent l'une après l'autre ;
  - le couvercle se soulève à peine sur une lueur, **sans contenu** ;
  - légende automatique « Choisissez votre boîte ».

**Critères d'acceptation :** même index et résultats différents → affichages cohérents ; l'accroche reprend l'icône et la couleur configurées et ne montre aucun lot.

**Vérification :** `npm run build` + contrôle visuel
**Commit :** `feat(Player-Experience): add mystery boxes engine and teaser`

---

### T5.5 — Quiz

**Fichiers :** `XP/runtime/games/quiz/QuizCardFace.tsx` (dessin partagé), `QuizEngine.tsx`, `QuizTeaser.tsx`
**Dépend de :** T5.1

**Réutilisation :** `PROTO/components/games/SpeedQuiz.tsx` ; enchaînement de `PROD/PlayerQuiz.tsx` ; anneau de chrono de l'accroche `WelcomeTeaser.tsx:121-176` (sans « 15s » ni « 3 Questions » codés en dur).

**Détails :**

- **Questions :**
  - issues de `campaign.quiz` (sans la bonne réponse) ;
  - affichées dans la langue du joueur via `resolveQuizQuestion` (traduction du Studio, sinon texte en base) ;
  - `answers` indexé par **l'id de question et l'index d'option en base**, donc identique quelle que soit la langue.
- **Chrono :** `rules.quiz.secondsPerQuestion` (0 = sans chrono, comme en production aujourd'hui).
- Pas de correction affichée avant le résultat ; une question sans réponse compte comme fausse.
- **Affichage :** options en 1 colonne, ou en 2 quand le conteneur fait au moins 480 px de large (`@container`) ; textes longs passés à la ligne, jamais coupés.
- **Accroche (`QuizTeaser`)** :
  - carte question avec des options remplacées par « ? » ;
  - anneau de chrono seulement si le chrono est actif ;
  - compteur 1/{n} qui défile ;
  - **jamais le texte d'une vraie question** ;
  - légende automatique « {n} questions » (+ « · {s} s chacune »).

**Critères d'acceptation :**

- La bonne réponse n'apparaît jamais dans le DOM avant le résultat.
- En arabe et en français, le même choix produit les mêmes `answers`.
- L'accroche affiche le vrai nombre de questions et ne contient le texte d'aucune question.

**Vérification :** `npm test` + contrôle visuel
**Commit :** `feat(Player-Experience): add quiz engine and teaser`

---

### T5.6 — Hit It

**Fichiers :** `XP/runtime/games/hitIt/HitTarget.tsx` (dessin partagé), `HitItEngine.tsx`, `HitItTeaser.tsx`
**Dépend de :** T5.1

**Réutilisation :** `PROD/PlayerHitIt.tsx` (mécanique complète déjà écrite). **Le prototype n'a pas d'accroche Hit It** : elle est à créer dans le même style.

**Détails :**

- **Règles :** durée et seuil issus de `rules.hitIt` (campagne : 10 s et `win_threshold`), affichés au joueur (« 8 touches en 10 s »).
- Envoi de `{ kind: "hitIt", hits }`.
- **Cible :** icône ou image de la marque (`game.hitIt`), dimensionnée sur `cqmin`, jamais sous 44 px ; positions en coordonnées relatives au conteneur (un redimensionnement ne les fait pas sortir de la zone).
- Alternative clavier (barre d'espace).
- **Accroche (`HitItTeaser`)** :
  - la même cible apparaît à des positions aléatoires, un compteur de démonstration monte, la barre de temps se vide, puis tout repart ;
  - étiquette « Démo » visible ;
  - légende automatique « {seuil} touches en {durée} s ».

**Critères d'acceptation :** le compteur est fiable ; la fin de partie déclenche le tirage ; le seuil affiché est celui de la campagne ; l'accroche est clairement étiquetée « Démo » et ne compte pour rien.

**Vérification :** `npm run build` + contrôle visuel
**Commit :** `feat(Player-Experience): add hit it engine and teaser`

---

### T5.7 — Contrôle responsive des 5 mécaniques

**Objectif :** valider le rendu à **toutes** les tailles avant d'attaquer le Studio.

**Fichiers :** fixtures de `XP/runtime/host/fixtures.ts` (une par mécanique et par écran clé), rapport du balayage
**Dépend de :** T5.2 → T5.6, T3.8

**Détails :**

- **Balayage complet** (`npm run xp:responsive`, sans `--quick`) sur `/xp-frame?fixture=…` : 5 mécaniques × 3 écrans clés (accueil, jeu, gain), en français et en arabe, sur toute l'enveloppe et sur tout le catalogue en portrait et en paysage.
- **Redimensionnement continu en cours de partie** (roue en rotation, grattage entamé, quiz en cours, Hit It en cours) : aucune remise à zéro, aucune erreur.
- **Accroches** : pour chaque mécanique, l'accueil montre la bonne simulation, avec le contenu de la fixture (segments, couverture, icônes, nombre de questions, règles) ; aucun lot montré ; image fixe en mouvement réduit ; aucune animation quand l'accroche est hors écran.
- **Captures** des presets du catalogue (accueil avec son accroche, jeu, gain), pour ta validation.
- **Comparaison côte à côte avec le prototype**, à taille égale, pour les 5 jeux et les écrans du parcours (`rules.md` D25) : chaque élément de signature du §6.2 et du §6.3 de `rules.md` est présent, et les améliorations apportées sont listées.

**Critères d'acceptation :** 0 défaut d'audit, 0 erreur console ; les 5 accroches sont conformes au plan §8.7 ; rapport et captures partagés pour ta validation (**point de validation n° 2**).

**Vérification :** `npm run xp:responsive -- "http://localhost:3000/xp-frame?fixture=all-games"`
**Commit :** `chore(Player-Experience): responsive check of all five mechanics`

---

## Phase 6 — Studio

### T6.1 — Store et sauvegarde automatique

**Fichiers :** `XP/studio/store.ts`, `useAutosave.ts`
**Dépend de :** T2.6, T1.11

**Réutilisation :** patterns de `MAKER/store/useEditorStore.ts` (zustand + zundo, historique limité, autosave par debounce).

**Détails :**

- État : `config`, `campaignId`, `ui` (panneau actif, écran d'aperçu, langue, mode de parcours), `ui.viewport` (appareil ou `responsive`, largeur, hauteur, orientation, zoom, cadre affiché), `saveStatus`, `issues`, `layoutIssues`.
- `ui.viewport` est initialisé depuis `viewportPrefs` (T6.9 ; valeur par défaut avant : 390×844, zoom `fit`) et n'entre **jamais** dans `config` ni dans l'historique : redimensionner l'aperçu ne crée pas d'entrée d'annulation.
- Actions par domaine : `updateTheme`, `updateBrand`, `updateScreen(key, patch)`, `updateSection`, `updateForm`, `updateGame`, `updateLegal`, `applyPreset`, `replaceConfig`, `resetToDefaults`. Chaque action met à jour `updatedAt` et recalcule `issues`.
- Historique `zundo` limité à 50 entrées, ne suivant que `config`.
- `useAutosave` : debounce 800 ms, statuts `idle | saving | saved | error`, bouton « Retry », garde `beforeunload` si non sauvegardé.

**Critères d'acceptation :** annuler/rétablir fonctionne ; le rechargement restitue la configuration.

**Vérification :** `npm test -- store`
**Commit :** `feat(Player-Experience): add studio store with undo and autosave`

---

### T6.2 — Ossature et aperçu à la taille réelle

**Fichiers :** `XP/studio/PlayerExperienceStudio.tsx`, `layout/{StudioShell,StudioTopBar,StudioNav,PreviewPane}.tsx`, `preview/{PreviewViewport,DeviceChrome}.tsx`
**Dépend de :** T6.1, T4.1, T3.3

**Réutilisation :**

- **coque** de `MAKER/canvas/DeviceFrame.tsx` et `PROTO/components/PhoneFrame.tsx` (encoche, barre d'état, horloge), sans leurs dimensions ;
- **patron** `ResizeObserver` d'`EditorCanvas.tsx`.

> ⚠️ **Ne pas reprendre le calcul de `MAKER/canvas/EditorCanvas.tsx:41-95`.** Il réduit la largeur et la hauteur CSS du cadre au lieu de zoomer : l'aperçu mettrait en page à une autre taille que l'appareil (plan §9.3).

**Détails :**

- Disposition du plan §9.1 ; responsive (aperçu en tiroir sous 1024 px).
- Barre du haut : sélecteur de campagne, annuler/rétablir, statut de sauvegarde, compteur de validation.
- Barre d'aperçu : écran, langue, mode (`Full flow (demo)`, `Scripted`, `Static screen`) et, en mode scripté, le scénario. La barre d'appareils arrive en T6.9.
- **`PreviewViewport`** :
  - iframe `/xp-frame?source=bridge` dont les attributs `width`/`height` valent **exactement** la taille CSS de l'appareil (par défaut 390×844, lue dans `ui.viewport`) ;
  - enveloppée d'un conteneur en `transform: scale(zoom)`, avec `transform-origin: top center` ; l'espace occupé est réservé à `taille × zoom` pour que la mise en page du Studio reste correcte ;
  - zoom `fit` = `min(zone disponible / taille de l'appareil avec sa coque, 1)`, recalculé par `ResizeObserver`.
- **Pont** (`createStudioBridge`, T3.3) :
  - attendre `xp:ready`, puis envoyer `xp:config` à chaque changement (débounce 100 ms) et `xp:ui` (écran, langue, mode, scénario, zones de sécurité, `restartKey` pour redémarrer le parcours) ;
  - `xp:edit-target` ouvre le panneau et le champ du `path` reçu ;
  - le cadre utilise `allowedGatewayModes={["demo","scripted"]}`.
- **`DeviceChrome`** : coque autour de l'iframe, barre d'état adaptée au mode sombre ou clair de la configuration, **aucune dimension en dur** (tout vient de `ui.viewport`).

**Critères d'acceptation :**

- Changer d'écran, de langue ou de mode ne perd pas la configuration ; l'aperçu reflète les modifications immédiatement.
- Dans l'iframe, `window.innerWidth === 390` quel que soit le zoom affiché.
- La feuille légale et les confettis restent dans l'appareil, sans jamais recouvrir le Studio.

**Vérification :** `npm run build` + contrôle visuel
**Commit :** `feat(Player-Experience): add studio shell and live preview`

---

### T6.3 — Champs réutilisables

**Fichiers :** `XP/studio/fields/{ColorField,ImageField,LocalizedTextField,ToggleField,SelectField,SegmentedControl,NumberField,ListEditor,IconPicker}.tsx`
**Dépend de :** T6.1

**Réutilisation :** patterns de `MAKER/panels/InspectorPanel.tsx` (sélecteur de couleur `react-colorful`, upload en data URL).

**Détails :**

- `LocalizedTextField` : onglets FR/AR/EN, `dir="auto"`, indicateur « traduction manquante », compteur de caractères avec seuil d'avertissement.
- `ImageField` : upload (via `AssetStorage`, avec l'usage `logo` | `background` | `scratchCover`), URL `https`, aperçu, suppression, message si l'image est trop lourde. Pour un fond : **sélecteur de point d'intérêt** (clic sur la vignette → `background.focus`), avec deux mini-aperçus de recadrage, portrait et paysage.
- `ColorField` : pastille, champ hexadécimal, sélecteur, et indicateur de contraste quand la couleur sert de fond à du texte.
- `ListEditor` : ajouter, supprimer, réordonner avec des boutons (pas de glisser-déposer au MVP), bornes minimum et maximum.
- Tous les libellés sont en **anglais**.

**Critères d'acceptation :** chaque champ est contrôlé, accessible au clavier et étiqueté.

**Vérification :** `npm run lint && npm run build`
**Commit :** `feat(Player-Experience): add studio form fields`

---

### T6.4 — Panneaux Template et Brand

**Fichiers :** `XP/studio/panels/TemplatePanel.tsx`, `BrandPanel.tsx`
**Dépend de :** T6.3

**Détails :**

- **Template** : galerie des 5 presets avec vignettes statiques (pastilles de couleurs, pas de rendu du runtime), application avec confirmation si le contenu a déjà été modifié, bouton « Reset to preset ».
- **Brand** : nom, tagline, logo (upload / URL / icône), 5 couleurs, mode sombre ou clair, fond (5 types + image + voile + point d'intérêt), arrondis, police latine.
- Chaque modification se voit immédiatement dans l'aperçu.

**Critères d'acceptation :** appliquer un preset puis changer une couleur ne casse aucun contraste sans avertissement.

**Vérification :** contrôle visuel
**Commit :** `feat(Player-Experience): add template and brand panels`

---

### T6.5 — Panneaux Content et Sections

**Fichiers :** `XP/studio/panels/ContentPanel.tsx`, `SectionsPanel.tsx`
**Dépend de :** T6.3

**Détails :**

- **Content** : sélecteur d'écran (Welcome, Register, Play, Win, Lose) puis, pour chacun : afficher l'en-tête, visuel, titre, sous-titre, renfort (type + texte), CTA principal et secondaire — tous en trois langues. Réglage des langues activées et de la langue par défaut.
- **Sections** : carte jackpot (activer, eyebrow, titre, badge, icône) et chips (1 à 4, via `ListEditor`).
- Cliquer sur un écran dans l'aperçu ouvre l'écran correspondant dans ce panneau.

**Critères d'acceptation :** un texte modifié apparaît dans l'aperçu dans la bonne langue, sans rechargement.

**Vérification :** contrôle visuel
**Commit :** `feat(Player-Experience): add content and sections panels`

---

### T6.6 — Panneaux Form et Game

**Fichiers :** `XP/studio/panels/FormPanel.tsx`, `XP/studio/panels/game/{GamePanel,CampaignRulesCard,PrizeDisplayEditor,WheelSegmentsEditor,ScratchSettings,BoxesSettings,HitItSettings,TeaserSettings}.tsx`
**Dépend de :** T6.3

**Détails :**

- **Form** : liste des champs (activer, requis, libellé, placeholder) ; le téléphone est verrouillé, avec une infobulle expliquant pourquoi ; texte de consentement (obligatoire) et version de la politique.
- **Game**, organisé selon le plan §6.6 : **règles en lecture seule en haut, présentation éditable en dessous**.
  - **`CampaignRulesCard`** (lecture seule, données de `useCampaigns`) :
    - type de jeu ; probabilité de gain ;
    - lots avec stock restant et poids ;
    - questions avec la bonne réponse marquée ✓ ;
    - seuils (`pass_threshold_percentage`, `win_threshold`), durée et chrono.

    Chaque bloc a un bouton **« Edit in campaign settings »**, qui appelle la prop `onEditCampaignSettings(campaignId, "rules" | "prizes" | "questions")` de `PlayerExperienceStudio` ; le bouton est masqué si la prop est absente. Au retour (focus de la fenêtre ou promesse résolue), `refetch()` de la campagne, et l'aperçu se met à jour.

  - **`PrizeDisplayEditor`** (tous les jeux) : pour chaque lot de la campagne, libellé et message de gain en fr/ar/en (valeur de la base en placeholder), icône, image ; bouton « Clean up » pour les entrées orphelines.
  - **`WheelSegmentsEditor`** (roue) :
    - « Generate from prizes » ;
    - de 4 à 12 segments, réordonnables par boutons haut/bas ;
    - pour chaque segment : lot lié (liste des lots, ou « Lose segment »), libellé fr/ar/en (vide = libellé du lot), couleur, icône ;
    - libellé du moyeu ;
    - note : « Segment size does not reflect odds — odds are set in campaign settings ».
  - **Grattage** : couverture (image + texte), seuil de révélation.
  - **Boîtes** : icône, couleur.
  - **Hit It** : icône ou image de la cible (la durée et le seuil sont en lecture seule dans `CampaignRulesCard`).
  - **Quiz** : traductions des questions → T6.11.
  - **`TeaserSettings`** (tous les jeux) : accroche animée ou fixe ; légende (vide = légende automatique, affichée en placeholder).
  - **Sans campagne** (`standalone`) : sélecteur de type de jeu et bandeau « Link a campaign to use real prizes and questions ».

**Critères d'acceptation :**

- Impossible de vider le texte de consentement sans une erreur bloquante ; les segments incohérents sont signalés.
- Aucun champ du Studio ne modifie un poids, un stock, une probabilité, une question, une bonne réponse ou un seuil (test : le store n'expose aucune action sur ces données).
- Modifier un libellé de segment ou l'affichage d'un lot change l'accueil (accroche) et le jeu dans l'aperçu.

**Vérification :** contrôle visuel + `npm test -- validation store`
**Commit :** `feat(Player-Experience): add form and game panels`

---

### T6.7 — Panneaux Legal et Share

**Fichiers :** `XP/studio/panels/LegalPanel.tsx`, `SharePanel.tsx`
**Dépend de :** T6.3

**Réutilisation :** téléchargement JSON de `MAKER/utils/exportImport.ts:6-18`.

**Détails :**

- **Legal** : organisateur, liens (type, libellé, URL filtrée), mention courte du footer, contenu des mentions légales (texte long, trois langues).
- **Share** : export JSON (nom de fichier normalisé), import JSON validé par le schéma avec rapport d'erreurs, bouton « Reset demo data » (vide `demoEntryStore`), et rappel que la configuration est locale à ce navigateur.

**Critères d'acceptation :** un JSON invalide est refusé avec un message clair et sans casser l'état courant.

**Vérification :** contrôle manuel d'un import valide et d'un import invalide
**Commit :** `feat(Player-Experience): add legal and share panels`

---

### T6.8 — Panneau de validation

**Fichiers :** `XP/studio/validation/ValidationPanel.tsx`
**Dépend de :** T6.2, T1.11

**Détails :** liste des erreurs et avertissements avec leur `path` ; clic → ouverture du panneau concerné et mise en évidence du champ ; compteur dans la barre du haut ; blocage explicite si une erreur bloquante existe (message « Fix required issues before sharing »).

**Critères d'acceptation :** consentement vide → erreur affichée et lien fonctionnel vers le champ.

**Vérification :** contrôle visuel
**Commit :** `feat(Player-Experience): add validation panel`

---

### T6.9 — Aperçu responsive façon DevTools _(nouvelle)_

**Objectif :** reproduire le mode appareil des DevTools du navigateur : appareils prédéfinis (téléphones, tablettes, ordinateurs) **et** redimensionnement libre (plan §9.3).

**Fichiers :** `XP/studio/preview/{DeviceToolbar,ResizableViewport,BreakpointRuler,CustomDevicesDialog}.tsx`, `viewportMath.ts`, `viewportMath.test.ts`, `customDevices.ts`, `viewportPrefs.ts`
**Dépend de :** T6.2, T3.8 (catalogue `presets/devices.json`)

> Peut être réalisée dès T6.2 terminée : aucun panneau n'en dépend.

**Spécification :**

```ts
// viewportMath.ts — pur, testé
export function clampToEnvelope(size: { width: number; height: number }): {
  width: number;
  height: number;
};
export function computeFitZoom(
  device: { width: number; height: number },
  chrome: Insets,
  available: { width: number; height: number },
): number; // ≤ 1
export function applyPointerDelta(
  size: Size,
  edge: "right" | "bottom" | "corner",
  dx: number,
  dy: number,
  zoom: number,
): Size; // delta ÷ zoom
export function rotate(
  size: Size,
  safeArea: Insets,
): { size: Size; safeArea: Insets };
```

**Détails :**

- **Sélecteur d'appareil :**
  - `Responsive`, puis les presets de `devices.json` groupés (Phones, Tablets, Laptops & desktops), puis les appareils personnalisés ;
  - entrée « Edit custom devices… ».
- **Largeur × hauteur :**
  - champs numériques toujours éditables, bornés par `clampToEnvelope` ;
  - modifier les dimensions d'un preset bascule en `Responsive`, comme dans les DevTools.
- **`ResizableViewport`** (mode Responsive) :
  - poignées sur le bord droit, le bord bas et le coin ;
  - glissement en Pointer Events avec `setPointerCapture` ;
  - **pendant le glissement, `pointer-events: none` sur l'iframe**, sinon elle capte le pointeur ;
  - delta divisé par le zoom ; taille affichée en direct pendant le glissement ;
  - poignées focalisables : flèches ±1 px, Maj + flèches ±10 px ;
  - double-clic : remplir la zone disponible.
- **Zoom** : `Fit`, 50, 75, 100, 125, 150 %.
- **Rotation** : `rotate` échange largeur et hauteur **et** fait tourner les zones de sécurité ; le résultat est envoyé au cadre par `xp:ui`.
- **Cadre d'appareil** : afficher ou masquer la coque (presets uniquement).
- **`BreakpointRuler`** :
  - paliers lus dans `runtime/layout/breakpoints.ts` (`compact` < 360, `stack` pleine largeur, `stack` centré ≥ 600, seuil `split`) ;
  - un clic règle la largeur sur ce palier.
- **Indicateur** : `390 × 844 · stack · regular · 100 %`, alimenté par `xp:layout-report` (T3.8).
- **Appareils personnalisés** (`customDevices.ts`) : nom, largeur, hauteur, groupe ; `localStorage` `xp:studio:devices:v1`.
- **Préférences** (`viewportPrefs.ts`) : appareil, dimensions, orientation, zoom, cadre ; `localStorage` `xp:studio:viewport:v1`.
  - Lectures et écritures protégées par `try/catch`, avec repli sur les valeurs par défaut.
  - Jamais dans `ExperienceConfig` ni dans l'historique `zundo`.
- **« Open in new window »** : `/xp-frame?source=local&campaignId=…`, pour utiliser les vraies DevTools et le vrai redimensionnement du navigateur.

**Critères d'acceptation :**

- Glisser la poignée de 280 à 2560 px fait changer la disposition en direct (`stack` → `split`), sans casse ni erreur console.
- Le zoom ne change jamais `window.innerWidth` dans l'iframe.
- Une rotation d'un preset avec encoche déplace les zones de sécurité sur le côté.
- Un appareil personnalisé et le dernier appareil choisi survivent au rechargement.
- Toute la barre est utilisable au clavier.

**Vérification :** `npm test -- viewportMath && npm run build` + contrôle manuel
**Commit :** `feat(Player-Experience): add devtools-like responsive preview toolbar`

---

### T6.10 — Audit de mise en page dans le Studio _(nouvelle)_

**Objectif :** prévenir la marque quand **son contenu** casse à une taille donnée, par exemple un titre trop long pour un petit téléphone.

**Fichiers :** `XP/studio/preview/useLayoutReport.ts`, `CheckAllSizes.tsx`, `XP/studio/validation/ValidationPanel.tsx` (extension)
**Dépend de :** T6.9, T6.8, T3.8

**Détails :**

- **Rapport en direct :**
  - chaque `xp:layout-report` alimente `layoutIssues` dans le store ;
  - le panneau de validation affiche ces défauts comme des avertissements **étiquetés par taille** (« At 360×640: subtitle is truncated ») ;
  - un clic ouvre le champ correspondant (`editPath` → panneau).
- **« Check all sizes » :**
  - iframe masquée qui parcourt le catalogue, en portrait et en paysage, pour l'écran et la langue courants ;
  - progression affichée, opération annulable ;
  - résultats groupés par appareil.
- Ces avertissements **ne bloquent jamais** la sauvegarde. Seules les erreurs de `validateExperience` bloquent.

**Critères d'acceptation :**

- Un titre de 120 caractères provoque un avertissement à 280 et 360 px, mais pas à 834 px.
- Le lien de l'avertissement ouvre le champ du titre.
- « Check all sizes » termine sur tout le catalogue et peut être annulé.

**Vérification :** contrôle manuel
**Commit :** `feat(Player-Experience): surface layout audit issues in the studio`

---

### T6.11 — Traductions du quiz _(nouvelle)_

**Objectif :** permettre à la marque de présenter les questions de son quiz en français, en arabe et en anglais, alors que la base n'en stocke qu'une langue, **sans jamais toucher à la bonne réponse** (plan §6.6).

**Fichiers :** `XP/studio/panels/game/QuizTranslationsEditor.tsx`, `XP/domain/quizTranslation.ts` (`hashQuestionSource`), tests
**Dépend de :** T6.6, T1.8

**Détails :**

- **Liste des questions** de la campagne, dans l'ordre `position` :
  - texte source et options en base, **en lecture seule**, bonne réponse marquée ✓ ;
  - lien « Edit questions in campaign settings » (étape 4 du Wizard).
- **Pour chaque question**, onglets FR / AR / EN (`LocalizedTextField`) : texte de la question et **un champ par option, dans l'ordre de la base**. On ne peut ni ajouter, ni supprimer, ni réordonner une option.
- **À l'enregistrement d'une traduction**, `sourceHash = hashQuestionSource(texte, options)` est stocké avec elle.
- **Traduction périmée** (question modifiée dans le Wizard) :
  - badge « Outdated » ;
  - « Review translation » affiche l'ancien et le nouveau texte source côte à côte, puis « Mark as reviewed » recalcule le `sourceHash` ;
  - tant qu'elle n'est pas revue, le runtime affiche le texte en base (T1.8).
- Indicateur global : « 3/3 questions translated in Arabic ».

**Critères d'acceptation :**

- Traduire une question en arabe la fait apparaître en arabe dans l'aperçu (`[AR]`), sans changer les `answers` envoyés.
- Modifier la question dans le Wizard puis revenir marque la traduction « Outdated ».
- Aucun élément de l'éditeur ne permet de changer la bonne réponse.

**Vérification :** `npm test -- quizTranslation` + contrôle visuel
**Commit :** `feat(Player-Experience): add quiz question translations`

---

## Phase 7 — Intégration et nettoyage

### T7.1 — Branchement dans l'application

**Fichiers :** `src/App.tsx`, `src/AppRouter.tsx`, `src/components/CampaignWizard.tsx`
**Dépend de :** T6.10, T6.11

**Détails :**

1. `App.tsx` : l'onglet `playerScreen` rend `PlayerExperienceStudio` (campagne courante via `sandboxCampaignId`) à la place de `PlayerUIMaker`.
2. `AppRouter.tsx` : `/studio` rend le Studio ; `/ui-maker` redirige vers `/studio`.
3. `CampaignWizard.tsx` :
   - « Customize in UI Editor » ouvre le Studio ;
   - supprimer les appels à `createProjectForGameType` (lignes ~261 et ~1568) et cesser d'écrire `uiProject` ; conserver la valeur existante si elle est déjà en base ;
   - nouvelle prop optionnelle `initialStep` (1 à 4), pour ouvrir directement « Game Rules », « Reward Weights » ou « Challenge Builder ».
4. **« Edit in campaign settings »** : `App.tsx` fournit `onEditCampaignSettings` au Studio.
   - Correspondance : `rules` → étape 2, `prizes` → étape 3, `questions` → étape 4.
   - La prop ouvre le Wizard en édition sur cette campagne et, à la fermeture, revient au Studio et appelle `refetch()`.

**Critères d'acceptation :**

- Ouvrir l'onglet, sélectionner une campagne et éditer fonctionne ; aucune régression ailleurs dans le tableau de bord.
- Depuis le Studio, « Edit in campaign settings » ouvre la bonne étape. Une question ou un lot modifié dans le Wizard apparaît dans l'aperçu au retour, et une traduction devenue périmée est signalée.

**Vérification :** `npm run verify` + parcours manuel
**Commit :** `feat(Player-Experience): replace player screen tab with the new studio`

---

### T7.2 — Simulateur de l'application

**Fichiers :** `src/App.tsx`
**Dépend de :** T7.1

**Détails :**

- Le tiroir « Portal Simulator » rend **`PreviewViewport`** (iframe `/xp-frame`, T6.2) avec un preset téléphone par défaut (390×844, zoom `fit`), la passerelle de démo et la configuration de la campagne sélectionnée (ou les valeurs par défaut).
- **Jamais de rendu direct** de `PlayerExperience` dans le tiroir : il suivrait la fenêtre du tableau de bord au lieu de l'appareil (plan, principe 10).
- Supprimer `mapCampaignToBrandPreset` et les couleurs codées en dur selon le nom de la marque (`App.tsx:349-405`), ainsi que l'état de simulation devenu inutile.

**Critères d'acceptation :** le simulateur joue le parcours complet ; `window.innerWidth === 390` dans son iframe, quelle que soit la largeur du tiroir ; `App.tsx` perd plus de lignes qu'il n'en gagne.

**Vérification :** `npm run verify` + parcours manuel
**Commit :** `refactor(Player-Experience): run the app sandbox on the new runtime`

---

### T7.3 — Suppression du code et des dépendances obsolètes

**Fichiers :** suppressions listées au plan §10.3, `package.json`
**Dépend de :** T7.2

**Détails :**

1. Vérifier l'absence d'imports restants : `grep -rn "player-ui-maker\|player-editor\|PlayerScreenConfig" src`.
2. Supprimer `src/components/player-ui-maker/`, `src/components/player-editor/`, `src/components/PlayerScreenConfig.tsx`.
3. Supprimer `src/contexts/PlayerContext.tsx` **si** `usePlayer` reste inutilisé, ainsi que `PlayerProvider` dans `AppRouter.tsx`.
4. Désinstaller : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-moveable`, `react-selecto`, `gsap`, `@gsap/react`, `lottie-react`. **Conserver** `zustand`, `zundo`, `canvas-confetti`, `react-colorful`.
5. Déplacer `aktera---gamified-marketing-experience/` hors du dépôt (ou l'archiver), une fois la récupération terminée.

**Critères d'acceptation :** `npm run verify` vert ; aucun import mort ; le poids du bundle diminue (noter la valeur avant et après).

**Vérification :** `npm run verify`
**Commit :** `chore(Player-Experience): remove legacy editors and unused dependencies`

---

### T7.4 — Documentation et recette finale

**Fichiers :** `CLAUDE.md`, `XP/README.md`, `ai-assistance-prompts-reports/playereditor/tasks.md` (suivi)
**Dépend de :** T7.3

**Détails :**

1. `CLAUDE.md` : remplacer les sections « Player UI Maker / Player Editor » par la description du module `player-experience` (couches, ports et adaptateurs, règle d'autorité du résultat, `localStorage` au MVP, **runtime toujours rendu dans son propre document**, règles responsive du plan §8.3) ; rappeler que `/play/:slug` sera branché plus tard.
2. Mettre à jour le tableau de suivi de ce fichier.
3. Recette complète du plan §13.3, avec le **balayage responsive complet** (`npm run xp:responsive`) et les presets du catalogue en portrait et en paysage, en 3 langues.
4. Lister ce qui reste pour l'après-MVP (adaptateurs Supabase, nouvelles mécaniques, lien de démo).

**Critères d'acceptation :** recette passée ; documentation à jour ; liste des restes écrite.

**Vérification :** `npm run verify` + recette
**Commit :** `docs(Player-Experience): document the new architecture and close the MVP`

---

## Points de validation avec toi

| Moment           | Après | Ce que tu valides                                                                                                                                                                                                                                      |
| ---------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Validation 1** | T2.6  | Le domaine et les services tournent (tests verts), le contrat est figé                                                                                                                                                                                 |
| **Validation 2** | T5.7  | Le rendu joueur est fidèle à la capture, sur les 5 mécaniques, **à toutes les tailles** (rapport du balayage + captures du catalogue en portrait et en paysage), et **au moins aussi beau que le prototype** (comparaison côte à côte, `rules.md` D25) |
| **Validation 3** | T7.4  | Recette finale et suppression du legacy ; Studio comparé à l'UX du prototype et aux maquettes validées (`rules.md` D21, D25)                                                                                                                           |

## Repli si le temps manque

Ordre de sacrifice, du moins grave au plus grave :

1. T6.9 partiel : appareils personnalisés et règle des points de rupture → reportés. Le catalogue, le mode Responsive à poignées, largeur × hauteur, la rotation et le zoom restent.
2. T6.10 partiel : bouton « Check all sizes » → reporté. L'audit en direct reste.
3. T6.11 (traductions du quiz) → reportée : les questions s'affichent dans la langue saisie dans le Wizard.
4. T6.7 (Legal et Share) → valeurs par défaut sans édition.
5. T6.8 (panneau de validation) → seulement le compteur, qui inclut aussi les défauts de l'audit de mise en page.
6. T5.5 et T5.6 (quiz, Hit It) → `FallbackEngine` en attendant.
7. T7.3 (suppression du legacy) → reportée d'une journée, sans impact fonctionnel.

**Jamais sacrifiés :**

- T1.10 (machine d'états), T1.2 (téléphone), T2.4 (passerelles), T4.2 (consentement), T5.2 (roue) ;
- T3.2 (mise en page adaptative), T3.3 (hôte iframe), T3.8 (balayage) ;
- les accroches de pregame de T5.2 à T5.6 (au minimum `FallbackTeaser` pour quiz et Hit It si ces moteurs sont reportés) ;
- le cœur de T6.9 : taille CSS réelle, catalogue, mode Responsive, rotation, zoom.
