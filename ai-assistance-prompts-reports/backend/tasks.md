# Tâches — Brancher le Player Experience sur Supabase (MVP)

**Date :** 2026-09-28
**Règles :** [`rules.md`](./rules.md). Elles l'emportent sur ce fichier en cas de conflit.
**Référence technique :** [`plan-branchement-supabase-player-experience.md`](./plan-branchement-supabase-player-experience.md) (SQL complet, signatures, correspondances). Ce fichier **simplifie** le plan : quand ils diffèrent, ce fichier l'emporte.
**Contexte :** [`diagnostic-branchement-supabase-player-experience.md`](./diagnostic-branchement-supabase-player-experience.md) et [`pipeline-final-player-experience.md`](./pipeline-final-player-experience.md).
**Abréviation :** `XP/` = `src/features/player-experience/`

> **Objectif du MVP :**
>
> 1. Le design fait dans le Studio est enregistré sur le serveur.
> 2. La page `/play/:slug` affiche ce design, avec le vrai tirage serveur.
> 3. La base n'est plus ouverte aux anonymes.
>
> **Moyens, et rien de plus :** 1 table ajoutée (`campaign_experiences`, le design du Studio), 4 migrations, 1 Edge Function durcie, 4 adaptateurs, 1 nouvelle page.

---

## 0. Mode d'emploi

### 0.1 Exécution

- Tu me donnes une tâche ou un lot. Je les fais dans l'ordre, et **je commite moi-même** chaque tâche terminée ([`rules.md`](./rules.md) R1, R3, §2).
- Chaque tâche a :
  - **une documentation** : `tasks_docs/phase_B<n>/<ID>-<titre>.md` ;
  - **un commit** : le message de la ligne « Commit » de la fiche.
- **Les tâches marquées 👤** demandent une action de ta part (Supabase Cloud, Firebase, téléphone réel). Je prépare tout, et je m'arrête au point où tu dois intervenir.

### 0.2 Conventions

| Sujet            | Règle                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branche          | `feat/player-experience-backend`, créée en B0.1                                                                                                   |
| Migrations       | Une par tâche SQL, idempotente, appliquée par `npx supabase migration up` puis rejouée une 2ᵉ fois (jamais de `db reset` sans accord, rules §6.4) |
| Scopes de commit | `Supabase` · `Player-Experience` · `Backend`                                                                                                      |
| Vérification     | `npm run verify` avant chaque commit, plus les commandes de la fiche                                                                              |
| Langue           | Documentation en français ; code, SQL, tests, messages et commits en anglais                                                                      |

### 0.3 Décisions appliquées par défaut

Modifiables avant la tâche concernée : il suffit de me le dire.

| #   | Décision                                          | Valeur retenue                                                                                                                                                                                                                        | Tâche |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| D1  | Où ranger le design du Studio                     | **Table séparée `campaign_experiences`**, une ligne par campagne (validée le 2026-09-29). La table `campaigns` n'est pas modifiée, le Wizard ne peut pas écraser le design, et un brouillon / historique pourra s'y ajouter plus tard | B1.2  |
| D2  | Lecture publique d'une campagne                   | Une fonction SQL `get_public_experience(slug)`, sans ouvrir la table `campaigns` aux anonymes                                                                                                                                         | B1.2  |
| D3  | Tirages du Studio et du sandbox                   | Restent en démo : jamais de vrai stock consommé                                                                                                                                                                                       | B4.1  |
| D4  | Publication                                       | Immédiate : chaque enregistrement est vu tout de suite par les joueurs (pas de brouillon)                                                                                                                                             | —     |
| D5  | Wilaya, preuve du consentement                    | Dans le champ libre `entries.metadata` (aucune colonne nouvelle)                                                                                                                                                                      | B2.1  |
| D6  | Détail du jeu (score, réponses, touches)          | Non gardé : seul « réussi / raté » (`quiz_passed`), comme aujourd'hui                                                                                                                                                                 | —     |
| D7  | Afficher wilaya et consentement dans Participants | Non : les données sont en base, l'affichage vient après le MVP                                                                                                                                                                        | —     |
| D8  | Studio en mode autonome (sans campagne)           | Reste dans le navigateur (`localStorage`)                                                                                                                                                                                             | B4.1  |
| D9  | Images                                            | Supabase Storage, bucket existant `campaign-media`                                                                                                                                                                                    | B3.3  |
| D10 | Fonctions du dashboard ouvertes aux anonymes      | Passées en `SECURITY INVOKER` (les règles d'accès existantes s'appliquent) plutôt que réécrites                                                                                                                                       | B1.1  |

### 0.4 Retiré du périmètre par rapport au plan (pour rester minimal)

| Élément du plan                                          | Devenu                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| B0.2 « Sonde de sécurité » (tâche à part)                | Petit script intégré à **B1.1**                                                 |
| B2.2 « Script de test de `select-prize` » (tâche à part) | Intégré à **B2.1**                                                              |
| B3.4 Analytics + B3.5 Compositions                       | Fusionnés en **B3.4**                                                           |
| B5.2 Chargeur + B5.3 Page                                | Fusionnés en **B5.2**                                                           |
| B4.4 Badge « Live » dans le Studio                       | **Retiré** (après le MVP)                                                       |
| Conversion des images lors de l'import (B4.3)            | **Retirée** : les anciennes images restent en `dataUrl` et s'affichent toujours |
| Audit de la base cloud en B0.1                           | Déplacé dans le guide de mise en ligne (**B6.3**), là où il sert                |
| Battement de cœur des visites toutes les 5 s             | Non repris (une visite à l'ouverture, une à l'envoi du formulaire)              |

### 0.5 Avancement

| Phase | Titre                    | Tâches      | Statut   | Index                                       |
| ----- | ------------------------ | ----------- | -------- | ------------------------------------------- |
| B0    | Préparation              | B0.1        | Terminée | [phase_B0](./tasks_docs/phase_B0/README.md) |
| B1    | Base de données          | B1.1 – B1.3 | Terminée | [phase_B1](./tasks_docs/phase_B1/README.md) |
| B2    | Tirage serveur           | B2.1        | Terminée | [phase_B2](./tasks_docs/phase_B2/README.md) |
| B3    | Adaptateurs Supabase     | B3.1 – B3.4 | Terminée | [phase_B3](./tasks_docs/phase_B3/README.md) |
| B4    | Studio sur Supabase      | B4.1 – B4.3 | Terminée | [phase_B4](./tasks_docs/phase_B4/README.md) |
| B5    | Page joueur              | B5.1 – B5.2 | À faire  | [phase_B5](./tasks_docs/phase_B5/README.md) |
| B6    | Recette et mise en ligne | B6.1 – B6.3 | À faire  | [phase_B6](./tasks_docs/phase_B6/README.md) |

**Statuts :** À faire · En cours · Terminée · Bloquée

---

## Phase B0 — Préparation

### B0.1 — Branche, pile Supabase locale et documents de travail

**Objectif :** partir d'une base propre. Une branche dédiée, une base Supabase locale qui démarre, et les documents du branchement commités.

**Description :**

- Créer la branche `feat/player-experience-backend` depuis `Refactor/PlayerEditor` (branche actuelle).
- **Vérifier la pile locale** (`npx supabase status`) et que **toutes les migrations du dépôt sont appliquées** (`npx supabase migration list --local`). `supabase/config.toml` est ignoré par git (`supabase/.gitignore`) : l'outil marche avec ses réglages par défaut.
- **Sauvegarder la base locale** (`pg_dump`) dans `supabase/.temp/backups/`. **Pas de `db reset`** : il effacerait les données locales et changerait les identifiants des campagnes (rules §6.4).
- Vérifier que `.env.local` pointe sur `http://127.0.0.1:54321` avec la clé anon locale. **Ne pas le commiter.**
- Vérifier que l'utilisateur de test `studio.test@octoreach.local` se connecte et voit les campagnes de son organisation.
- Relever l'état de départ (ce qui marche) : lint, typecheck, tests, build, contenu de la base, failles visibles. C'est la référence de non-régression (R5).
- Commiter les documents déjà écrits : diagnostic, plan, pipeline, `tasks.md`, `rules.md`, les index `tasks_docs/`.

**Fichiers :** `ai-assistance-prompts-reports/backend/**`
**Dépend de :** —
**Durée :** 0,25 j

**Critères d'acceptation :**

- la pile locale répond et les 24 migrations du dépôt sont appliquées ;
- une sauvegarde de la base locale existe ;
- l'utilisateur de test se connecte et voit les campagnes de son organisation ;
- la documentation liste l'état de départ.

**Vérification :** `npx supabase status`, `npx supabase migration list --local`, `npm run verify`
**Commit :** `chore(Backend): prepare the local Supabase stack and the wiring plan`

---

## Phase B1 — Base de données

### B1.1 — Fermer les accès anonymes

**Objectif :** qu'un visiteur anonyme ne puisse plus lire les participants, écrire des participations, ni appeler les fonctions internes du tirage ou du dashboard. L'ancienne page `/play/:slug` continue de marcher par son chemin normal (`select-prize`).

**Description :**

- **Migration** (SQL détaillé : plan, B1.1) :
  - supprimer les 3 politiques ouvertes de `entries` : `select_entries_failsafe`, `public_insert_entries`, `anon_confirm_coupon` ;
  - `draw_and_claim_campaign_prize`, `resolve_game_outcome`, `claim_campaign_prize_coupon` → exécutables **par `service_role` seulement** ;
  - `save_campaign_full_in_place`, `get_campaign_participants`, `get_campaign_analytics_v2` → passées en `SECURITY INVOKER` et retirées à anon (restent pour `authenticated`) ;
  - supprimer l'ancienne signature à 17 paramètres de `save_campaign_full_in_place`, si elle existe encore.
- **`src/services/analyticsService.ts`** : retirer les replis qui rappellent les fonctions avec `p_organization_id: null` puis sans argument (« global scope »), et la lecture de toutes les campagnes (`allCampData`). Garder l'appel avec l'`organizationId` de l'utilisateur.
- **Petit script de vérification** `scripts/backend/anon-probe.mjs` + script npm `backend:probe` :
  - il essaie, **avec la clé anon**, de : lire `entries`, insérer dans `entries`, appeler les 6 fonctions ci-dessus ;
  - il vérifie que `select-prize` et `record_campaign_impression` restent accessibles ;
  - il affiche un tableau OK/KO et sort en erreur si un accès interdit passe ;
  - il refuse de tourner hors de la base locale (rules §6.8).
- **Tester tout le dashboard, connecté :** Campaigns (création et modification par le Wizard), Participants, Analytics, Inventory. Tester aussi une participation sur l'ancienne page.

**Si une fonction casse en `SECURITY INVOKER`** (une table sans règle d'accès pour les utilisateurs connectés) : pour cette fonction seulement, la garder en `SECURITY DEFINER` et ajouter en tête `IF NOT is_org_member(p_organization_id) THEN RAISE EXCEPTION 'forbidden' …`. Le documenter.

**Fichiers :** `supabase/migrations/<ts>_close_anonymous_access.sql`, `src/services/analyticsService.ts`, `scripts/backend/anon-probe.mjs`, `package.json`
**Dépend de :** B0.1
**Durée :** 0,75 j

**Critères d'acceptation :**

- `npm run backend:probe` est entièrement vert ;
- les 4 écrans du dashboard marchent comme avant ;
- l'ancienne page accepte une participation par `select-prize`.

**Vérification :** `npx supabase migration up` + 2ᵉ passage de la migration, `npm run backend:probe`, `npm run verify`, test manuel du dashboard
**Commit :** `fix(Supabase): close anonymous access to entries and internal functions`

---

### B1.2 — Table du design et lecture publique

**Objectif :** donner au design du Studio sa propre table, séparée des règles de la campagne, et aux joueurs une lecture publique qui ne contient que des informations sûres.

**Description :**

- **Migration** (SQL complet : plan, B1.2) :
  - **Table `campaign_experiences`**, une ligne par campagne :
    - `campaign_id` : clé primaire, référence `campaigns`, supprimée avec la campagne (`ON DELETE CASCADE`) ;
    - `organization_id` : sert aux règles d'accès ;
    - `config` (`jsonb`) : tout le design du Studio ;
    - `updated_at` : contrôle « modifié entre-temps » ;
    - `updated_by` : dernier auteur.

    **RLS activé.** Règles d'accès `select` / `insert` / `update` / `delete` pour les membres de l'organisation (`is_org_member(organization_id)`), et **aucune** règle pour anon.

  - **`save_experience_config(p_campaign_id, p_config, p_expected_updated_at)`**, en `SECURITY INVOKER`, réservée à `authenticated`. Elle :
    - refuse un design de plus de ~2 Mo (`TOO_LARGE`) ;
    - lit la campagne pour recopier son `organization_id` ; campagne invisible pour l'utilisateur → `NOT_FOUND` ;
    - fixe elle-même `updatedAt`, `campaignId` (dans le JSON) et `updated_by` ;
    - **crée la ligne** si elle n'existe pas, sinon la met à jour **seulement si** `p_expected_updated_at` correspond, sinon renvoie `CONFLICT`.
  - **`get_public_experience(p_slug)`**, en `SECURITY DEFINER`, exécutable par anon et `authenticated`. Elle renvoie :
    - `found` ;
    - la campagne (id, slug, nom, type de jeu, statut, seuils affichables) ;
    - les lots actifs (id, nom, message de gain) ;
    - les questions actives (id, texte, options, **sans bonne réponse**) ;
    - la disponibilité (`open`, ou fermée avec la raison `CLOSED` / `SOLD_OUT`) ;
    - le design (`campaign_experiences.config`, par une jointure ; `null` s'il n'existe pas).

    Une campagne `draft` ou `archived` renvoie `found: false`.
- **Étendre `anon-probe.mjs`** :
  - `get_public_experience` répond, sans `correct_option_index`, `weight`, `quantity` ni `win_probability` ;
  - `save_experience_config` est refusée à anon ;
  - la lecture directe de `campaign_experiences` par anon renvoie 0 ligne.
- Vérifier en SQL, en local, avec un utilisateur de l'organisation et un utilisateur d'une autre organisation.
- **Ne pas toucher** la table `campaigns`, `player_screen_config`, le Wizard ni `useCampaigns`.
- **Duplication d'une campagne :** le design n'est pas copié dans le MVP (la copie repart du design par défaut). À noter dans « Après le MVP ».

**Fichiers :** `supabase/migrations/<ts>_add_campaign_experiences.sql`, `scripts/backend/anon-probe.mjs`
**Dépend de :** B1.1
**Durée :** 0,75 j

**Critères d'acceptation :**

- 1ᵉʳ enregistrement → la ligne est créée, `ok` ;
- 2ᵉ enregistrement avec le bon `updatedAt` → `ok` ; avec l'ancien → `CONFLICT` ;
- utilisateur d'une autre organisation → `NOT_FOUND`, et ne voit pas la ligne en lecture directe ;
- anon → refusé ;
- campagne supprimée → sa ligne de design disparaît aussi ;
- lecture publique : slug inconnu ou brouillon → `found: false` ; campagne en pause → `CLOSED` ; campagne sans design → `experience: null` ; aucun champ interdit.

**Vérification :** `npx supabase migration up` + 2ᵉ passage de la migration, `npm run backend:probe`, `npm run verify`
**Commit :** `feat(Supabase): store the player experience design and expose a safe public read`

---

### B1.3 — Pas de tirage après un jeu d'adresse raté

**Objectif :** un joueur qui rate le Hit It (sous le seuil) ou le quiz (sous le score) perd **toujours**. Aujourd'hui, un Hit It raté peut gagner.

**Description :**

- **Migration :** `CREATE OR REPLACE FUNCTION resolve_game_outcome`, copie de la version actuelle avec **un seul** changement dans les branches `quiz` et `hit_it` :
  - si `v_passed` est faux, renvoyer « perdu » **sans appeler** `draw_and_claim_campaign_prize` ;
  - sinon, appeler le tirage avec `true`.

  Ajouter `SET search_path = public` et réappliquer les droits `service_role` de B1.1.

- Rien d'autre ne change (segments de la roue, boîtes).
- Même règle que le moteur de démo (`XP/services/local/demoDrawEngine.ts`) : aucune différence entre l'aperçu et la production.

**Fichiers :** `supabase/migrations/<ts>_skill_games_never_draw_on_failure.sql`
**Dépend de :** B1.1
**Durée :** 0,25 j

**Critères d'acceptation :** en local, sur une campagne Hit It avec `win_probability = 1` : `hits` sous le seuil → perdu à chaque fois, stock intact ; `hits` au-dessus → gagné. Même chose pour un quiz raté ou réussi.

**Vérification :** `npx supabase migration up` + 2ᵉ passage de la migration, requêtes SQL de test (écrites dans la documentation), `npm run verify`
**Commit :** `fix(Supabase): never draw a prize after a failed skill game`

---

## Phase B2 — Tirage serveur

### B2.1 — Durcir `select-prize`

**Objectif :** que la fonction de tirage applique toutes les règles attendues. Sa réponse doit rester compatible avec l'ancienne page, qui existe jusqu'à B6.2.

**Description :** dans `supabase/functions/select-prize/index.ts` (ordre des étapes : plan, B2.1) :

- **Consentement obligatoire :** sans `metadata.consent.accepted === true` (avec `acceptedAt` et `policyVersion`) → `400`, `code: "CONSENT_REQUIRED"`. La preuve est gardée dans `entries.metadata.consent`.
- **Même tentative rejouée** (coupure réseau puis « Réessayer ») : si une participation existe déjà avec la même campagne, le même téléphone et le même `metadata.client_request_id`, renvoyer **la même réponse** (lot, coupon) avec `replayed: true`, sans rien écrire.
- **Campagne hors période** (`start_date` / `end_date`) → `CAMPAIGN_CLOSED`.
- **Coupon réservé sans doublon :**
  - remplacer les étapes A/B/C actuelles (lecture de tous les coupons utilisés, puis choix du premier libre) par la fonction existante `claim_campaign_prize_coupon` ;
  - l'appeler **après** l'insertion de la participation.
- **Un `code` sur chaque erreur** (`INVALID_INPUT`, `CONSENT_REQUIRED`, `CAMPAIGN_CLOSED`, `ALREADY_PARTICIPATED`, y compris le cas `23505`, et `DRAW_FAILED`), en **gardant** le message `error` actuel.
- **Réponse :**
  - `entry` réduit à `{ id, redeemed_coupon_value }` (plus d'adresse IP ni de ligne complète) ;
  - `prize`, `coupon` et `game_outcome` inchangés.
- `wilaya`, `source` et `client_request_id` arrivent déjà dans `metadata` et sont gardés tels quels.
- **Script de vérification** `scripts/backend/select-prize-smoke.mjs` + script npm `backend:smoke`. Il crée ses campagnes de test, les supprime à la fin, et ne tourne qu'en local. Il vérifie :
  - consentement absent → refusé ;
  - téléphone invalide → refusé ;
  - participation valide → consentement stocké ;
  - même tentative rejouée → même participation ;
  - même téléphone, nouvelle tentative → « déjà participé » ;
  - campagne en pause → fermée ;
  - Hit It raté 20 fois → 0 gagnant ;
  - 10 gagnants en parallèle → 10 codes différents ;
  - stock épuisé → fermée.

**Fichiers :** `supabase/functions/select-prize/index.ts`, `scripts/backend/select-prize-smoke.mjs`, `package.json`
**Dépend de :** B1.3
**Durée :** 1 j

**Critères d'acceptation :** `npm run backend:smoke` entièrement vert contre `npx supabase functions serve`.

**Vérification :** `npx supabase functions serve select-prize` + `npm run backend:smoke`, `npm run verify`
**Commit :** `fix(Supabase): enforce consent, idempotent retries and atomic coupons in select-prize`

> ⚠️ **Déploiement :** l'ancienne page n'envoie pas le consentement. Cette version de la fonction ne doit donc être mise en ligne **qu'après** la nouvelle page (ordre dans B6.3).

---

## Phase B3 — Adaptateurs Supabase

> Tous les adaptateurs vont dans `XP/services/supabase/`. Ils reçoivent le client Supabase en paramètre et se testent avec un faux client, sans réseau ([`rules.md`](./rules.md) §7.4).

### B3.1 — Dépôt du design sur Supabase

**Objectif :** le port `ExperienceRepository` qui lit et écrit le design dans la table `campaign_experiences`.

**Description :**

- `createSupabaseExperienceRepository({ client })` :
  - **`load`** :
    - campagne `null` (mode autonome) → `null` ;
    - sinon, lire `config` dans `campaign_experiences` pour ce `campaign_id` ; pas de ligne → `null` ;
    - sinon, `parseExperienceConfig` : migre, valide et répare, avec la même vérification du `campaignId` que le dépôt local.
  - **`save`** : appelle `save_experience_config`. Correspondance des réponses :
    - `CONFLICT` → `CONFLICT` ;
    - `TOO_LARGE` → `STORAGE_FULL` ;
    - `NOT_FOUND`, erreur ou réseau → `STORAGE_UNAVAILABLE`.

    Messages en anglais : plan, B3.1.

  - **`remove`** : supprime la ligne de la campagne dans `campaign_experiences`.
- **Une panne réseau au chargement lève une erreur** au lieu de renvoyer `null`. Sinon, le Studio partirait des valeurs par défaut et les enregistrerait par-dessus le vrai design. B4.1 traite cette erreur.
- La petite partie commune avec le dépôt local (réparation du `campaignId`) est extraite dans une fonction partagée, **sans changer** le comportement du dépôt local.
- Le port **ne change pas**.

**Fichiers :** `XP/services/supabase/supabaseExperienceRepository.ts` + test, extraction commune dans `XP/services/` (si utile)
**Dépend de :** B1.2
**Durée :** 0,5 j

**Critères d'acceptation :** tests de chargement (vide, réparé, `campaignId` corrigé, panne réseau), d'enregistrement (OK, conflit, trop gros, erreur) et de suppression ; `localExperienceRepository.test.ts` passe sans modification.

**Vérification :** `npx vitest run src/features/player-experience/services`, `npm run verify`
**Commit :** `feat(Player-Experience): add the Supabase experience repository`

---

### B3.2 — Passerelle de participation réelle

**Objectif :** la passerelle `live`, seule autorité sur le résultat en production. Elle parle à `select-prize` et `confirm-coupon`.

**Description :**

- **`selectPrizeMapping.ts`** (fonctions pures, testées cas par cas) :
  - `toSelectPrizeBody(request)` : de la demande de participation vers le corps de `select-prize`. Tableau de correspondance : plan, B3.2. Le consentement, la wilaya, la source et l'identifiant de tentative vont dans `metadata`.
  - `toDrawResult(response)` : de la réponse vers le résultat, **par le `code` d'abord**, puis **par les anciens messages** en repli, pour rester compatible avec la fonction actuelle tant que B2.1 n'est pas en ligne :
    - `ALREADY_PARTICIPATED` → `ALREADY_PARTICIPATED` ;
    - `CAMPAIGN_CLOSED`, campagne introuvable ou inactive → `CAMPAIGN_CLOSED` ;
    - `INVALID_INPUT` / `CONSENT_REQUIRED` → `INVALID_INPUT` ;
    - réseau, délai dépassé, `5xx` → `NETWORK` ;
    - le reste → `UNKNOWN`.
- **`createSupabaseParticipationGateway({ client, availability, timeoutMs = 15000 })`** :
  - `mode: "live"` ;
  - `draw` : appelle `select-prize` avec un délai maximal ; lit le corps des réponses d'erreur, comme le fait `extractInvokeErrorMessage` dans l'ancienne page ;
  - `confirmCoupon` : appelle `confirm-coupon` ;
  - `checkAvailability` : renvoie la disponibilité reçue au chargement, sans nouvel appel.
- **Aucun repli** qui écrit dans la base ou appelle une fonction de tirage : jamais.

**Fichiers :** `XP/services/supabase/selectPrizeMapping.ts` + test, `XP/services/supabase/supabaseParticipationGateway.ts` + test
**Dépend de :** B2.1
**Durée :** 0,75 j

**Critères d'acceptation :**

- un test par ligne de correspondance, y compris chaque ancien message serveur ;
- délai dépassé → `NETWORK` ;
- `confirmCoupon` OK et KO ;
- `mode === "live"`.

**Vérification :** `npx vitest run src/features/player-experience/services/supabase`, `npm run verify`
**Commit :** `feat(Player-Experience): add the live participation gateway on select-prize`

---

### B3.3 — Images dans Supabase Storage

**Objectif :** envoyer les images du Studio dans le stockage de fichiers au lieu de les coller dans le design, pour que les joueurs chargent une page légère.

**Description :**

- Extraire la compression d'image (`fitWithin`, codec du navigateur, choix WebP / JPEG / PNG) de `dataUrlAssetStorage.ts` vers `XP/services/imageCompression.ts`. Le **comportement** de `dataUrlAssetStorage` ne change pas.
- `XP/services/storageUrl.ts` : `publicStorageUrl(supabaseUrl, bucket, path)`, une fonction pure, utilisable par l'aperçu (B4.2).
- `createSupabaseAssetStorage({ client, supabaseUrl, organizationId, campaignId })` :
  - **`upload`** : même compression qu'aujourd'hui, puis envoi dans `campaign-media/<organizationId>/experience/<campaignId>/<purpose>-<uuid>.<ext>`. Le 1ᵉʳ dossier doit être l'id de l'organisation, sinon la règle d'accès du bucket refuse. Échec → `UNREADABLE`, avec un message clair.
  - **`resolveUrl`** : une référence `storage` donne l'URL publique ; `dataUrl` et `remote` sont renvoyées telles quelles.
- Aucune suppression des images qui ne servent plus (après le MVP).

**Fichiers :** `XP/services/imageCompression.ts`, `XP/services/storageUrl.ts`, `XP/services/local/dataUrlAssetStorage.ts` (extraction seulement), `XP/services/supabase/supabaseAssetStorage.ts` + test
**Dépend de :** B0.1
**Durée :** 0,5 j

**Critères d'acceptation :**

- chemin et type corrects ;
- les 3 types de référence sont résolus ;
- échec d'envoi et fichier non image gérés ;
- `dataUrlAssetStorage.test.ts` passe **sans modification**.

**Vérification :** `npx vitest run src/features/player-experience/services`, `npm run verify`
**Commit :** `feat(Player-Experience): upload experience images to Supabase Storage`

---

### B3.4 — Statistiques et assemblage des services

**Objectif :** compter les visites de la nouvelle page, et fournir deux assemblages prêts à l'emploi : un pour le Studio, un pour la page publique.

**Description :**

- **`createSupabaseAnalyticsTracker({ client })`** :
  - `experience_viewed` → `record_campaign_impression` (visite) ;
  - `form_submitted` → même fonction, avec « formulaire rempli » et le temps passé ;
  - les autres événements sont ignorés (en développement : console) ;
  - jamais bloquant, jamais de donnée personnelle.
- **`createStudioServices({ client, supabaseUrl, organizationId, campaignId, rules })`** : sauvegarde et images Supabase ; participation **démo** ; statistiques en console ; vérification humaine vide.
- **`createPublicServices({ client, supabaseUrl, availability })`** : participation **live** ; statistiques Supabase ; images en lecture seule ; sauvegarde refusée (la page publique n'enregistre rien) ; vérification humaine vide.
- `createLocalServices` accepte une option `resolveStorage`, utilisée par l'aperçu (B4.2).
- **Exporter** depuis `XP/index.ts` : `createStudioServices`, `createPublicServices`, `publicStorageUrl`.
- Mettre à jour `XP/services/supabase/README.md` : « à écrire » devient « écrit ».

**Fichiers :** `XP/services/supabase/supabaseAnalyticsTracker.ts` + test, `XP/services/createSupabaseServices.ts` + test, `XP/services/createLocalServices.ts`, `XP/index.ts`, `XP/services/supabase/README.md`
**Dépend de :** B3.1, B3.2, B3.3
**Durée :** 0,25 j

**Critères d'acceptation :** passerelle publique en mode `live` ; passerelle du Studio en mode `demo` ; `createLocalServices` inchangé sans la nouvelle option.

**Vérification :** `npm run verify`
**Commit :** `feat(Player-Experience): compose the Studio and public services on Supabase`

---

## Phase B4 — Studio sur Supabase

### B4.1 — Le Studio et le sandbox enregistrent sur Supabase

**Objectif :** pour une vraie campagne, le Studio lit et écrit le design sur le serveur, et le sandbox montre ce même design. Le mode autonome ne change pas.

**Description :**

- `CampaignStudio` et `CampaignSimulator` reçoivent une prop facultative `backend = { client, supabaseUrl, organizationId }` :
  - avec `backend` et une vraie campagne → `createStudioServices(...)` ;
  - sinon → `createLocalServices()`, comme aujourd'hui. Les tests existants ne changent pas.
- `App.tsx` passe `backend`, avec l'`organizationId` de `useAuth()`.
- **Chargement en échec** (panne réseau) :
  - le Studio affiche « Could not load the saved design. » avec « Retry » ;
  - **la sauvegarde automatique reste coupée** tant que le chargement n'a pas réussi (`useAutosave` reçoit `enabled`) ;
  - changements limités à `loadIntoStudio`, `PlayerExperienceStudio` et un bandeau dans `StudioShell`.
- Rien ne change dans les panneaux, l'aperçu ni la validation.

**Fichiers :** `XP/studio/CampaignStudio.tsx`, `XP/studio/CampaignSimulator.tsx`, `XP/studio/PlayerExperienceStudio.tsx`, `XP/studio/loadIntoStudio.ts`, `XP/studio/useAutosave.ts`, `XP/studio/layout/StudioShell.tsx`, `src/App.tsx`, tests
**Dépend de :** B3.4
**Durée :** 0,5 j

**Critères d'acceptation (en local) :**

- modifier un titre, recharger → gardé ;
- même campagne dans un 2ᵉ navigateur → même design ;
- modification des deux côtés → `CONFLICT` dans le second ;
- Wizard ouvert depuis le Studio puis enregistré → design intact ;
- mode autonome → toujours en `localStorage` ;
- sandbox → tirage démo, aucune ligne dans `entries`.

**Vérification :** `npm run verify`, contrôle manuel ci-dessus
**Commit :** `feat(Player-Experience): save the Studio design to Supabase`

---

### B4.2 — Images Storage dans l'aperçu

**Objectif :** que les images envoyées dans le stockage s'affichent dans l'aperçu du Studio et dans le sandbox (iframe `/xp-frame`).

**Description :**

- `XP/runtime/host/FrameExperience.tsx` passe `resolveStorage` (construit avec `publicStorageUrl` et `VITE_SUPABASE_URL`) à `createLocalServices`.
- `runtime/` n'importe pas `services/supabase/` : `publicStorageUrl` vit dans `XP/services/storageUrl.ts` (B3.3).

**Fichiers :** `XP/runtime/host/FrameExperience.tsx`
**Dépend de :** B4.1
**Durée :** 0,25 j

**Critères d'acceptation :** logo et fond envoyés depuis le Studio → visibles dans l'aperçu et le sandbox ; fichier présent dans le bucket sous `<orgId>/experience/<campaignId>/`.

**Vérification :** `npm run verify`, contrôle manuel
**Commit :** `feat(Player-Experience): resolve Storage images in the preview frame`

---

### B4.3 — Import des anciens designs du navigateur

**Objectif :** ne pas perdre les designs déjà faits dans le Studio, qui n'existent aujourd'hui que dans ton navigateur.

**Description :**

- `createImportingExperienceRepository({ remote, local })`, utilisé par `createStudioServices` :
  - au chargement, si le serveur n'a rien **et** que le navigateur a un design pour cette campagne → l'envoyer une fois sur le serveur, puis le renvoyer ;
  - un marqueur `xp:experience:imported:<campaignId>` évite de réimporter un design supprimé volontairement ;
  - la copie locale **n'est pas effacée** (filet de sécurité).
- Les images de ces anciens designs restent en `dataUrl` (elles s'affichent) : pas de conversion (§0.4).

**Fichiers :** `XP/services/supabase/importingExperienceRepository.ts` + test, `XP/services/createSupabaseServices.ts`
**Dépend de :** B4.1
**Durée :** 0,25 j

**Critères d'acceptation :** une campagne éditée avant le branchement retrouve son design au 1ᵉʳ chargement ; au 2ᵉ chargement, rien n'est réimporté ; serveur non vide → aucun import.

**Vérification :** `npx vitest run src/features/player-experience/services/supabase`, `npm run verify`
**Commit :** `feat(Player-Experience): import designs saved in this browser into Supabase`

---

## Phase B5 — Page joueur

### B5.1 — Campagne fermée dès l'ouverture

**Objectif :** aujourd'hui, le nouveau runtime n'affiche « campagne terminée » qu'**après** un tirage refusé : le joueur remplirait le formulaire pour rien. Le port prévoit déjà `checkAvailability` ; on s'en sert au démarrage.

**Description :**

- `XP/domain/flow.ts` : nouvel événement `UNAVAILABLE`. Depuis `welcome` ou `register`, il mène à l'écran `closed` existant, avec le message traduit existant.
- `XP/runtime/useExperienceFlow.ts` : au montage (sans écran forcé), `services.participation.checkAvailability(campaign.id)` ; `open: false` → `UNAVAILABLE`. Une erreur est ignorée : le serveur tranchera au tirage.
- Profite aussi au Studio : la passerelle démo implémente déjà `checkAvailability`.
- **Aucun changement visuel** : on réutilise l'écran `closed` tel quel.

**Fichiers :** `XP/domain/flow.ts` + test, `XP/runtime/useExperienceFlow.ts` + test
**Dépend de :** B0.1
**Durée :** 0,25 j

**Critères d'acceptation :** `welcome` + `UNAVAILABLE` → `closed` ; sur une campagne en pause, l'écran « terminé » s'affiche dès l'ouverture, en démo comme en réel.

**Vérification :** `npx vitest run src/features/player-experience/domain/flow src/features/player-experience/runtime/useExperienceFlow`, `npm run verify`
**Commit :** `feat(Player-Experience): show a closed campaign before the player registers`

---

### B5.2 — Nouvelle page `/play/:slug`

**Objectif :** les joueurs voient enfin le design du Studio, avec le vrai tirage serveur.

**Description :**

- **`XP/domain/publicCampaign.ts`** (pur, `zod`) : `parsePublicExperience(raw)` transforme la réponse de `get_public_experience` en campagne pour le runtime (`CampaignSnapshot`), disponibilité et design :
  - design absent → `createDefaultExperience` ;
  - design abîmé → réparé par `parseExperienceConfig` ;
  - forme invalide → erreur.
  - Déplacer le type `Availability` dans `XP/domain/participation.ts` (réexporté par `ports.ts`), pour que `domain/` n'importe pas `services/`.
- **`XP/domain/locale.ts`** : `pickInitialLocale(locales, navigator.languages)`. Première langue du téléphone activée par la marque (`ar-DZ` → `ar`), sinon la langue par défaut.
- **`XP/services/supabase/loadPublicExperience.ts`** : appelle `get_public_experience`, puis `parsePublicExperience`.
- **`src/pages/play/PublicPlayPage.tsx`** : n'importe que depuis `XP/index.ts`. Elle affiche :
  - **pendant le chargement :** un fond sombre et un petit indicateur ;
  - **slug inconnu :** un écran « introuvable » en fr / ar / en (`dir="auto"`, Noto Sans Arabic) ;
  - **erreur :** « Something went wrong » avec « Retry » ;
  - **sinon :** `<ServicesProvider services={createPublicServices(...)}><PlayerExperience … allowedGatewayModes={["live"]} /></ServicesProvider>`, directement dans la page. Le titre de l'onglet est le nom de la campagne.
- **`src/AppRouter.tsx`** : `/play/:slug` → `PublicPlayPage`, chargée en différé. L'ancien `PlayerFlowPage` n'est plus routé, mais reste dans le code jusqu'à B6.2.

**Fichiers :** `XP/domain/publicCampaign.ts` + test, `XP/domain/locale.ts` + test, `XP/domain/participation.ts`, `XP/services/ports.ts`, `XP/services/supabase/loadPublicExperience.ts` + test, `XP/index.ts`, `src/pages/play/PublicPlayPage.tsx` + test, `src/AppRouter.tsx`
**Dépend de :** B3.4, B4.2, B5.1
**Durée :** 0,75 j

**Critères d'acceptation (en local, pour chacun des 5 jeux) :**

- le design du Studio s'affiche ;
- la participation passe par `select-prize` (visible dans l'onglet réseau) ;
- en cas de gain, le coupon s'affiche et « J'ai copié » appelle `confirm-coupon` ;
- même numéro une 2ᵉ fois → « déjà participé » ;
- campagne en pause → « terminé » dès l'ouverture ;
- slug inconnu → « introuvable » ;
- aucune bonne réponse dans l'onglet réseau ;
- pas de badge « Demo ».

**Vérification :** `npm run verify`, `npm run build` + `npx vite preview --port 4173` + `npm run xp:responsive -- http://localhost:4173/play/<slug> --quick`
**Commit :** `feat(Player-Experience): serve /play/:slug with the new player runtime`

---

## Phase B6 — Recette et mise en ligne

### B6.1 — Recette locale de bout en bout

**Objectif :** vérifier tout le parcours en local, avant de toucher au cloud.

**Description :**

- **👤 Avec ton accord seulement :** vérifier toute la chaîne de migrations depuis zéro. D'abord une sauvegarde de la base locale, puis `npx supabase db reset`, puis restauration des comptes de test (rules §6.4). Sans accord, la recette se fait sur la base de travail à jour.
- `npx supabase functions serve`, `npm run dev`.
- Dérouler la checklist du plan (§11 « Recette manuelle ») pour les parties faisables en local : Studio, page joueur (5 jeux, fr et ar), sécurité (`backend:probe`, `backend:smoke`), dashboard.
- Tout défaut trouvé :
  - s'il est **dans le périmètre** d'une tâche déjà faite : correction dans un commit `fix(...)` dédié, documenté ;
  - **sinon** : noté pour toi.
- Document de recette : chaque ligne OK/KO, avec la preuve (requête, onglet réseau, capture).
- **👤 À faire par toi :** la même checklist sur un vrai téléphone Android. Je te donne la marche à suivre, par exemple un accès depuis le téléphone à `http://<ip-du-pc>:3000`.

**Fichiers :** `tasks_docs/phase_B6/B6.1-recette-locale.md` (+ corrections éventuelles)
**Dépend de :** B5.2
**Durée :** 0,5 j

**Critères d'acceptation :** toutes les lignes faisables en local sont OK, ou documentées avec leur correction.

**Vérification :** `npm run verify`, `npm run backend:probe`, `npm run backend:smoke`
**Commit :** `docs(Backend): record the local end-to-end acceptance`

---

### B6.2 — Nettoyage final

**Objectif :** retirer l'ancienne page joueur (qui contenait le repli client et la lecture des bonnes réponses), fermer les lectures anonymes devenues inutiles, et remettre la documentation à jour.

**Description :**

- **Supprimer** `src/pages/play/PlayerFlowPage.tsx` et les composants utilisés seulement par elle : `PhoneFrame`, `PlayerGame`, `PlayerHitIt`, `PlayerLanding`, `PlayerMysteryBox`, `PlayerQuiz`, `PlayerResult`, `PlayerScratch`. Avant chaque suppression, vérifier par une recherche qu'aucun autre fichier ne les importe. Retirer de `src/types.ts` et `src/lib/defaultImages.ts` seulement ce qui ne sert plus nulle part.
- **Migration :** supprimer les politiques de lecture anonyme directe devenues inutiles :
  - `public_select_active_campaign_prizes` (lots) ;
  - `public_select_active_quiz_questions` (questions, avec les bonnes réponses) ;
  - `DROP POLICY IF EXISTS` des politiques ajoutées à la main dans le cloud (par exemple « Public read active campaigns »). La liste exacte vient de l'audit de B6.3 ; en attendant, on met les noms connus.
- **Étendre `anon-probe.mjs`** : la lecture anonyme de `quiz_questions.correct_option_index`, `prizes.weight` et `campaigns.win_probability` renvoie 0 ligne.
- **Documentation :**
  - `CLAUDE.md` : Player Portal, Player Experience (« `/play/:slug` will be wired later » devient vrai), Edge Functions ;
  - `XP/README.md` : stockage, passerelle démo, `/play/:slug` ;
  - `XP/services/supabase/README.md` : les « Server gaps » sont corrigés ;
  - `docs/DATABASE_AND_TESTING_GUIDE.md` : scripts `backend:probe` et `backend:smoke`.

**Fichiers :** les suppressions ci-dessus, `supabase/migrations/<ts>_remove_anonymous_table_reads.sql`, `scripts/backend/anon-probe.mjs`, docs listées
**Dépend de :** B6.1
**Durée :** 0,5 j

**Critères d'acceptation :**

- `npm run verify` vert ;
- aucune référence restante à `PlayerFlowPage` ni aux composants supprimés ;
- `backend:probe` entièrement vert ;
- `/play/:slug` marche toujours.

**Vérification :** `npx supabase migration up` + 2ᵉ passage de la migration, `npm run backend:probe`, `npm run verify`
**Commit :** `chore(Player-Experience): remove the legacy player page and anonymous table reads`

---

### B6.3 — Guide de mise en ligne 👤

**Objectif :** mettre en ligne dans le bon ordre, sans casser la production. **Je rédige le guide ; c'est toi qui lances chaque commande cloud** ([`rules.md`](./rules.md) §6.5).

**Description :** rédiger `ai-assistance-prompts-reports/backend/deploiement.md`, avec pour chaque étape la commande exacte, ce qu'il faut vérifier, et comment revenir en arrière :

1. **Sauvegarde** de la base cloud.
2. **Audit de la base cloud** : requêtes en lecture seule (plan, B0.1 étape 3). Tu m'en colles le résultat ; je vérifie les différences avec les migrations, et j'ajuste la migration de B6.2 si des politiques manuelles portent d'autres noms (commit `fix(Supabase): …`).
3. **Migrations B1.1, B1.2, B1.3** (`npx supabase link`, puis `npx supabase db push`). L'ancienne page reste en ligne et marche encore.
4. **Vérification du dashboard** en ligne.
5. **Front** : `npm run build`, puis `firebase deploy --only hosting:demo`. La nouvelle page comprend l'ancienne **et** la nouvelle version de `select-prize`.
6. **`select-prize`** : `npx supabase functions deploy select-prize`. Seulement après l'étape 5 : le consentement devient obligatoire.
7. **Recette sur `demo`**, dont un vrai téléphone.
8. **Migration B6.2** (lectures anonymes), puis `firebase deploy --only hosting:stable`.

Plus : un tableau de retour arrière pour chaque étape (plan §10.3), et le push de la branche (`git push -u origin feat/player-experience-backend`).

**Fichiers :** `ai-assistance-prompts-reports/backend/deploiement.md`
**Dépend de :** B6.2
**Durée :** 0,25 j (+ ton temps de déploiement et de recette)

**Critères d'acceptation :** chaque étape a sa commande, sa vérification et son retour arrière ; l'ordre respecte la compatibilité (plan §10.2).

**Vérification :** relecture ; `npx prettier --check` sur le document
**Commit :** `docs(Backend): add the deployment runbook`

---

## Récapitulatif

| Tâche     | Titre                                     | Durée        | Commit                                                                                  |
| --------- | ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| B0.1      | Branche, pile locale, documents           | 0,25 j       | `chore(Backend): prepare the local Supabase stack and the wiring plan`                  |
| B1.1      | Fermer les accès anonymes                 | 0,75 j       | `fix(Supabase): close anonymous access to entries and internal functions`               |
| B1.2      | Table du design et lecture publique       | 0,75 j       | `feat(Supabase): store the player experience design and expose a safe public read`      |
| B1.3      | Pas de tirage après un jeu d'adresse raté | 0,25 j       | `fix(Supabase): never draw a prize after a failed skill game`                           |
| B2.1      | Durcir `select-prize`                     | 1 j          | `fix(Supabase): enforce consent, idempotent retries and atomic coupons in select-prize` |
| B3.1      | Dépôt du design sur Supabase              | 0,5 j        | `feat(Player-Experience): add the Supabase experience repository`                       |
| B3.2      | Passerelle de participation réelle        | 0,75 j       | `feat(Player-Experience): add the live participation gateway on select-prize`           |
| B3.3      | Images dans Supabase Storage              | 0,5 j        | `feat(Player-Experience): upload experience images to Supabase Storage`                 |
| B3.4      | Statistiques et assemblage des services   | 0,25 j       | `feat(Player-Experience): compose the Studio and public services on Supabase`           |
| B4.1      | Studio et sandbox sur Supabase            | 0,5 j        | `feat(Player-Experience): save the Studio design to Supabase`                           |
| B4.2      | Images Storage dans l'aperçu              | 0,25 j       | `feat(Player-Experience): resolve Storage images in the preview frame`                  |
| B4.3      | Import des anciens designs                | 0,25 j       | `feat(Player-Experience): import designs saved in this browser into Supabase`           |
| B5.1      | Campagne fermée dès l'ouverture           | 0,25 j       | `feat(Player-Experience): show a closed campaign before the player registers`           |
| B5.2      | Nouvelle page `/play/:slug`               | 0,75 j       | `feat(Player-Experience): serve /play/:slug with the new player runtime`                |
| B6.1      | Recette locale                            | 0,5 j        | `docs(Backend): record the local end-to-end acceptance`                                 |
| B6.2      | Nettoyage final                           | 0,5 j        | `chore(Player-Experience): remove the legacy player page and anonymous table reads`     |
| B6.3      | Guide de mise en ligne 👤                 | 0,25 j       | `docs(Backend): add the deployment runbook`                                             |
| **Total** | **17 tâches**                             | **≈ 8,25 j** |                                                                                         |

**Ordre :** celui du tableau. Deux tâches peuvent être avancées sans attendre : B3.3 (dépend seulement de B0.1) et B5.1 (idem).

**Lots conseillés** si tu veux me les confier d'un bloc : B0.1 · B1.1–B1.3 · B2.1 · B3.1–B3.4 · B4.1–B4.3 · B5.1–B5.2 · B6.1–B6.3.
