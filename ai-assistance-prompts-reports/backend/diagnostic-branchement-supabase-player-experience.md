# Diagnostic — Brancher le Player Experience (Studio + runtime joueur) sur Supabase

> Date : 2026-09-27 · Branche analysée : `Refactor/PlayerEditor` (commit `19c1a1d`)
> Objectif : une version MVP qui marche bien avec le backend, avec le **minimum** de logique serveur.

---

## 0. Réponse courte

**Oui, ton intuition est juste : le Player Experience est aujourd'hui 100 % côté client.**

- Le design fait dans le Studio est enregistré dans le `localStorage` du navigateur de la personne qui l'édite. Aucun autre navigateur ne le voit, ni un joueur, ni un collègue.
- Les images sont stockées dans ce même `localStorage` (data URLs).
- Les tirages du Studio et du sandbox sont simulés dans le navigateur (passerelle `demo`, codes `DEMO-…`).
- La vraie page joueur `/play/:slug` **n'utilise pas du tout** le nouveau runtime : elle affiche encore l'ancien `PlayerFlowPage.tsx`, avec ses anciens composants `Player*.tsx`. Ce que la marque personnalise dans le Studio n'arrive donc jamais chez les joueurs.

**Est-ce un gros travail ? Non.** L'architecture a été pensée pour ce branchement (ports et adaptateurs). Le runtime et le Studio n'ont presque rien à changer : il faut écrire 3 adaptateurs Supabase, une nouvelle page `/play/:slug`, une migration SQL et quelques corrections dans `select-prize`.

| Version                                                      | Contenu                                                                                                                                        | Durée estimée (1 dev + Claude Code) |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Minimum strict** (« le jeu marche avec le backend »)       | Config en base, page `/play/:slug` sur le nouveau runtime, passerelle `live` vers `select-prize`                                               | **≈ 4 jours**                       |
| **MVP recommandé** (« marche bien et ne se fait pas vider ») | Minimum + images dans Storage + corrections serveur (consentement, Hit It, idempotence, coupons) + fermeture des failles de sécurité critiques | **≈ 7 jours**                       |

Pour comparer : le refactor du Player Experience (phases 0 à 7) représentait environ 20 jours. Le branchement backend en représente un tiers.

> **Mise à jour du 2026-09-29 :** ce sont les premières estimations. Le découpage final, avec la table séparée `campaign_experiences` (au lieu d'une colonne) et la recette, est dans [`tasks.md`](./tasks.md) : **17 tâches, ≈ 8,25 jours**.

> ⚠️ **Point bloquant indépendant du Studio** : l'analyse a trouvé des failles graves dans la base (voir §4). Aujourd'hui, un visiteur anonyme peut lire tous les numéros de téléphone des participants, s'inscrire gagnant directement dans `entries`, appeler le tirage sans passer par `select-prize`, et même modifier une campagne. Tant que ces failles restent ouvertes, la règle N1 (« le tirage est côté serveur uniquement ») n'est pas vraiment respectée. **Je recommande fortement de les corriger avant d'ouvrir le lien public**, que le Studio soit branché ou non.

---

## 1. État des lieux détaillé

### 1.1 Carte de ce qui est local et de ce qui est serveur

```
                        AUJOURD'HUI
┌──────────────────────── Dashboard (auth) ──────────────────────────┐
│ useCampaigns ──(lecture Supabase)──► CampaignStudio                │
│                                        │                           │
│                          createLocalServices()                     │
│      ┌──────────────┬──────────────┬───────────────┬────────────┐  │
│      ▼              ▼              ▼               ▼            ▼  │
│ localStorage   data URLs       tirage DÉMO     console.log   noop  │
│ (config)       (images)        (navigateur)    (analytics)  (captcha)
└────────────────────────────────────────────────────────────────────┘

┌──────────────────── /play/:slug (public) ──────────────────────────┐
│ PlayerFlowPage.tsx (ANCIEN code, ignore le Studio)                 │
│   ├─ lit campaigns + prizes + quiz_questions (avec bonnes réponses) │
│   ├─ appelle select-prize                                           │
│   └─ si échec : REPLI qui tire et écrit dans entries DEPUIS LE CLIENT │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Les 5 ports, adaptateur par adaptateur

| Port (`services/ports.ts`) | Adaptateur actuel                           | Où vont les données                                         | Adaptateur Supabase                    |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| `ExperienceRepository`     | `localExperienceRepository.ts`              | `localStorage`, clé `xp:experience:v1:<campaignId>`         | **à écrire**                           |
| `ParticipationGateway`     | `demoParticipationGateway.ts` / `scripted…` | tirage dans le navigateur, entrées démo dans `localStorage` | **à écrire** (`live` → `select-prize`) |
| `AssetStorage`             | `dataUrlAssetStorage.ts`                    | image compressée en data URL **dans la config**             | **à écrire** (recommandé)              |
| `AnalyticsTracker`         | `consoleAnalyticsTracker.ts`                | `console`                                                   | minimal (optionnel)                    |
| `HumanVerification`        | `noopHumanVerification.ts`                  | toujours `null`                                             | **hors MVP**                           |

Ce qui est déjà prêt et ne changera pas :

- `runtime/` (écrans, jeux, machine d'états `domain/flow.ts`) : il ne connaît que les ports. `PlayerExperience` accepte déjà `allowedGatewayModes={["live"]}` et affiche une erreur si une passerelle démo est branchée par erreur.
- Le contrat `DrawRequest` / `DrawResult` (`domain/participation.ts`) a été calqué sur `select-prize`. La correspondance champ par champ est déjà écrite dans `services/supabase/README.md`.
- `useExperienceFlow` construit déjà la requête avec consentement, `clientRequestId`, `sessionId`, `dwellTime` et `userAgent`.
- `PlayerExperienceStudio` et `CampaignSimulator` acceptent déjà une prop `services` : on peut injecter des adaptateurs Supabase sans toucher leur code.
- La colonne `campaigns.player_screen_config` (JSONB) existe, et le type `PlayerScreenConfig.experience?: ExperienceConfig` est déjà déclaré dans `src/types.ts:158`.
- Le bucket Storage `campaign-media` existe : public en lecture, écriture limitée au dossier de l'organisation (`20260702214554_prompt8_storage_image_uploader.sql`).

### 1.3 Ce qui marche déjà côté serveur (et qu'on garde)

- `select-prize` : normalise le téléphone, vérifie la campagne active, bloque les doublons (`max_entries` + index unique `entries_campaign_phone_unique`), vérifie le stock, puis appelle `resolve_game_outcome`, qui corrige le quiz, compte les coups Hit It et fait le tirage atomique (`FOR UPDATE SKIP LOCKED`). Il réserve ensuite un coupon et crée l'entrée.
- `confirm-coupon` : passe `coupon_confirmed` à `true` avec la clé service_role, et seulement pour une entrée gagnante.
- `record_campaign_impression` : impressions et temps passé.

**On n'a pas besoin de nouvelle Edge Function.** Tout le jeu passe déjà par `select-prize`.

---

## 2. Problèmes trouvés (diagnostic)

Classés par gravité. Les références pointent vers le code actuel.

### 2.1 Critiques : sécurité et règles non négociables

| #   | Problème                                                                                                                                                                                  | Où                                                                                                                                                                            | Conséquence                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Tous les participants sont lisibles par un anonyme** : politique `select_entries_failsafe … TO anon USING (true)`                                                                       | `20260811020000_fix_analytics_histogram_and_participants_rpc.sql:16`                                                                                                          | Quiconque a la clé anon (elle est dans le bundle JS) lit les téléphones, les noms et les codes coupons de toutes les campagnes. **Contraire à la loi 18-07.**                                                                                                                                                                                                                             |
| S2  | **Un anonyme peut insérer une entrée gagnante** : politique `public_insert_entries … WITH CHECK (true)`                                                                                   | `20260630150507_…rls_policies.sql:191`                                                                                                                                        | Contourne `select-prize` (N1) et la protection anti-doublon (N4).                                                                                                                                                                                                                                                                                                                         |
| S3  | **Un anonyme peut modifier n'importe quelle entrée** : politique `anon_confirm_coupon … USING (true)`, qui ne vérifie que `coupon_confirmed = true` après modification                    | `20260704111917_fix_redeem_and_duplicate_check.sql:12`                                                                                                                        | On peut changer `is_winner`, `prize_id`… de n'importe quelle ligne. Inutile : `confirm-coupon` passe déjà par service_role.                                                                                                                                                                                                                                                               |
| S4  | **Toutes les fonctions `SECURITY DEFINER` sont exécutables par anon** (`GRANT EXECUTE ON ALL ROUTINES … TO anon` + privilèges par défaut, plus des grants explicites)                     | `20260706091000_…:27,41` ; `resolve_game_outcome`, `draw_and_claim_campaign_prize`, `claim_campaign_prize_coupon`, `save_campaign_full_in_place`, `get_campaign_participants` | Un anonyme peut : tirer et vider le stock sans entrée (`draw_and_claim_campaign_prize`) ; récolter tous les codes coupons (`claim_campaign_prize_coupon`) ; **réécrire n'importe quelle campagne**, y compris `win_probability` (`save_campaign_full_in_place` ne vérifie aucune appartenance à l'organisation) ; lister tous les participants (`get_campaign_participants(NULL, NULL)`). |
| S5  | **Repli client dans `/play/:slug`** : si `select-prize` échoue, le navigateur appelle `resolve_game_outcome`, lit les coupons, invente un code `DZ-xxxx-PROMO` et écrit l'entrée lui-même | `src/pages/play/PlayerFlowPage.tsx:451-580`                                                                                                                                   | Violation directe de N1. Ce repli dépend justement de S2 et S4.                                                                                                                                                                                                                                                                                                                           |
| S6  | **Bonnes réponses du quiz publiques** : la page publique demande `correct_option_index`                                                                                                   | `PlayerFlowPage.tsx:178`                                                                                                                                                      | Visible dans l'onglet réseau.                                                                                                                                                                                                                                                                                                                                                             |
| S7  | **Consentement non vérifié par le serveur** : `select-prize` accepte une participation sans consentement                                                                                  | `supabase/functions/select-prize/index.ts`                                                                                                                                    | N3 / loi 18-07 : le serveur doit refuser et conserver la preuve du consentement.                                                                                                                                                                                                                                                                                                          |

### 2.2 Bugs fonctionnels côté serveur

| #   | Problème                                                                                                                                                                                           | Où                                      | Correction minimale                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Seuil Hit It ignoré** : `draw_and_claim_campaign_prize` ne tient compte d'un échec que si `require_quiz = true`, ce qui n'est vrai que pour le quiz. Un joueur Hit It sous le seuil peut gagner. | `20260831145100_…sql:506`               | Dans `resolve_game_outcome` : si le jeu est `quiz` ou `hit_it` et que `v_passed = false`, renvoyer « perdu » **sans tirer**.                            |
| F2  | **Réservation du coupon non atomique** : `select-prize` lit les coupons utilisés, prend le premier libre, puis écrit, sans verrou. Deux gagnants simultanés peuvent recevoir le même code.         | `select-prize/index.ts:325-370`         | Appeler la RPC existante `claim_campaign_prize_coupon` (verrou `SKIP LOCKED`) **après** l'insertion de l'entrée.                                        |
| F3  | **Stock perdu en cas de course** : le tirage décrémente le stock avant l'insertion de l'entrée. Si l'insertion échoue (`23505`, deux onglets), le lot est consommé sans gagnant.                   | `select-prize/index.ts:266` puis `:416` | MVP : acceptable (rare). Sinon, insérer l'entrée d'abord, puis tirer et mettre à jour. À noter seulement.                                               |
| F4  | **Pas d'idempotence** : si le réseau coupe **après** le succès et que le joueur réessaie, il reçoit `ALREADY_PARTICIPATED` au lieu de son lot. Il perd son coupon à l'écran.                       | `select-prize`                          | Le client envoie déjà `clientRequestId`. Le stocker dans `metadata.client_request_id` ; si une entrée avec ce même id existe, renvoyer la même réponse. |
| F5  | L'erreur `23505` (doublon concurrent) est renvoyée **sans `code`**. Les dates `start_date` / `end_date` ne sont pas vérifiées par `select-prize` (seulement le `status`).                          | `select-prize/index.ts:416`             | Ajouter `code: "ALREADY_PARTICIPATED"` et vérifier la période.                                                                                          |

### 2.3 Risques d'intégration propres au Studio

| #   | Problème                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Où                                                     | Décision proposée                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | **Le Wizard écraserait la config du Studio.** À chaque enregistrement, le Wizard renvoie `baseCampaign?.playerScreenConfig` à `save_campaign_full_in_place`, qui fait `player_screen_config = p_player_screen_config` (remplacement complet). Si la config du Studio est rangée dans `player_screen_config.experience` (le plan initial), ce scénario la perd sans prévenir : édition dans le Studio → « Edit in campaign settings » → le Wizard s'ouvre avec la copie de la campagne chargée **avant** les éditions → enregistrement. | `CampaignWizard.tsx:285, 1571` ; RPC `…145100…sql:221` | **Table dédiée `campaign_experiences`** (une ligne par campagne, validée le 2026-09-29), que le Wizard et sa RPC ne touchent jamais. Zéro risque d'écrasement, `campaigns` inchangée. (Écart assumé par rapport au plan §5.3, qui disait « aucune migration ».) |
| I2  | **Images en data URL dans la config.** Jusqu'à ~400 Ko par image (fond, logo, couverture de grattage, cible Hit It, images de lots). Une config peut dépasser 1 Mo, et chaque joueur la télécharge, souvent en 3G/4G.                                                                                                                                                                                                                                                                                                                  | `dataUrlAssetStorage.ts`                               | Passer à Supabase Storage (`AssetRef.kind = "storage"`). Le bucket et ses politiques existent déjà.                                                                                                                                                             |
| I3  | **Le cadre d'aperçu `/xp-frame` crée ses propres services locaux**, sans `resolveStorage`. Une image Storage n'apparaîtrait pas dans l'aperçu.                                                                                                                                                                                                                                                                                                                                                                                         | `runtime/host/FrameExperience.tsx:62`                  | Passer un `resolveStorage` (URL publique construite depuis `VITE_SUPABASE_URL`) à `createLocalServices`. Quelques lignes.                                                                                                                                       |
| I4  | **Configs existantes dans le `localStorage`.** Le travail déjà fait dans le Studio n'existe que dans ton navigateur.                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                                      | Import unique : au chargement, si la base n'a rien et que le `localStorage` a une config pour cette campagne, la proposer ou l'envoyer en base.                                                                                                                 |
| I5  | **La table `campaigns` n'a pas de lecture anonyme dans les migrations.** `/play/:slug` ne marche aujourd'hui que grâce à une politique ajoutée à la main dans le cloud (voir l'en-tête de `PlayerFlowPage.tsx`).                                                                                                                                                                                                                                                                                                                       | migrations                                             | Ne pas ouvrir `campaigns` à anon : passer par une RPC publique qui renvoie **uniquement** les champs sûrs (§3.3).                                                                                                                                               |

---

## 3. Solution MVP proposée (minimum de backend)

### 3.1 Principe

- **Aucune nouvelle Edge Function.** On garde `select-prize` et `confirm-coupon`.
- **Migrations SQL** : table `campaign_experiences`, 1 RPC publique de lecture, 1 RPC d'enregistrement, correctif Hit It, fermeture des failles.
- **3 adaptateurs** dans `services/supabase/` + une composition `createSupabaseServices()`.
- **1 nouvelle page** `/play/:slug`, qui rend `PlayerExperience` en mode `live`.
- **Hors MVP** : brouillon/publication, historique des versions, captcha, table d'événements analytics, édition des lots dans le Studio.

```
                           CIBLE MVP
┌──────────────── Dashboard ────────────────┐     ┌──────── /play/:slug ────────┐
│ CampaignStudio                            │     │ PublicPlayPage (nouveau)    │
│  repository ─► RPC save_experience_config │     │  rpc get_public_experience  │
│  assets ─────► Storage campaign-media     │     │  PlayerExperience           │
│  participation ─► DEMO (inchangé)         │     │   allowedGatewayModes=live  │
└───────────────────┬───────────────────────┘     │  participation ─► select-prize
                    │                             │  confirm ──────► confirm-coupon
                    ▼                             │  analytics ────► record_campaign_impression
        table campaign_experiences ◄──────────────┘
```

Le Studio continue de tirer en **démo** pour l'aperçu. Seules sa sauvegarde et ses images passent au serveur. C'est volontaire : un aperçu ne doit jamais consommer du vrai stock.

### 3.2 Migration SQL unique (proposition)

Fichier : `supabase/migrations/2026MMDDHHMMSS_player_experience_backend.sql`

1. **Table du design** (décision du 2026-09-29 : une table à part plutôt qu'une colonne de `campaigns`)

   ```sql
   CREATE TABLE public.campaign_experiences (
     campaign_id     uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
     organization_id uuid NOT NULL REFERENCES public.organizations(id),
     config          jsonb NOT NULL,  -- the whole Studio design (ExperienceConfig)
     updated_at      timestamptz NOT NULL DEFAULT now(),
     updated_by      uuid REFERENCES auth.users(id)
   );
   -- RLS enabled; select/insert/update/delete for org members only; no anon policy.
   ```

2. **Enregistrement avec contrôle de concurrence** : RPC `save_experience_config(p_campaign_id uuid, p_config jsonb, p_expected_updated_at text)`.
   - `SECURITY INVOKER` : les politiques RLS de la nouvelle table s'appliquent.
   - Un seul `INSERT … ON CONFLICT (campaign_id) DO UPDATE … WHERE config->>'updatedAt' = p_expected_updated_at`. Le serveur fixe le nouveau `updatedAt` et `updated_by`.
   - 0 ligne écrite → renvoie `CONFLICT`. Le port `ExperienceRepository` gère déjà ce cas.
   - Grant : `authenticated` uniquement.
   - SQL complet : [plan](./plan-branchement-supabase-player-experience.md), B1.2.

3. **Lecture publique** : RPC `get_public_experience(p_slug text)`, `SECURITY DEFINER`, grant `anon, authenticated`. Elle renvoie un JSON qui contient **seulement** :
   - `campaign` : `id`, `name`, `game_type`, `status` (la période `start_date`/`end_date` est prise en compte), `rules` (`pass_threshold_percentage`, `win_threshold`, `hit_it_duration_seconds`, `quiz_seconds_per_question`, lus dans `game_logic_config`) ;
   - `prizes` actifs : `id`, `name`, `win_message` ;
   - `quiz` actif et trié : `id`, `question`, `options` (**sans** `correct_option_index`) ;
   - `availability` : `open` / `CLOSED` / `SOLD_OUT` (même calcul que `select-prize`) ;
   - `experience` : `campaign_experiences.config` (ou `null` si le Studio n'a jamais été ouvert).

   Jamais : poids, quantités, `win_probability`, coupons, bonnes réponses. Cela ferme S6 et I5 sans ouvrir `campaigns` à anon.

4. **Correctif F1** : `CREATE OR REPLACE FUNCTION resolve_game_outcome` → si `quiz` ou `hit_it` et `NOT v_passed`, renvoyer `{ok: true, is_winner: false, passed: false}` sans appeler `draw_and_claim_campaign_prize`.

5. **Sécurité S1 à S4** (le lot le plus important) :

   ```sql
   -- Entrées : seules les Edge Functions (service_role) écrivent ; seuls les membres de l'organisation lisent.
   DROP POLICY IF EXISTS "select_entries_failsafe" ON public.entries;
   DROP POLICY IF EXISTS "public_insert_entries"  ON public.entries;
   DROP POLICY IF EXISTS "anon_confirm_coupon"    ON public.entries;

   -- Fonctions internes au tirage : service_role seulement.
   REVOKE EXECUTE ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) FROM anon, authenticated, public;
   REVOKE EXECUTE ON FUNCTION public.resolve_game_outcome(uuid, jsonb)            FROM anon, authenticated, public;
   REVOKE EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid)      FROM anon, authenticated, public;

   -- Fonctions du dashboard : plus d'anon, et SECURITY INVOKER pour que les politiques RLS
   -- existantes (membre de l'organisation) s'appliquent sans réécrire les fonctions.
   ALTER FUNCTION public.save_campaign_full_in_place(/* signature à 19 paramètres */) SECURITY INVOKER;
   ALTER FUNCTION public.get_campaign_participants(uuid, uuid) SECURITY INVOKER;
   ALTER FUNCTION public.get_campaign_analytics_v2(uuid, uuid) SECURITY INVOKER;
   REVOKE EXECUTE ON FUNCTION public.save_campaign_full_in_place(/* signature à 19 paramètres */) FROM anon, public;
   REVOKE EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) FROM anon, public;
   REVOKE EXECUTE ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) FROM anon, public;

   -- Convention pour la suite : toute nouvelle fonction se termine par
   -- REVOKE ALL … FROM PUBLIC, anon, puis un GRANT explicite au seul rôle voulu.
   ```

   Le détail (migration complète, repli si `SECURITY INVOKER` casse une fonction) est dans le [plan d'exécution](./plan-branchement-supabase-player-experience.md), tâche B1.1.

   ⚠️ La politique `select_entries_failsafe` a été ajoutée parce qu'un écran du dashboard ne marchait plus. Après ces `REVOKE`, il faut **tester tout le dashboard** (Participants, Analytics, Inventaire) connecté avec un compte d'organisation : c'est la vraie charge de ce lot.

### 3.3 Corrections dans `select-prize` (déploiement manuel)

| Correction           | Détail                                                                                                                                                                                                                                                             | Taille           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Consentement (S7)    | Refuser (`400`, `code: "CONSENT_REQUIRED"`, que l'adaptateur transforme en `INVALID_INPUT`) si `metadata.consent.accepted !== true`. Le `ConsentRecord` (date, version de la politique, langue) est conservé dans `entries.metadata`. **Aucune colonne nouvelle.** | ~15 lignes       |
| Idempotence (F4)     | Avant la vérification des doublons : chercher une entrée `campaign_id + phone` avec `metadata->>client_request_id = X`. Si elle existe, renvoyer sa réponse (lot, coupon) au lieu de `ALREADY_PARTICIPATED`.                                                       | ~30 lignes       |
| Coupon atomique (F2) | Remplacer les étapes A/B/C par `rpc("claim_campaign_prize_coupon", { p_prize_id, p_entry_id })` **après** l'insertion de l'entrée.                                                                                                                                 | −50 / +10 lignes |
| Codes d'erreur (F5)  | `code` sur la réponse `23505` ; `CAMPAIGN_CLOSED` hors période ou campagne introuvable.                                                                                                                                                                            | ~10 lignes       |
| Nouveaux champs      | Lire `wilaya`, `source` et `client_request_id` depuis `metadata` (déjà prévu comme champ libre).                                                                                                                                                                   | déjà compatible  |

Captcha (`humanToken`) : hors MVP. Le champ existe déjà dans la requête et sera ignoré par le serveur.

### 3.4 Adaptateurs front (`src/features/player-experience/services/supabase/`)

| Fichier                                 | Rôle                                                                                                                                                                                                                                                                          | Points d'attention                                                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabaseExperienceRepository.ts`       | `load` : lit `campaign_experiences.config` (client authentifié), puis `parseExperienceConfig` (déjà écrit : migre, valide, répare). `save` : RPC `save_experience_config` avec `expectedUpdatedAt`. `remove` : supprime la ligne de la campagne.                              | Réutiliser la logique de réparation de `localExperienceRepository` (vérification du `campaignId`). Erreurs : `CONFLICT` ; `STORAGE_UNAVAILABLE` pour une erreur réseau (le Studio affiche déjà « Retry »).                   |
| `supabaseAssetStorage.ts`               | `upload` : même compression qu'aujourd'hui (sortir `encode`/`fitWithin` de `dataUrlAssetStorage.ts` pour les partager), puis envoi vers `campaign-media/<orgId>/experience/<campaignId>/<uuid>.webp`. Renvoie `{kind: "storage", bucket, path}`. `resolveUrl` : URL publique. | Il faut l'`organizationId` (le chemin doit commencer par l'id de l'organisation, sinon la politique Storage refuse). On peut relâcher la limite de ~400 Ko, puisque l'image ne vit plus dans la config.                      |
| `supabaseParticipationGateway.ts`       | `mode: "live"`. `draw` : `supabase.functions.invoke("select-prize")` avec la correspondance déjà écrite dans `services/supabase/README.md`. `confirmCoupon` : `confirm-coupon`. `checkAvailability` : la valeur renvoyée par `get_public_experience`.                         | Transformer **toutes** les erreurs sans `code` (statut HTTP + message), avec un test qui fige chaque message (le README le demande). Reprendre `extractInvokeErrorMessage` de `PlayerFlowPage`. Délai d'attente → `NETWORK`. |
| `supabaseAnalyticsTracker.ts` (minimal) | `experience_viewed` → `record_campaign_impression` (visiteur). Le reste : ignoré, ou `console` en développement.                                                                                                                                                              | Jamais bloquant. Pas de table d'événements dans le MVP : `select-prize` enregistre déjà l'impression « joué ».                                                                                                               |
| `createSupabaseServices.ts`             | Deux compositions : **Studio** (repository + assets Supabase, participation **démo**) et **public** (participation `live`, assets en lecture seule, `noopHumanVerification`).                                                                                                 | Le module `domain/` ne doit jamais importer Supabase (ESLint le vérifie). Les adaptateurs importent `src/lib/supabase.ts`.                                                                                                   |

### 3.5 Branchements dans l'app

1. **Studio** (`CampaignStudio.tsx`) : construire les services Supabase une fois par campagne et les passer via la prop `services` (elle existe déjà). Garder `createLocalServices()` pour le mode autonome (campagne démo).
2. **Sandbox** (`CampaignSimulator.tsx`) : lire la config avec le **même** repository Supabase. Sinon, le sandbox montrerait l'ancienne version du `localStorage`.
3. **Aperçu `/xp-frame`** (`FrameExperience.tsx:62`) : passer `resolveStorage` pour que les images Storage s'affichent.
4. **Import unique** du `localStorage` vers la base (I4).
5. **Nouvelle page `/play/:slug`** (par exemple `src/pages/play/PublicPlayPage.tsx`, ou dans le module avec un export dans `index.ts`) :
   - appelle `get_public_experience(slug)` ;
   - construit le `CampaignSnapshot` (les champs correspondent déjà à `domain/campaign.ts`) ;
   - prend la config avec `parseExperienceConfig`, ou `createDefaultExperience(...)` si la marque n'a jamais ouvert le Studio ;
   - choisit la langue (`config.locales.default`, sinon celle du navigateur si elle est activée) ;
   - rend `<ServicesProvider services={createPublicServices()}><PlayerExperience … allowedGatewayModes={["live"]} /></ServicesProvider>` **directement dans la page** (règle : jamais dans le `div` d'une autre page) ;
   - gère les états « chargement », « introuvable » et « fermée » (le runtime a déjà un écran `closed`).
6. **Suppression** : `PlayerFlowPage.tsx` et les composants `Player*.tsx` utilisés seulement par cette page. Cela supprime le repli client (S5) et les bonnes réponses publiques (S6).
7. **Bonus (petit)** : dans `SharePanel`, un bouton « Copy player link » (`/play/<slug>`). Le `slug` doit alors être ajouté au `CampaignSnapshot` côté Studio.

---

## 4. Plan de travail et estimation

Estimations en jours de développement effectifs, avec l'aide de Claude Code, en incluant les tests Vitest correspondants.

| Lot                               | Tâches                                                                                                                                                                               | Durée                  |        Minimum strict         | MVP recommandé |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | :---------------------------: | :------------: |
| **L1 — Migration + sécurité SQL** | Table `campaign_experiences`, RPC `save_experience_config`, RPC `get_public_experience`, correctif Hit It (F1). Fermeture S1–S4 + tests du dashboard.                                | 0,5 j + 1 j (sécurité) |          ✅ (0,5 j)           |   ✅ (1,5 j)   |
| **L2 — Repository Supabase**      | Adaptateur + tests, branchement Studio + sandbox, import `localStorage`                                                                                                              | 1 j                    |              ✅               |       ✅       |
| **L3 — Passerelle `live`**        | `supabaseParticipationGateway` + correspondance des erreurs + tests, `confirmCoupon`, composition publique                                                                           | 1 j                    |              ✅               |       ✅       |
| **L4 — Page `/play/:slug`**       | Nouvelle page, états de chargement et d'erreur, choix de la langue, config par défaut ; suppression de l'ancien `PlayerFlowPage`                                                     | 1 j                    |              ✅               |       ✅       |
| **L5 — `select-prize`**           | Consentement, idempotence, coupon atomique, codes d'erreur, période ; déploiement manuel                                                                                             | 1 j                    | ⚠️ consentement seul (0,25 j) |       ✅       |
| **L6 — Images Storage**           | `supabaseAssetStorage` + partage de la compression + `resolveStorage` dans l'aperçu                                                                                                  | 0,75 j                 |              ❌               |       ✅       |
| **L7 — Analytics minimal**        | `experience_viewed` → `record_campaign_impression`                                                                                                                                   | 0,25 j                 |              ❌               |       ✅       |
| **L8 — Recette de bout en bout**  | Supabase local (`db reset`), les 5 jeux en vrai : gain, perte, doublon, campagne fermée, stock épuisé, coupure réseau, mobile réel ; puis déploiement cloud (migrations + fonctions) | 0,5–1 j                |          ✅ (0,5 j)           |    ✅ (1 j)    |
| **Total**                         |                                                                                                                                                                                      |                        |         **≈ 4,25 j**          |  **≈ 7,5 j**   |

Ordre conseillé : **L1 → L5 → L3 → L4 → L2 → L6 → L7 → L8**. On sécurise d'abord le serveur, puis on branche le parcours joueur (le cœur du produit), puis la sauvegarde du Studio.

Autre ordre possible, si tu veux d'abord _voir_ le résultat : L2 → L4 → L3 (la marque édite, le joueur voit le design) ; L1 sécurité et L5 restent obligatoires **avant** de publier un lien.

---

## 5. Ce qui est volontairement laissé hors MVP

| Sujet                                                            | Pourquoi on peut attendre                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brouillon / publié (`experience_draft` + `experience_published`) | Dans le MVP, chaque sauvegarde du Studio est visible tout de suite par les joueurs. Acceptable si la marque prépare le design **avant** d'activer la campagne. Le Studio peut afficher un avertissement quand la campagne est `active`. |
| Historique des versions                                          | Le Studio a déjà annuler/rétablir pendant la session.                                                                                                                                                                                   |
| Captcha (Turnstile)                                              | La protection anti-doublon par téléphone suffit pour un MVP. Risque restant : un robot avec beaucoup de numéros.                                                                                                                        |
| Table d'événements analytics                                     | `record_campaign_impression` + `entries` couvrent le tableau de bord actuel.                                                                                                                                                            |
| Colonnes dédiées (consentement, wilaya, email)                   | `entries.metadata` (JSONB) suffit ; aucune migration de schéma.                                                                                                                                                                         |
| Édition des lots et des questions dans le Studio                 | Ça reste dans le Wizard, comme prévu.                                                                                                                                                                                                   |
| Correction F3 (stock perdu en cas de course)                     | Cas rare (deux onglets exactement en même temps).                                                                                                                                                                                       |

---

## 6. Risques et points de vigilance

1. **Régression du dashboard après la fermeture des failles (L1).** Certaines vues reposent peut-être sur la lecture anonyme de `entries` ou sur des RPC appelées sans session. Les tester connecté, écran par écran, avant de déployer.
2. **Base cloud différente des migrations.** L'en-tête de `PlayerFlowPage.tsx` montre que des politiques ont été ajoutées à la main dans le cloud. Avant de déployer, lister les politiques réelles du projet cloud (`select * from pg_policies`) et les comparer aux migrations.
3. **Edge Functions déployées à la main.** Ne pas oublier `supabase functions deploy select-prize` après L5. Sinon, le front `live` parle à l'ancienne version (sans consentement ni idempotence).
4. **Identifiants de lots stables.** `prizeDisplay` et les segments de la roue sont indexés par `prizes.id`. `save_campaign_full_in_place` conserve l'id tant que le modèle de lot reste dans la campagne. Retirer puis remettre un lot change son id : le Studio le signale déjà en validation, mais le vérifier en recette.
5. **Mise en production sans brouillon.** Chaque sauvegarde automatique du Studio sur une campagne active change immédiatement ce que voient les joueurs.
6. **Taille de la config (si L6 est reporté).** Avec des data URLs, surveiller le poids de `get_public_experience` sur mobile.

---

## 7. Définition de « terminé » pour ce MVP backend

- [ ] Deux navigateurs différents voient la même config du Studio pour une campagne. Une modification faite en parallèle dans un autre onglet donne un `CONFLICT` explicite, sans perte silencieuse.
- [ ] Enregistrer la campagne dans le Wizard n'écrase jamais le design du Studio.
- [ ] `/play/:slug` affiche le design du Studio (ou les valeurs par défaut) pour les 5 jeux, en fr / ar / en, sur mobile réel.
- [ ] Le résultat vient **uniquement** de `select-prize`. Aucun chemin client n'écrit dans `entries` ni n'appelle une fonction de tirage.
- [ ] Sans consentement, le serveur refuse (`400`). Le consentement est conservé dans `entries.metadata`.
- [ ] Hit It sous le seuil = perdu, quel que soit le tirage.
- [ ] Un deuxième essai après une coupure réseau renvoie le même lot et le même coupon.
- [ ] Deux gagnants simultanés reçoivent deux coupons différents.
- [ ] Un anonyme (clé anon seule) ne peut plus : lire `entries`, écrire dans `entries`, appeler `draw_and_claim_campaign_prize` / `resolve_game_outcome` / `claim_campaign_prize_coupon` / `save_campaign_full_in_place` / `get_campaign_participants`, ni lire `correct_option_index`.
- [ ] Le dashboard (Participants, Analytics, Inventaire, Wizard) fonctionne toujours, connecté.
- [ ] `npm run verify` passe ; les migrations passent sur `npx supabase db reset`.

---

## 8. Fichiers concernés (récapitulatif)

**À créer**

- `supabase/migrations/…_player_experience_backend.sql`
- `src/features/player-experience/services/supabase/supabaseExperienceRepository.ts` (+ test)
- `src/features/player-experience/services/supabase/supabaseParticipationGateway.ts` (+ test)
- `src/features/player-experience/services/supabase/supabaseAssetStorage.ts` (+ test)
- `src/features/player-experience/services/supabase/supabaseAnalyticsTracker.ts`
- `src/features/player-experience/services/createSupabaseServices.ts`
- Nouvelle page publique `/play/:slug`

**À modifier**

- `supabase/functions/select-prize/index.ts`
- `src/features/player-experience/studio/CampaignStudio.tsx`, `CampaignSimulator.tsx`
- `src/features/player-experience/runtime/host/FrameExperience.tsx` (`resolveStorage`)
- `src/features/player-experience/services/local/dataUrlAssetStorage.ts` (partage de la compression)
- `src/features/player-experience/index.ts` (exports)
- `src/AppRouter.tsx` (route `/play/:slug`)
- `src/features/player-experience/README.md` et `services/supabase/README.md` (fin du « après le MVP »)

**À supprimer**

- `src/pages/play/PlayerFlowPage.tsx` et les `src/components/Player*.tsx` (+ `PhoneFrame` s'il n'est plus utilisé)

**Inchangés** : tout `runtime/` (sauf l'aperçu), tout `domain/`, les panneaux du Studio, le Wizard, la table `campaigns`, `src/types.ts` et `useCampaigns`.
