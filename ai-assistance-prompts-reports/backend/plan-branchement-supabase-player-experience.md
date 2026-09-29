# Plan d'exécution — Brancher le Player Experience sur Supabase (MVP)

**Date :** 2026-09-27
**Référence :** [`diagnostic-branchement-supabase-player-experience.md`](./diagnostic-branchement-supabase-player-experience.md) (les codes S1–S7, F1–F5 et I1–I5 renvoient à ce diagnostic)
**Branche de départ :** `Refactor/PlayerEditor` (commit `19c1a1d`)
**Objectif :** que le Studio enregistre en base, que `/play/:slug` affiche le nouveau runtime avec le vrai tirage serveur, et que la base ne soit plus ouverte aux anonymes. Avec le **minimum** de backend : aucune nouvelle Edge Function, 4 migrations SQL, 1 fonction modifiée (`select-prize`).
**Abréviation :** `XP/` = `src/features/player-experience/`

---

## Sommaire

0. [Mode d'emploi](#0-mode-demploi)
1. [Vue d'ensemble](#1-vue-densemble)
2. [Phase B0 — Préparation et filets de sécurité](#phase-b0--préparation-et-filets-de-sécurité-05-j)
3. [Phase B1 — Base de données](#phase-b1--base-de-données-15-j)
4. [Phase B2 — Edge Function `select-prize`](#phase-b2--edge-function-select-prize-1-j)
5. [Phase B3 — Adaptateurs Supabase](#phase-b3--adaptateurs-supabase-2-j)
6. [Phase B4 — Studio et sandbox sur Supabase](#phase-b4--studio-et-sandbox-sur-supabase-15-j)
7. [Phase B5 — Route publique `/play/:slug`](#phase-b5--route-publique-playslug-1-j)
8. [Phase B6 — Nettoyage, déploiement et recette](#phase-b6--nettoyage-déploiement-et-recette-175-j)
9. [Récapitulatif et chemin minimum](#9-récapitulatif-et-chemin-minimum)
10. [Déploiement : ordre, compatibilité et retour arrière](#10-déploiement--ordre-compatibilité-et-retour-arrière)
11. [Recette manuelle (checklist)](#11-recette-manuelle-checklist)
12. [Risques et parades](#12-risques-et-parades)
13. [Hors périmètre (après ce MVP)](#13-hors-périmètre-après-ce-mvp)

---

## 0. Mode d'emploi

### 0.1 Règles d'exécution

Les règles de [`playereditor/rules.md`](../playereditor/rules.md) s'appliquent à l'identique :

1. **Une tâche par échange.** Je ne passe pas à la suivante sans ton feu vert, sauf si tu me confies explicitement un lot.
2. **Documentation en français, implémentation en anglais (R0).** Cela vaut pour le SQL, les commentaires, les tests, les messages d'erreur et les commits.
3. **Une fiche par tâche**, créée avant le code : `ai-assistance-prompts-reports/backend/tasks_docs/phase_B<n>/<ID>-<titre-court>.md`, plus un index `README.md` par phase. Même modèle que `rules.md` §9.
4. **Je ne commite pas.** Chaque fiche donne le message de commit proposé. Git reste en lecture seule pour moi, sauf autorisation explicite pendant la session.
5. **Je ne déploie rien sur Supabase Cloud ni sur Firebase.** Je donne les commandes exactes, et c'est toi qui les lances (§10).
6. Si une tâche révèle un imprévu (par exemple une politique cloud absente des migrations), je m'arrête et je te le signale.

### 0.2 Conventions

| Sujet              | Règle                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrations         | `supabase/migrations/<AAAAMMJJHHMMSS>_<snake_case>.sql`, **une par tâche B1.x**, idempotentes (`IF EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`)                                                               |
| Fonctions SQL      | `SET search_path = public` sur toute fonction `SECURITY DEFINER` ; chaque nouvelle fonction se termine par `REVOKE ALL … FROM PUBLIC, anon, authenticated`, puis par un `GRANT` explicite au seul rôle voulu            |
| Adaptateurs        | `XP/services/supabase/`. Ils reçoivent le client Supabase **en paramètre** (injection) et n'importent jamais `src/lib/supabase.ts` : ils restent testables avec un faux client                                          |
| `domain/`          | N'importe jamais Supabase (ESLint le vérifie). Les conversions JSON → types du domaine y sont des fonctions pures, validées par `zod`                                                                                   |
| Commits            | `fix(Supabase): …` / `feat(Supabase): …` pour `supabase/` ; `feat(Player-Experience): …` pour `XP/` ; `chore(Backend): …` pour les scripts. Toujours la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` |
| Vérification front | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (= `npm run verify`)                                                                                                                                   |
| Vérification SQL   | `npx supabase db reset` (toutes les migrations passent), puis `npm run backend:probe` (B0.2)                                                                                                                            |

### 0.3 Décisions appliquées par défaut (modifiables avant la tâche concernée)

| #   | Décision                              | Valeur retenue                                                                           | Tâche | Pourquoi                                                                                                                                                                                                   |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Où ranger la config du Studio         | **Table séparée `campaign_experiences`** (une ligne par campagne), validée le 2026-09-29 | B1.2  | Le Wizard remplace toute la colonne `player_screen_config` à chaque enregistrement (I1). Une table à part supprime ce risque, laisse `campaigns` intacte et permettra un brouillon / historique plus tard. |
| D2  | Lecture publique d'une campagne       | **Une RPC `get_public_experience(slug)`**, sans politique anon sur `campaigns`           | B1.2  | Ne renvoie que les champs sûrs : ferme S6 et I5.                                                                                                                                                           |
| D3  | Tirage dans le Studio et le sandbox   | **Reste en démo** (navigateur, codes `DEMO-…`)                                           | B4.1  | Un aperçu ne doit jamais consommer du vrai stock.                                                                                                                                                          |
| D4  | Publication                           | **Immédiate** (pas de brouillon/publié)                                                  | —     | Minimum. Un avertissement dans le Studio signale une campagne active (B4.4).                                                                                                                               |
| D5  | Preuve du consentement                | **Dans `entries.metadata.consent`** (aucune colonne nouvelle)                            | B2.1  | Minimum ; une colonne dédiée pourra venir plus tard.                                                                                                                                                       |
| D6  | Images                                | **Supabase Storage**, bucket existant `campaign-media`                                   | B3.3  | Config légère pour les joueurs sur mobile (I2).                                                                                                                                                            |
| D7  | Fonctions « sensibles »               | Passées en **`SECURITY INVOKER`** au lieu d'être réécrites                               | B1.1  | Une ligne par fonction : les politiques RLS existantes font alors respecter l'organisation.                                                                                                                |
| D8  | Ancienne page `/play/:slug`           | **Supprimée** après la recette (B6.1) ; aucune bascule par drapeau                       | B6.1  | Le retour arrière = annuler le commit front (§10.3).                                                                                                                                                       |
| D9  | Captcha, table d'événements, versions | **Hors périmètre**                                                                       | —     | §13.                                                                                                                                                                                                       |

---

## 1. Vue d'ensemble

### 1.1 Architecture cible

```
┌──────────────────── Dashboard (utilisateur connecté) ────────────────────┐
│ App.tsx ── useAuth().organizationId ──┐                                  │
│                                       ▼                                  │
│ CampaignStudio / CampaignSimulator ◄── createStudioServices({client, orgId})
│   repository ──► rpc save_experience_config / select campaign_experiences│
│   assets ──────► Storage campaign-media/<orgId>/experience/<campaignId>/…│
│   participation ► DÉMO (inchangé)   analytics ► console                  │
└──────────────────────────────────────────────────────────────────────────┘
                         │ écrit
                         ▼
     table campaign_experiences (1 ligne par campagne, config jsonb)
                         ▲ lit (via RPC, champs sûrs seulement)
┌──────────────────── /play/:slug (anonyme) ──────────────────────────────┐
│ PublicPlayPage ── loadPublicExperience(slug) ── rpc get_public_experience│
│   <ServicesProvider services={createPublicServices({client, availability})}>
│     <PlayerExperience allowedGatewayModes={["live"]} … />               │
│   participation ► select-prize / confirm-coupon (Edge Functions)        │
│   analytics ────► rpc record_campaign_impression                        │
│   assets ───────► URL publique Storage (lecture seule)                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Phases

| Phase     | Contenu                                                                                      | Durée                                      |
| --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **B0**    | Branche, audit de la base cloud, sonde de sécurité anonyme                                   | 0,5 j                                      |
| **B1**    | 3 migrations : fermeture des failles, table `campaign_experiences` + RPC, correctif Hit It   | 1,75 j                                     |
| **B2**    | `select-prize` : consentement, idempotence, coupon atomique, codes d'erreur ; script de test | 1 j                                        |
| **B3**    | 4 adaptateurs Supabase + compositions de services                                            | 2 j                                        |
| **B4**    | Studio et sandbox sur Supabase, aperçu des images, import du `localStorage`                  | 1,5 j                                      |
| **B5**    | Disponibilité au chargement, chargeur public, nouvelle page `/play/:slug`                    | 1 j                                        |
| **B6**    | Suppression de l'ancien code, fermeture des lectures anonymes, docs, déploiement, recette    | 1,75 j                                     |
| **Total** |                                                                                              | **≈ 9,25 j**, dont ≈ 1,5 j optionnels (§9) |

> L'estimation du diagnostic (≈ 7,5 j) ne comptait ni les scripts de vérification (B0.2, B2.2), ni l'état « campagne fermée » au chargement (B5.1), ni la conversion des images importées (B4.3). Sans les tâches marquées **optionnel**, on revient à ≈ 7,5 j.

### 1.3 Graphe des dépendances

```
B0.1 ─► B0.2 ─► B1.1 ─────────────────────────────► B6.2 ─► B6.4
         │                                              ▲
         └──► B1.2 ─► B3.1 ─► B4.1 ─► B4.3             │
               │      B3.3 ─► B4.2                      │
               │      B3.4 ─┐                           │
               ├──► B5.2 ───┼─► B3.5 ─► B5.3 ─► B6.1 ───┘
B1.3 ─► B2.1 ─► B2.2        │     ▲
         └──► B3.2 ─────────┘     │
B5.1 ─────────────────────────────┘
```

---

## Phase B0 — Préparation et filets de sécurité (0,5 j)

### B0.1 — Branche, pile locale et audit de la base cloud

**Objectif :** partir d'une base connue. Savoir exactement ce qui tourne dans le cloud, car des politiques y ont été ajoutées à la main.

**Fichiers :** `ai-assistance-prompts-reports/backend/audit/cloud-baseline.md` (nouveau), fiche de tâche
**Dépend de :** —
**Durée :** 0,25 j

**Étapes :**

1. **Branche** (à lancer par toi) :
   ```bash
   git switch -c feat/player-experience-backend
   ```
2. **Pile locale.** `supabase/config.toml` **n'existe pas** dans le dépôt, alors que `CLAUDE.md` décrit `npx supabase start`. Vérifier :
   - si `npx supabase start` démarre tel quel ;
   - sinon, lancer `npx supabase init` (il crée seulement `config.toml`), puis `npx supabase start` et `npx supabase db reset`.

   Noter les clés locales (`anon`, `service_role`) dans `.env.local` (déjà ignoré par git).

3. **Audit cloud** : exécuter en lecture seule, dans l'éditeur SQL du projet cloud, puis coller les résultats dans `audit/cloud-baseline.md`.
   ```sql
   -- Policies actually in place
   select tablename, policyname, roles, cmd, qual, with_check
   from pg_policies where schemaname in ('public', 'storage') order by 1, 2;

   -- Functions anon/authenticated can execute
   select p.proname, p.prosecdef as security_definer,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' order by 1;

   -- Migrations applied in the cloud
   select version, name from supabase_migrations.schema_migrations order by version;

   -- The new table must not exist yet
   select to_regclass('public.campaign_experiences') as campaign_experiences;
   ```
4. **Comparer** avec les migrations du dépôt. Lister chaque différence : politique manuelle (par exemple « Public read active campaigns »), migration manquante, fonction en plus.

**Critères d'acceptation :**

- la pile locale démarre, et `db reset` passe ;
- `cloud-baseline.md` liste les politiques, les droits des fonctions et les différences avec le dépôt ;
- toute différence qui touche B1 est signalée **avant** B1.1.

**Vérification :** `npx supabase db reset` sans erreur.
**Commit :** `docs(Backend): record the cloud database baseline before the player experience wiring`

---

### B0.2 — Sonde de sécurité anonyme

**Objectif :** un script qui essaie, **avec la seule clé anon**, tout ce qu'un visiteur ne doit pas pouvoir faire. Aujourd'hui il échoue (failles S1–S6) ; il devient vert au fil de B1 et B6. Il sert ensuite de test de non-régression.

**Fichiers :** `scripts/backend/anon-probe.mjs` (nouveau), `package.json` (script `backend:probe`)
**Dépend de :** B0.1
**Durée :** 0,25 j

**Spécification :**

```js
// scripts/backend/anon-probe.mjs
// Usage: node --env-file=.env.local scripts/backend/anon-probe.mjs [--expect=current|secured]
// Runs every check with the anon key only and prints a table: check | expected | actual | ok.
```

| #   | Vérification (clé anon)                                                            | Attendu une fois sécurisé                                        | Fermé par |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| P1  | `from("entries").select("phone_number").limit(1)`                                  | 0 ligne                                                          | B1.1      |
| P2  | `from("entries").insert({...is_winner: true})`                                     | erreur RLS                                                       | B1.1      |
| P3  | `from("entries").update({is_winner: true, coupon_confirmed: true}).eq("id", X)`    | 0 ligne modifiée                                                 | B1.1      |
| P4  | `rpc("draw_and_claim_campaign_prize", {...})`                                      | `permission denied`                                              | B1.1      |
| P5  | `rpc("resolve_game_outcome", {...})`                                               | `permission denied`                                              | B1.1      |
| P6  | `rpc("claim_campaign_prize_coupon", {...})`                                        | `permission denied`                                              | B1.1      |
| P7  | `rpc("save_campaign_full_in_place", {...})`                                        | `permission denied`                                              | B1.1      |
| P8  | `rpc("get_campaign_participants", {p_organization_id: null, p_campaign_id: null})` | `permission denied`                                              | B1.1      |
| P9  | `rpc("get_campaign_analytics_v2", {...})`                                          | `permission denied`                                              | B1.1      |
| P10 | `from("quiz_questions").select("correct_option_index")`                            | 0 ligne                                                          | B6.2      |
| P11 | `from("prizes").select("weight, quantity")`                                        | 0 ligne                                                          | B6.2      |
| P12 | `from("campaigns").select("win_probability")`                                      | 0 ligne                                                          | B6.2      |
| P13 | `rpc("get_public_experience", {p_slug})`                                           | OK, **sans** `correct_option_index`, `weight`, `win_probability` | B1.2      |
| P14 | `rpc("record_campaign_impression", {...})`                                         | OK (doit rester public)                                          | —         |
| P15 | `functions.invoke("select-prize", {...})`                                          | OK (doit rester public)                                          | —         |

- Les identifiants de test (campagne, lot, entrée) sont lus dans une campagne du seed (`supabase/SEED.md`) ou passés en arguments.
- Les vérifications qui écrivent (P2, P3, P7) ciblent une campagne de test et sont **annulées** si elles réussissent (nettoyage avec la clé service_role).
- Code de sortie `1` si une vérification ne correspond pas à l'attendu du mode choisi.
- **Ne jamais lancer ce script contre le cloud avec `--expect=current`** : il écrirait réellement dans la base de production.

**Critères d'acceptation :** en local, `--expect=current` passe (il confirme les failles) ; `--expect=secured` échoue exactement sur P1–P12.

**Vérification :** `npm run backend:probe -- --expect=current`
**Commit :** `chore(Backend): add an anon-key security probe`

---

## Phase B1 — Base de données (1,5 j)

### B1.1 — Fermer les failles anonymes (S1–S5)

**Objectif :** qu'un anonyme ne puisse plus ni lire ni écrire les participations, ni appeler les fonctions internes au tirage ou au dashboard. **L'ancienne page `/play/:slug` doit continuer de marcher** par son chemin normal (`select-prize`). Seul son repli client (S5) cesse de fonctionner, et c'est voulu.

**Fichiers :** `supabase/migrations/<ts>_close_anonymous_access.sql`, `src/services/analyticsService.ts`
**Dépend de :** B0.2
**Durée :** 0,75 j (dont la moitié en tests du dashboard)

**Spécification SQL :**

```sql
-- 1. entries: written only by Edge Functions (service_role), read only by org members.
DROP POLICY IF EXISTS "select_entries_failsafe" ON public.entries;
DROP POLICY IF EXISTS "public_insert_entries"  ON public.entries;
DROP POLICY IF EXISTS "anon_confirm_coupon"    ON public.entries;
-- "select_org_entries", "update_org_entries", "delete_org_entries" stay.

-- 2. Draw internals: service_role only (select-prize). Internal calls between
--    SECURITY DEFINER functions run as the owner and are not affected.
REVOKE ALL ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_game_outcome(uuid, jsonb)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid)      FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_game_outcome(uuid, jsonb)            TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid)      TO service_role;

-- 3. Dashboard functions: signed-in users only, and RLS decides what they see (D7).
ALTER FUNCTION public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb, text, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.get_campaign_participants(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_campaign_analytics_v2(uuid, uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.save_campaign_full_in_place(/* same 19 types */) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_campaign_participants(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_campaign_full_in_place(/* same 19 types */) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) TO authenticated, service_role;

-- 4. Older signatures of save_campaign_full_in_place left over by previous migrations.
DROP FUNCTION IF EXISTS public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb);
```

**Détails :**

- **Pourquoi `SECURITY INVOKER` (D7) :** ces trois fonctions ne lisent et n'écrivent que des tables qui ont déjà des politiques « membre de l'organisation » pour `authenticated` : `campaigns`, `prizes`, `prize_inventory`, `prize_templates`, `quiz_questions`, `entries`, `campaign_impressions`. En mode invoker, un utilisateur ne voit et ne modifie que sa propre organisation, sans réécrire 400 lignes de PL/pgSQL.
  - **À vérifier dans la tâche :** chaque requête de ces fonctions passe-t-elle les politiques ?
  - Si l'une échoue (table sans politique pour `authenticated`), repli pour cette fonction seulement : la redéfinir en `SECURITY DEFINER`, avec `IF NOT is_org_member(p_organization_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;` en tête.
- **`analyticsService.ts` (lignes ~75–130) :** supprimer les « niveaux 2 et 3 » du repli. Ils rappellent les RPC avec `p_organization_id: null` (« global database scope »), puis sans argument. Après B1.1, ces appels ne renvoient que les lignes de l'organisation : ils sont inutiles et trompeurs. Garder l'appel avec `organizationId`. Même nettoyage pour `allCampData` (lecture de toutes les campagnes quand l'organisation n'en a pas).
- **`record_campaign_impression` reste public** : il est appelé par la page joueur.
- Les droits de table accordés à anon (`GRANT SELECT, INSERT… ON ALL TABLES`) ne changent pas. Ce sont les politiques RLS qui protègent, et la règle N2 (RLS activée partout) reste respectée.

**Tests du dashboard (connecté avec `studio.test@octoreach.local`) :**

| Écran                       | À vérifier                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Campaigns                   | liste, création, modification dans le Wizard (utilise `save_campaign_full_in_place`), duplication |
| Participants                | liste et export (utilise `get_campaign_participants`)                                             |
| Analytics                   | chiffres et histogrammes (utilise `get_campaign_analytics_v2`)                                    |
| Inventory / Prize templates | lecture, modification, codes de coupons                                                           |
| `/play/:slug` (ancien)      | une participation complète **par `select-prize`** marche encore                                   |

**Critères d'acceptation :**

- `npm run backend:probe -- --expect=secured` : P1–P9 OK ;
- les 5 écrans ci-dessus marchent ;
- `db reset` passe.

**Vérification :** `npx supabase db reset && npm run backend:probe -- --expect=secured` (P10–P12 encore attendus en échec), `npm run verify`
**Commit :** `fix(Supabase): close anonymous access to entries and internal functions`

---

### B1.2 — Table `campaign_experiences`, RPC d'enregistrement et RPC de lecture publique

**Objectif :** donner au design du Studio **sa propre table**, séparée des règles de la campagne (D1), et aux joueurs une lecture publique limitée aux champs sûrs (D2).

**Fichiers :** `supabase/migrations/<ts>_add_campaign_experiences.sql`
**Dépend de :** B1.1
**Durée :** 0,75 j

**Pourquoi une table séparée plutôt qu'une colonne de `campaigns` (décision du 2026-09-29) :**

- la table `campaigns` n'est pas modifiée ;
- les enregistrements automatiques du Studio (environ une par seconde pendant l'édition) ne réécrivent jamais la ligne de campagne, que lisent le tirage et le Wizard ;
- une lecture `select("*")` sur `campaigns` ne ramène jamais le design (jusqu'à ~2 Mo) ;
- un brouillon / publié ou un historique pourra s'ajouter plus tard sans toucher `campaigns`.

**Spécification SQL :**

```sql
-- B1.2: the Studio design of each campaign, kept apart from the campaign rules.
CREATE TABLE IF NOT EXISTS public.campaign_experiences (
  campaign_id     uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config          jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'), -- ExperienceConfig
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_campaign_experiences_organization
  ON public.campaign_experiences (organization_id);

ALTER TABLE public.campaign_experiences ENABLE ROW LEVEL SECURITY;

-- Members of the organization only. On write, organization_id must also be the one of the
-- campaign: a member of org A can never attach a design to a campaign of org B.
DROP POLICY IF EXISTS "select_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "select_org_campaign_experiences" ON public.campaign_experiences FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "insert_org_campaign_experiences" ON public.campaign_experiences FOR INSERT
  TO authenticated WITH CHECK (
    is_org_member(organization_id)
    AND organization_id = (SELECT c.organization_id FROM public.campaigns c WHERE c.id = campaign_id));

DROP POLICY IF EXISTS "update_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "update_org_campaign_experiences" ON public.campaign_experiences FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (
    is_org_member(organization_id)
    AND organization_id = (SELECT c.organization_id FROM public.campaigns c WHERE c.id = campaign_id));

DROP POLICY IF EXISTS "delete_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "delete_org_campaign_experiences" ON public.campaign_experiences FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- No anon policy: players read the design only through get_public_experience.
-- The default privileges of 20260706091000 grant anon every new table: take it back.
REVOKE ALL ON TABLE public.campaign_experiences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_experiences TO authenticated;
GRANT ALL ON TABLE public.campaign_experiences TO service_role;

-- Save with optimistic concurrency. SECURITY INVOKER: the policies above apply.
CREATE OR REPLACE FUNCTION public.save_experience_config(
  p_campaign_id uuid,
  p_config jsonb,
  p_expected_updated_at text DEFAULT NULL -- null = overwrite (import)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_now timestamptz := clock_timestamp();
  v_config jsonb;
  v_rows int;
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
  END IF;
  IF pg_column_size(p_config) > 2000000 THEN -- ~2 MB: data URLs left in the configuration
    RETURN jsonb_build_object('ok', false, 'code', 'TOO_LARGE');
  END IF;

  -- RLS on campaigns: only a member of the campaign's organization finds it.
  SELECT organization_id INTO v_org FROM public.campaigns WHERE id = p_campaign_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  -- The server owns updatedAt and campaignId.
  v_config := p_config || jsonb_build_object(
    'updatedAt', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'campaignId', p_campaign_id::text);

  -- First save creates the row; later saves only succeed on the expected version.
  INSERT INTO public.campaign_experiences AS ce
    (campaign_id, organization_id, config, updated_at, updated_by)
  VALUES (p_campaign_id, v_org, v_config, v_now, auth.uid())
  ON CONFLICT (campaign_id) DO UPDATE
    SET config = EXCLUDED.config,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    WHERE p_expected_updated_at IS NULL
       OR ce.config->>'updatedAt' = p_expected_updated_at;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CONFLICT');
  END IF;
  RETURN jsonb_build_object('ok', true, 'config', v_config);
END;
$$;
REVOKE ALL ON FUNCTION public.save_experience_config(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_experience_config(uuid, jsonb, text) TO authenticated;

-- Public read for /play/:slug: safe fields only. SECURITY DEFINER because anon has no
-- read policy on campaigns and must not get one.
CREATE OR REPLACE FUNCTION public.get_public_experience(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.campaigns%ROWTYPE;
  v_reason text;
  v_allocated int;
  v_winners int;
BEGIN
  SELECT * INTO v_c FROM public.campaigns WHERE slug = p_slug;
  IF NOT FOUND OR v_c.status IN ('draft', 'archived') THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF v_c.status <> 'active' OR now() NOT BETWEEN v_c.start_date AND v_c.end_date THEN
    v_reason := 'CLOSED';
  ELSE -- same sold-out rule as select-prize (step 3)
    SELECT COALESCE(SUM(quantity), 0) INTO v_allocated
      FROM public.prizes WHERE campaign_id = v_c.id AND is_active;
    SELECT COUNT(*) INTO v_winners
      FROM public.entries WHERE campaign_id = v_c.id AND is_winner;
    IF v_allocated > 0 AND v_winners >= v_allocated THEN v_reason := 'SOLD_OUT'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'campaign', jsonb_build_object(
      'id', v_c.id, 'slug', v_c.slug, 'name', v_c.name,
      'game_type', v_c.game_type, 'status', v_c.status,
      'rules', jsonb_build_object(
        'pass_threshold_percentage', v_c.game_logic_config->'pass_threshold_percentage',
        'quiz_seconds_per_question', v_c.game_logic_config->'quiz_seconds_per_question',
        'win_threshold',             v_c.game_logic_config->'win_threshold',
        'hit_it_duration_seconds',   v_c.game_logic_config->'hit_it_duration_seconds')),
    'prizes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'win_message', p.win_message)
                       ORDER BY p.created_at, p.id)
        FROM public.prizes p WHERE p.campaign_id = v_c.id AND p.is_active), '[]'::jsonb),
    'quiz', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', to_jsonb(q.options))
                       ORDER BY q.position)
        FROM public.quiz_questions q WHERE q.campaign_id = v_c.id AND q.is_active), '[]'::jsonb),
    'availability', CASE WHEN v_reason IS NULL THEN jsonb_build_object('open', true)
                         ELSE jsonb_build_object('open', false, 'reason', v_reason) END,
    'experience', (SELECT ce.config FROM public.campaign_experiences ce
                    WHERE ce.campaign_id = v_c.id)); -- null when the Studio was never opened
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_experience(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_experience(text) TO anon, authenticated;
```

**Détails :**

- **Jamais renvoyés** par `get_public_experience` : `weight`, `quantity`, `quantity_won`, `win_probability`, `max_entries`, `auto_pace_*`, `correct_option_index`, les coupons, `organization_id`.
- **À vérifier :** la colonne `prizes.created_at` existe (sinon trier par `id`) ; `quiz_questions.options` est un `text[]` (`to_jsonb` renvoie alors un tableau JSON).
- **Statuts :** `draft` et `archived` sont traités comme introuvables (non publiés). `paused` et `ended` sont trouvés, mais `CLOSED`.
- **Écart avec `select-prize` :** `select-prize` ne vérifie pas encore la période (F5). B2.1 aligne les deux.
- **`ON CONFLICT … DO UPDATE … WHERE`** : si la version attendue ne correspond pas, aucune ligne n'est touchée (`ROW_COUNT = 0`), d'où `CONFLICT`. Sous RLS, cette écriture exige les politiques `SELECT`, `INSERT` et `UPDATE` : elles existent toutes.
- **Contrôle de version :** il compare `config->>'updatedAt'`, la valeur que le Studio connaît déjà (`storedUpdatedAt`). La colonne `updated_at` en est le miroir lisible (tri, audit), et `updated_by` indique qui a fait la dernière modification.
- **La table `campaigns`, `src/types.ts` et `useCampaigns` ne changent pas.** Le Studio lit la nouvelle table à part (B3.1).
- `player_screen_config` n'est pas touchée : le Wizard continue de l'écrire comme avant, sans conséquence.
- **Duplication d'une campagne** (`source_campaign_id`) : le design n'est **pas** copié dans le MVP ; la copie démarre avec le design par défaut (à noter dans « Après le MVP »).

**Critères d'acceptation :**

- en local, avec un utilisateur de l'organisation : le 1ᵉʳ `save_experience_config` crée la ligne (`ok`) ; un 2ᵉ appel avec le bon `updatedAt` → `ok` ; avec l'ancien → `CONFLICT` ;
- avec un utilisateur d'une **autre** organisation : `NOT_FOUND`, et la ligne est invisible en lecture directe ;
- insertion directe avec un `organization_id` qui n'est pas celui de la campagne → refusée par RLS ;
- anon : `permission denied` sur la fonction, 0 ligne en lecture directe de la table ;
- suppression de la campagne → la ligne du design disparaît ;
- `get_public_experience` (anon) : `found: false` pour un slug inconnu ou brouillon, `CLOSED` pour une campagne en pause, `experience: null` sans design, aucun champ interdit dans le JSON (P13 de la sonde).

**Vérification :** `npx supabase db reset`, `npm run backend:probe -- --expect=secured` (P13), `npm run verify`
**Commit :** `feat(Supabase): store the player experience design and expose a safe public read`

---

### B1.3 — Hit It et quiz : pas de tirage en cas d'échec (F1)

**Objectif :** un joueur sous le seuil (Hit It) ou sous le score (quiz) perd **toujours**, quelle que soit la valeur de `require_quiz`.

**Fichiers :** `supabase/migrations/<ts>_skill_games_never_draw_on_failure.sql`
**Dépend de :** —
**Durée :** 0,25 j

**Spécification :** `CREATE OR REPLACE FUNCTION public.resolve_game_outcome(...)`, copie de `20260831151000_resolve_game_outcome_rpc.sql` avec ces changements :

```sql
-- quiz and hit_it branches, after v_passed is computed:
IF v_passed THEN
  -- true: the skill check already passed here, so the require_quiz gate must not block it.
  v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
ELSE
  v_draw_result := jsonb_build_object('ok', true, 'is_winner', false,
    'prize_id', null, 'prize_name', null, 'win_message', null);
END IF;
v_draw_result := v_draw_result || jsonb_build_object('score', v_score, 'passed', v_passed); -- quiz
-- (hit_it: || jsonb_build_object('hits', v_hits, 'passed', v_passed))
```

- Ajouter `SET search_path = public`.
- Refaire le `REVOKE` / `GRANT service_role` de B1.1 : `CREATE OR REPLACE` garde les droits, mais on les réécrit pour que la migration se suffise à elle-même.
- Ne rien changer au reste (segments de la roue, boîtes).
- **Même règle que le moteur de démo** (`XP/services/local/demoDrawEngine.ts`) : aucune différence entre l'aperçu et la production.

**Critères d'acceptation :** en local, avec une campagne Hit It (`win_threshold = 8`, `win_probability = 1`) : `hits: 3` → perdu 20 fois sur 20, stock intact ; `hits: 9` → gagné. Même chose pour un quiz à 0 % de bonnes réponses.

**Vérification :** `npx supabase db reset`, puis requête SQL de test (dans la fiche), ou B2.2 une fois écrit.
**Commit :** `fix(Supabase): never draw a prize after a failed skill game`

---

## Phase B2 — Edge Function `select-prize` (1 j)

### B2.1 — Consentement, période, idempotence, coupon atomique, codes d'erreur

**Objectif :** que `select-prize` applique toutes les règles attendues par le runtime (S7, F2, F4, F5), sans changer la forme de sa réponse pour l'ancien client.

**Fichiers :** `supabase/functions/select-prize/index.ts`
**Dépend de :** B1.3 (même contrat de tirage), B1.1 (`claim_campaign_prize_coupon` reste accessible à service_role)
**Durée :** 0,75 j

**Nouvel ordre des étapes :**

| #   | Étape                                                                                                                                                                                                                                          | Réponse en cas d'échec                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `campaign_id` et `phone_number` présents ; téléphone valide                                                                                                                                                                                    | `400 { code: "INVALID_INPUT" }`                                  |
| 2   | **Consentement :** `metadata.consent.accepted === true`, `acceptedAt` ISO, `policyVersion` non vide                                                                                                                                            | `400 { code: "CONSENT_REQUIRED" }`                               |
| 3   | **Rejeu (idempotence) :** si `metadata.client_request_id` est fourni et qu'une entrée existe avec `campaign_id` + téléphone + `metadata->>client_request_id` identiques → renvoyer **la même réponse** (entrée, lot, coupon), sans rien écrire | —                                                                |
| 4   | Impression (`record_campaign_impression`), comme aujourd'hui                                                                                                                                                                                   | ignoré                                                           |
| 5   | Campagne trouvée, `active`, **et dans sa période**                                                                                                                                                                                             | `404/400 { code: "CAMPAIGN_CLOSED" }`                            |
| 6   | Doublon (`max_entries`)                                                                                                                                                                                                                        | `400 { code: "ALREADY_PARTICIPATED" }`                           |
| 7   | Stock global épuisé                                                                                                                                                                                                                            | `400 { code: "CAMPAIGN_CLOSED" }`                                |
| 8   | `resolve_game_outcome` (tirage atomique ; échec du jeu d'adresse = perdu, B1.3)                                                                                                                                                                | `500 { code: "DRAW_FAILED" }`                                    |
| 9   | Insertion de l'entrée (`metadata` enrichi, voir ci-dessous)                                                                                                                                                                                    | `23505` → `400 { code: "ALREADY_PARTICIPATED" }` ; autre → `500` |
| 10  | **Si gagnant : `rpc("claim_campaign_prize_coupon", { p_prize_id, p_entry_id })`** (verrou `SKIP LOCKED`, écrit `coupon_redemptions` et `entries.redeemed_coupon_value`)                                                                        | coupon `null` + `console.warn` ; le gain reste                   |
| 11  | Réponse                                                                                                                                                                                                                                        | —                                                                |

**Détails :**

- **Supprimer** les étapes A/B/C actuelles (lecture de tous les `coupon_redemptions`, choix du premier code libre, `update is_used`). Elles sont remplacées par l'étape 10 (F2).
- **`metadata` de l'entrée :**
  ```ts
  metadata: {
    ...metadata, // source, wilaya, client_request_id, consent sent by the client
    consent: { accepted: true, acceptedAt, policyVersion, locale }, // re-read and checked, not trusted blindly
    game_type: campaign.game_type,
    server_timestamp: new Date().toISOString(),
  }
  ```
- **Réponse (compatible avec l'ancienne page) :**
  ```ts
  { ok: true,
    entry: { id, redeemed_coupon_value }, // no longer the whole row (ip, phone, user agent…)
    prize: { id, name, win_message } | null,
    coupon: { code } | null,
    game_outcome: drawResult }
  ```
  Le rejeu (étape 3) renvoie la même forme, avec en plus `replayed: true`.
- **Chaque erreur a désormais un `code`**, et le message anglais d'aujourd'hui est gardé à côté (`error`) pour l'ancienne page.
- Nouvelle colonne interrogée pour la période : ajouter `start_date, end_date, game_type` au `select` de l'étape 5.
- L'étape 3 fait une requête indexée sur `(campaign_id, phone_number)` (index unique existant), puis filtre sur `metadata`. Aucun index nouveau n'est nécessaire.
- **Ordre de déploiement :** voir §10. Le consentement devient obligatoire : l'ancienne page, qui ne l'envoie pas, serait refusée. Il faut donc déployer cette fonction **après** la nouvelle page (B5.3).

**Critères d'acceptation :** tous les scénarios de B2.2 passent en local.

**Vérification :** `npx supabase functions serve select-prize`, puis `npm run backend:smoke` (B2.2)
**Commit :** `fix(Supabase): enforce consent, idempotent retries and atomic coupons in select-prize`

---

### B2.2 — Script de test de `select-prize`

**Objectif :** rejouer en une commande tous les cas limites de la participation, contre la pile locale.

**Fichiers :** `scripts/backend/select-prize-smoke.mjs`, `package.json` (script `backend:smoke`)
**Dépend de :** B2.1
**Durée :** 0,25 j

**Scénarios** (avec des campagnes de test créées au début du script avec la clé service_role, puis supprimées à la fin) :

| #   | Scénario                                                                    | Attendu                                                                                   |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| T1  | Sans `metadata.consent`                                                     | `400 CONSENT_REQUIRED`                                                                    |
| T2  | Téléphone `0212345678`                                                      | `400 INVALID_INPUT`                                                                       |
| T3  | Participation valide                                                        | `200`, `entry.id`, consentement stocké dans `metadata`                                    |
| T4  | Même `client_request_id` rejoué                                             | `200`, **même** `entry.id`, même coupon, `replayed: true`, une seule ligne dans `entries` |
| T5  | Même téléphone, nouveau `client_request_id`                                 | `400 ALREADY_PARTICIPATED`                                                                |
| T6  | Campagne en pause / hors période                                            | `CAMPAIGN_CLOSED`                                                                         |
| T7  | Hit It `hits` sous le seuil ×20 (`win_probability = 1`)                     | 0 gagnant, stock intact                                                                   |
| T8  | 10 participations **en parallèle** gagnantes à coup sûr (10 codes en stock) | 10 codes **tous différents**                                                              |
| T9  | Stock épuisé                                                                | `CAMPAIGN_CLOSED`                                                                         |
| T10 | Quiz : bonnes réponses / mauvaises réponses                                 | gagné possible / toujours perdu                                                           |

**Critères d'acceptation :** tout vert en local ; le script nettoie ses données.

**Vérification :** `npm run backend:smoke`
**Commit :** `chore(Backend): add a select-prize smoke test`

---

## Phase B3 — Adaptateurs Supabase (2 j)

> Tous les adaptateurs reçoivent un `SupabaseClient` en paramètre. Les tests utilisent un faux client (objet qui imite `rpc`, `from().select()…`, `functions.invoke`, `storage.from().upload`), sans réseau.

### B3.1 — `supabaseExperienceRepository`

**Objectif :** le port `ExperienceRepository` sur la table `campaign_experiences`.

**Fichiers :** `XP/services/supabase/supabaseExperienceRepository.ts`, `XP/services/supabase/supabaseExperienceRepository.test.ts`
**Dépend de :** B1.2
**Durée :** 0,5 j

**Spécification :**

```ts
export interface SupabaseExperienceRepositoryOptions {
  client: SupabaseClient;
  warn?: (message: string) => void;
}
export function createSupabaseExperienceRepository(
  options: SupabaseExperienceRepositoryOptions,
): ExperienceRepository;
```

| Méthode                               | Implémentation                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load(scope)`                         | `campaignId === null` → `null` (le mode autonome reste en local, B4.1). Sinon `from("campaign_experiences").select("config").eq("campaign_id", id).maybeSingle()`. Pas de ligne → `null`. Sinon `parseExperienceConfig(raw, scope.fallbackGameType)`, avec la même vérification de `campaignId` que `localExperienceRepository` (extraire cette partie commune dans une petite fonction partagée `repairLoadedConfig`). |
| `save(config, { expectedUpdatedAt })` | `rpc("save_experience_config", { p_campaign_id, p_config: config, p_expected_updated_at: expectedUpdatedAt ?? null })`                                                                                                                                                                                                                                                                                                  |
| `remove(scope)`                       | `from("campaign_experiences").delete().eq("campaign_id", id)`                                                                                                                                                                                                                                                                                                                                                           |

**Conversion des résultats de `save` :**

| Réponse                            | `SaveResult`                                           | Message (Studio, anglais)                                                                                                   |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `{ ok: true, config }`             | `{ ok: true, config }` (après `parseExperienceConfig`) | —                                                                                                                           |
| `CONFLICT`                         | `CONFLICT`                                             | message actuel du dépôt local                                                                                               |
| `TOO_LARGE`                        | `STORAGE_FULL`                                         | "This design is too large to save, usually because of embedded images. Replace them with uploaded images, then save again." |
| `NOT_FOUND`, `INVALID`, erreur RPC | `STORAGE_UNAVAILABLE`                                  | "The design could not be saved to the server. Check your connection and your access to this campaign, then retry."          |
| exception réseau                   | `STORAGE_UNAVAILABLE`                                  | idem                                                                                                                        |

- Le port **ne change pas** : les trois codes existants suffisent, et le Studio sait déjà afficher le message et « Retry ».
- `load` en échec réseau : **lever une erreur** plutôt que renvoyer `null`. Sinon le Studio partirait des valeurs par défaut et les enregistrerait par-dessus la vraie config. → `loadIntoStudio` doit rattraper l'erreur, et le Studio afficher « Could not load the saved design. Retry. » sans activer la sauvegarde automatique. **Petit changement Studio à prévoir dans B4.1.**

**Tests :** chargement vide, chargement réparé (avertissement), `campaignId` corrigé, `save` OK / `CONFLICT` / `TOO_LARGE` / erreur, `remove`, erreur réseau au chargement.

**Critères d'acceptation :** mêmes comportements que `localExperienceRepository.test.ts` pour les cas communs.

**Vérification :** `npx vitest run XP/services/supabase/supabaseExperienceRepository`
**Commit :** `feat(Player-Experience): add the Supabase experience repository`

---

### B3.2 — `supabaseParticipationGateway`

**Objectif :** la passerelle `live`. C'est la seule autorité sur le résultat en production.

**Fichiers :**

- `XP/services/supabase/selectPrizeMapping.ts` (conversions pures) + test ;
- `XP/services/supabase/supabaseParticipationGateway.ts` + test.

**Dépend de :** B2.1 (codes), mais doit aussi comprendre les réponses de l'ancienne version de la fonction (déploiement progressif, §10)
**Durée :** 0,75 j

**Spécification :**

```ts
export interface SupabaseParticipationGatewayOptions {
  client: SupabaseClient;
  availability: Availability; // from get_public_experience, read once at page load
  timeoutMs?: number; // default 15000
}
export function createSupabaseParticipationGateway(
  options: SupabaseParticipationGatewayOptions,
): ParticipationGateway; // mode: "live"

// selectPrizeMapping.ts: pure, fully unit-tested
export function toSelectPrizeBody(request: DrawRequest): SelectPrizeBody;
export function toDrawResult(response: SelectPrizeHttpResult): DrawResult;
```

**Requête (`toSelectPrizeBody`)** : la correspondance de `XP/services/supabase/README.md`.

| `DrawRequest`                                                        | Corps de `select-prize`                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `campaignId`                                                         | `campaign_id`                                              |
| `participant.phone`                                                  | `phone_number`                                             |
| `participant.fullName` / `email`                                     | `participant_name` / `participant_email`                   |
| `gamePayload` `quiz`                                                 | `game_payload: { answers }`                                |
| `gamePayload` `boxes`                                                | `game_payload: { selected_box_index }`                     |
| `gamePayload` `hitIt`                                                | `game_payload: { hits }`                                   |
| `gamePayload` `none`                                                 | `game_payload: {}`                                         |
| `context.sessionId`, `dwellTimeSeconds`, `userAgent`                 | `session_id`, `dwell_time_seconds`, `user_agent`           |
| `clientRequestId`, `consent`, `participant.wilaya`, `context.source` | `metadata: { client_request_id, consent, wilaya, source }` |
| `humanToken`                                                         | `metadata.human_token` (ignoré par le serveur dans ce MVP) |

**Réponse (`toDrawResult`)** — les codes d'abord, les anciens messages en repli :

| Réponse                                                                                                  | `DrawResult`                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200 { ok: true, entry, prize, coupon }`                                                                 | `{ ok: true, entryId: entry.id, outcome: { isWinner: !!prize, prize: prize && { id, name, winMessage: win_message }, couponCode: coupon?.code ?? null } }` |
| `code: ALREADY_PARTICIPATED`, ou message « already participated »                                        | `ALREADY_PARTICIPATED`                                                                                                                                     |
| `code: CAMPAIGN_CLOSED`, ou « Campaign not found. », « Campaign is not active. », « campaign is closed » | `CAMPAIGN_CLOSED`                                                                                                                                          |
| `code: INVALID_INPUT` / `CONSENT_REQUIRED`, ou `400` avec « phone » / « required »                       | `INVALID_INPUT`                                                                                                                                            |
| erreur réseau, délai dépassé, `5xx`, `DRAW_FAILED`                                                       | `NETWORK` (réessayable)                                                                                                                                    |
| tout le reste                                                                                            | `UNKNOWN` (réessayable)                                                                                                                                    |

- **Lire le corps d'une réponse d'erreur :** `supabase.functions.invoke` renvoie un `FunctionsHttpError` dont le corps est dans `error.context.json()`. Reprendre la logique de `extractInvokeErrorMessage` (`PlayerFlowPage.tsx:123-164`).
- **Un test par message serveur connu**, pour qu'un changement de texte côté serveur fasse échouer un test (exigé par `XP/services/supabase/README.md`).
- **Délai :** `AbortController` + `timeoutMs` → `NETWORK`. Le runtime propose alors « Retry » avec le **même** `clientRequestId`. Grâce à B2.1, le serveur renvoie le même résultat.
- `checkAvailability(campaignId)` → renvoie `options.availability` (pas de nouvel appel réseau).
- `confirmCoupon(entryId)` → `functions.invoke("confirm-coupon", { body: { entry_id } })` → `{ ok: true }`, sinon `NETWORK`/`UNKNOWN`.
- **Aucun** repli qui appelle la base directement (S5 ne doit jamais revenir).

**Tests :** chaque ligne des deux tableaux, délai dépassé, `confirmCoupon` OK/KO, `mode === "live"`.

**Vérification :** `npx vitest run XP/services/supabase/selectPrizeMapping XP/services/supabase/supabaseParticipationGateway`
**Commit :** `feat(Player-Experience): add the live participation gateway on select-prize`

---

### B3.3 — `supabaseAssetStorage` et compression partagée

**Objectif :** envoyer les images dans le bucket `campaign-media` au lieu de les garder dans la config (D6, I2).

**Fichiers :**

- `XP/services/imageCompression.ts` (nouveau : `fitWithin`, `browserImageCodec`, `compressImage`, sortis de `dataUrlAssetStorage.ts`) ;
- `XP/services/local/dataUrlAssetStorage.ts` (utilise le module partagé ; comportement inchangé) ;
- `XP/services/supabase/storageUrl.ts` (URL publique, fonction pure) ;
- `XP/services/supabase/supabaseAssetStorage.ts` + tests.

**Dépend de :** —
**Durée :** 0,5 j

**Spécification :**

```ts
export const EXPERIENCE_BUCKET = "campaign-media";
export function publicStorageUrl(
  supabaseUrl: string,
  bucket: string,
  path: string,
): string;
// → `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodePath(path)}`

export interface SupabaseAssetStorageOptions {
  client: SupabaseClient;
  supabaseUrl: string;
  organizationId: string;
  campaignId: string;
  codec?: ImageCodec;
}
export function createSupabaseAssetStorage(
  options: SupabaseAssetStorageOptions,
): AssetStorage;
```

- **Chemin :** `<organizationId>/experience/<campaignId>/<purpose>-<uuid>.<webp|png|jpg>`. Le 1ᵉʳ dossier **doit** être l'id de l'organisation, sinon la politique `campaign_media_org_insert` refuse l'envoi.
- `upload` : mêmes vérifications et même compression qu'aujourd'hui (`NOT_AN_IMAGE`, `UNREADABLE`), puis `storage.from(bucket).upload(path, blob, { contentType, cacheControl: "31536000", upsert: false })`.
  - La limite de ~400 Ko de `MAX_IMAGE_BYTES` peut passer à celle du bucket (5 Mo) pour ce seul adaptateur. On garde la même compression, qui reste utile pour les joueurs.
  - Échec de l'envoi → `UNREADABLE`, avec le message « The image could not be uploaded. Check your connection and try again. » Le port garde ses 3 codes.
- `resolveUrl` : `storage` → `publicStorageUrl` ; `dataUrl` / `remote` → l'URL telle quelle (les anciennes configs continuent de s'afficher).
- Les images qui ne servent plus ne sont **pas** supprimées dans ce MVP (§13).

**Tests :** chemin correct, type MIME, `resolveUrl` pour les 3 types, échec d'envoi, fichier non image. `dataUrlAssetStorage.test.ts` passe sans modification.

**Vérification :** `npx vitest run XP/services/supabase/supabaseAssetStorage XP/services/local/dataUrlAssetStorage`
**Commit :** `feat(Player-Experience): upload experience images to Supabase Storage`

---

### B3.4 — `supabaseAnalyticsTracker` (minimal)

**Objectif :** que les visites de la nouvelle page apparaissent dans les statistiques existantes, comme avec l'ancienne page.

**Fichiers :** `XP/services/supabase/supabaseAnalyticsTracker.ts` + test
**Dépend de :** —
**Durée :** 0,15 j

**Spécification :**

- `experience_viewed` → `rpc("record_campaign_impression", { p_campaign_id, p_session_id, p_user_agent, p_dwell_time_seconds: 0, p_game_played: false, p_form_completed: false })`.
- `form_submitted` → même RPC, avec `p_form_completed: true` et le temps passé depuis `experience_viewed`.
- Les autres événements sont ignorés. `select-prize` enregistre déjà l'impression « joué ». En développement, on garde la sortie `console` (`import.meta.env.DEV`).
- **Fire-and-forget :** la promesse n'est jamais attendue, toute erreur est avalée, et aucune donnée personnelle n'est envoyée.
- Le battement de cœur toutes les 5 s de l'ancienne page n'est **pas** repris (hors MVP).

**Vérification :** `npx vitest run XP/services/supabase/supabaseAnalyticsTracker`
**Commit :** `feat(Player-Experience): report player page views as campaign impressions`

---

### B3.5 — Compositions de services et API publique du module

**Objectif :** deux fonctions qui assemblent les bons adaptateurs, exportées par `index.ts`.

**Fichiers :** `XP/services/createSupabaseServices.ts` + test, `XP/services/createLocalServices.ts` (option `resolveStorage`), `XP/index.ts`, `XP/services/supabase/README.md`
**Dépend de :** B3.1–B3.4
**Durée :** 0,25 j

**Spécification :**

```ts
// Studio and sandbox: design saved to Supabase, draws still simulated (D3).
export function createStudioServices(options: {
  client: SupabaseClient;
  supabaseUrl: string;
  organizationId: string;
  campaignId: string;
  rules: DemoCampaignRules; // buildDemoRules(campaign, prizeTemplates)
}): ExperienceServices;
// = { repository: supabase, assets: supabase, participation: demo, analytics: console, humanVerification: noop }

// Public route: live gateway only.
export function createPublicServices(options: {
  client: SupabaseClient;
  supabaseUrl: string;
  availability: Availability;
}): ExperienceServices;
// = { repository: read-only stub (save → STORAGE_UNAVAILABLE), assets: resolve-only,
//     participation: live, analytics: supabase, humanVerification: noop }

// createLocalServices gains: resolveStorage?: (bucket, path) => string | null
```

- `index.ts` exporte `createStudioServices`, `createPublicServices`, `publicStorageUrl`, et les types `ExperienceServices` et `Availability`.
- Mettre à jour `XP/services/supabase/README.md` : « à écrire » devient « écrit », et lien vers ce plan.

**Critères d'acceptation :** `createPublicServices(...).participation.mode === "live"` ; `createStudioServices(...).participation.mode === "demo"`.

**Vérification :** `npm run verify`
**Commit :** `feat(Player-Experience): compose the Studio and public services on Supabase`

---

## Phase B4 — Studio et sandbox sur Supabase (1,5 j)

### B4.1 — Brancher le Studio et le sandbox

**Objectif :** le Studio (onglet `playerScreen`, route `/studio`) et le sandbox lisent et écrivent la config en base, pour les campagnes réelles. Le mode autonome (campagne démo) reste en `localStorage`.

**Fichiers :** `XP/studio/CampaignStudio.tsx`, `XP/studio/CampaignSimulator.tsx`, `XP/studio/PlayerExperienceStudio.tsx`, `XP/studio/loadIntoStudio.ts`, `XP/studio/layout/StudioShell.tsx` (état d'erreur de chargement), `src/App.tsx`, tests
**Dépend de :** B3.5
**Durée :** 0,5 j

**Détails :**

- `CampaignStudioProps` et `CampaignSimulatorProps` reçoivent `backend?: { client: SupabaseClient; supabaseUrl: string; organizationId: string }`.
  - Avec `backend` **et** une campagne réelle → `createStudioServices(...)`, recréé à chaque changement de campagne (`useMemo` sur `campaign.id`).
  - Sans `backend`, ou en mode autonome → `createLocalServices()` comme aujourd'hui. Les tests existants ne changent donc pas.
- `App.tsx` passe `backend={{ client: supabase, supabaseUrl: import.meta.env.VITE_SUPABASE_URL, organizationId }}` (`organizationId` vient de `useAuth()`).
- **Le sandbox utilise le même repository** que le Studio : il montre exactement le design enregistré.
- **Échec de chargement** (B3.1) : `loadIntoStudio` rattrape l'erreur. Le Studio affiche un bandeau « Could not load the saved design. » avec « Retry », et **désactive la sauvegarde automatique** tant que le chargement n'a pas réussi, pour ne jamais écraser la base avec les valeurs par défaut. (`useAutosave` reçoit `enabled`.)
- `onRefreshCampaign` (après le Wizard) ne recharge **pas** la config : elle n'est pas touchée par le Wizard (D1).

**Tests :**

- `CampaignStudio.test.tsx` : avec un faux `backend`, le repository appelé est celui de Supabase ; sans `backend`, c'est le local ;
- test du bandeau d'erreur de chargement, et absence de sauvegarde dans ce cas.

**Critères d'acceptation (manuel, en local) :**

- modifier un titre dans le Studio, recharger la page → le titre est gardé ;
- ouvrir la même campagne dans un 2ᵉ navigateur → même design ;
- modifier dans les deux → le second reçoit `CONFLICT` avec son message ;
- ouvrir le Wizard par « Edit in campaign settings », enregistrer → le design n'a pas bougé.

**Vérification :** `npm run verify`, puis le test manuel ci-dessus
**Commit :** `feat(Player-Experience): save the Studio design to Supabase`

---

### B4.2 — Images Storage dans l'aperçu `/xp-frame`

**Objectif :** que les images envoyées dans Storage s'affichent dans l'iframe d'aperçu (I3).

**Fichiers :** `XP/runtime/host/FrameExperience.tsx`, `XP/services/createLocalServices.ts`
**Dépend de :** B3.3, B3.5
**Durée :** 0,25 j

**Détails :**

- `FrameExperience` crée `createLocalServices({ …, resolveStorage: (bucket, path) => publicStorageUrl(import.meta.env.VITE_SUPABASE_URL, bucket, path) })`.
- **Règle d'architecture :** `runtime/` ne doit pas importer `services/supabase/`. `publicStorageUrl` est une fonction pure : la placer dans `XP/services/storageUrl.ts` (hors `supabase/`), réexportée par `services/supabase/`.
- Le Studio envoie déjà la config au cadre par le pont d'aperçu. Les `AssetRef` `storage` y arrivent tels quels, et le cadre les résout.

**Critères d'acceptation :** envoyer un logo et un fond dans le Studio → visibles dans l'aperçu, dans le sandbox et (après B5) sur `/play/:slug`.

**Vérification :** `npm run verify`, test manuel
**Commit :** `feat(Player-Experience): resolve Storage images in the preview frame`

---

### B4.3 — Import unique du `localStorage` vers Supabase

**Objectif :** ne pas perdre les designs déjà faits dans le Studio, qui n'existent que dans ton navigateur (I4).

**Fichiers :** `XP/services/supabase/importingExperienceRepository.ts` + test, `XP/services/createSupabaseServices.ts`
**Dépend de :** B4.1 ; B3.3 pour la conversion des images (optionnelle)
**Durée :** 0,25 j (+ 0,25 j **optionnel** pour convertir les images)

**Spécification :**

```ts
// Wraps the Supabase repository: on load, when the server has nothing and this browser has a
// configuration for the campaign, the local one is uploaded once, then served from the server.
export function createImportingExperienceRepository(options: {
  remote: ExperienceRepository;
  local: ExperienceRepository;
  convertAssets?: (config: ExperienceConfig) => Promise<ExperienceConfig>; // optional
}): ExperienceRepository;
```

- `load` : `remote.load` → s'il n'est pas `null`, on le renvoie. Sinon `local.load` → si ce n'est pas `null`, `convertAssets` (si fourni), puis `remote.save(config)` **sans** `expectedUpdatedAt`, et on renvoie la config enregistrée.
- La copie locale **n'est pas supprimée** (filet de sécurité). Un marqueur `xp:experience:imported:<campaignId>` évite de réimporter une config supprimée volontairement en base.
- **Optionnel — conversion des images :** chaque `AssetRef` `dataUrl` (`theme.background.image`, `brand.logo`, `game.scratch.coverImage`, `game.hitIt.targetImage`, `prizeDisplay[*].image`) est converti en `Blob`, envoyé par `supabaseAssetStorage.upload`, puis remplacé par la référence `storage`. Si un envoi échoue, l'image reste en `dataUrl` (elle s'affiche toujours).

**Critères d'acceptation :** une campagne éditée avant B4 retrouve son design au 1ᵉʳ chargement ; au 2ᵉ chargement, rien n'est réimporté.

**Vérification :** `npx vitest run XP/services/supabase/importingExperienceRepository`
**Commit :** `feat(Player-Experience): import designs saved in this browser into Supabase`

---

### B4.4 — Avertissement « campagne en ligne » dans le Studio _(optionnel)_

**Objectif :** puisque la publication est immédiate (D4), prévenir la marque que ses modifications sont vues tout de suite par les joueurs.

**Fichiers :** `XP/studio/layout/StudioTopBar.tsx` (ou `PreviewPane.tsx`), test
**Dépend de :** B4.1
**Durée :** 0,25 j

**Détails :** si `campaign.status === "active"`, afficher un badge discret dans la barre du haut, à côté de l'état de sauvegarde : « Live — changes are visible to players », avec l'icône `Radio` et une infobulle. Respecter `rules.md` §6 (qualité visuelle). Ajouter une section « Qualité visuelle » dans la fiche.

**Vérification :** `npm run verify`
**Commit :** `feat(Player-Experience): warn that Studio changes are live on active campaigns`

---

## Phase B5 — Route publique `/play/:slug` (1 j)

### B5.1 — Campagne fermée ou épuisée dès le chargement

**Objectif :** aujourd'hui, le runtime ne sait afficher « campagne terminée » **qu'après** un tirage refusé. Le joueur remplirait tout le formulaire pour rien. Le port prévoit déjà `checkAvailability` : on s'en sert au démarrage.

**Fichiers :** `XP/domain/flow.ts` (+ test), `XP/runtime/useExperienceFlow.ts` (+ test)
**Dépend de :** —
**Durée :** 0,25 j

**Détails :**

- Nouvel événement de la machine d'états : `{ type: "UNAVAILABLE"; reason: "CLOSED" | "SOLD_OUT" }`. Depuis `welcome` ou `register`, il mène à l'écran `closed`, avec l'erreur `CAMPAIGN_CLOSED` (message traduit existant).
- `useExperienceFlow` : au montage (et seulement sans écran forcé), `services.participation.checkAvailability(campaign.id)`. Si `open: false` → `dispatch UNAVAILABLE`. Une erreur est ignorée : le serveur tranchera au tirage.
- Profite aussi au Studio : la passerelle démo implémente déjà `checkAvailability` (stock démo épuisé → écran « terminé »).

**Critères d'acceptation :** tests de la machine d'états (`welcome` + `UNAVAILABLE` → `closed`) ; avec la passerelle démo sur une campagne en pause, l'écran `closed` s'affiche dès l'ouverture.

**Vérification :** `npx vitest run XP/domain/flow XP/runtime/useExperienceFlow`
**Commit :** `feat(Player-Experience): show a closed campaign before the player registers`

---

### B5.2 — Chargeur public et conversion en `CampaignSnapshot`

**Objectif :** transformer la réponse de `get_public_experience` en ce que le runtime attend, de façon validée.

**Fichiers :**

- `XP/domain/publicCampaign.ts` (pur, `zod`) + test ;
- `XP/domain/locale.ts` (`pickInitialLocale`) + test ;
- `XP/services/supabase/loadPublicExperience.ts` + test.

**Dépend de :** B1.2
**Durée :** 0,25 j

**Spécification :**

```ts
// domain/publicCampaign.ts: no Supabase import, raw JSON in, domain types out.
export type PublicExperience =
  | { status: "not_found" }
  | {
      status: "ok";
      campaign: CampaignSnapshot;
      slug: string;
      availability: Availability;
      config: ExperienceConfig;
      configIssues: string[];
    };
export function parsePublicExperience(raw: unknown): PublicExperience;
//  - campaign.rules: the same readNumber() rules as buildCampaignSnapshot (DEFAULT_RULES as fallback)
//  - status: active | paused | draft | archived; "ended" → "archived"
//  - experience: parseExperienceConfig(raw.experience, gameType) if present,
//    else createDefaultExperience({ gameType, campaign })
//  - invalid shape → throws (the page shows a technical error screen)

// domain/locale.ts
export function pickInitialLocale(
  locales: { default: Locale; enabled: Locale[] },
  browserLanguages: readonly string[],
): Locale; // first browser language that is enabled ("ar-DZ" → "ar"), else the default

// services/supabase/loadPublicExperience.ts
export async function loadPublicExperience(
  client: SupabaseClient,
  slug: string,
): Promise<PublicExperience>; // rpc("get_public_experience") + parsePublicExperience
```

- Le type `Availability` vit aujourd'hui dans `services/ports.ts`. Le **déplacer** dans `domain/participation.ts` et le réexporter depuis `ports.ts`, pour que `domain/` n'importe jamais `services/`.
- `CampaignSnapshot` ne contient toujours ni poids, ni stock, ni bonnes réponses.

**Tests :** réponse complète, `found: false`, config absente → valeurs par défaut, config abîmée → réparée avec `configIssues`, règles en chaînes (`"8"`), statut `ended`, choix de la langue (`["ar-DZ","fr"]` avec `enabled: ["fr","ar"]` → `ar`).

**Vérification :** `npx vitest run XP/domain/publicCampaign XP/domain/locale XP/services/supabase/loadPublicExperience`
**Commit :** `feat(Player-Experience): load and validate the public campaign experience`

---

### B5.3 — Nouvelle page `/play/:slug`

**Objectif :** les joueurs voient enfin le design du Studio, avec le vrai tirage.

**Fichiers :** `src/pages/play/PublicPlayPage.tsx` (nouveau), `src/AppRouter.tsx`, test `src/pages/play/PublicPlayPage.test.tsx`
**Dépend de :** B3.5, B5.1, B5.2, B4.2
**Durée :** 0,5 j

**Spécification :**

```tsx
// src/pages/play/PublicPlayPage.tsx: outside the module; imports only from its index.ts.
export default function PublicPlayPage() {
  // 1. slug from useParams
  // 2. loadPublicExperience(supabase, slug): loading → not_found | ok | error
  // 3. ok: services = useMemo(() => createPublicServices({ client: supabase, supabaseUrl, availability }))
  //        locale = pickInitialLocale(config.locales, navigator.languages)
  //        document.title = campaign.name
  //        <ServicesProvider services={services}>
  //          <PlayerExperience config={config} campaign={campaign} locale={locale}
  //                            allowedGatewayModes={["live"]} />
  //        </ServicesProvider>
}
```

| État                          | Affichage                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chargement                    | fond sombre plein écran (`100dvh`), petit indicateur centré, **aucun** texte de marque                                                               |
| `not_found`                   | « Campaign not found » en fr / ar / en, avec `dir="auto"` et Noto Sans Arabic (règle 5)                                                              |
| Erreur réseau / JSON invalide | « Something went wrong » + bouton « Retry » (rechargement du chargeur)                                                                               |
| `ok`                          | `PlayerExperience` **directement dans la page**, jamais dans le `div` d'une autre page (règle `CLAUDE.md`) ; campagne fermée → écran `closed` (B5.1) |

- **Route :** `<Route path="/play/:slug" element={<PublicPlayPage />} />`, chargée en différé (`lazy`). L'ancien `PlayerFlowPage` reste dans le code, mais n'est plus routé. Il est supprimé en B6.1, après la recette.
- Aucune passerelle démo ne peut être utilisée ici : `allowedGatewayModes={["live"]}`, et `createPublicServices` ne fabrique que `live`.
- Pas de badge « Demo » : il n'apparaît qu'avec une passerelle non `live`.

**Tests (faux client) :** chargement → `PlayerExperience` affiché ; slug inconnu → écran introuvable ; erreur → « Retry » ; passerelle en mode `live` vérifiée.

**Critères d'acceptation (manuel, en local, pour chacun des 5 jeux) :**

- le design du Studio s'affiche ;
- une participation passe par `select-prize` (visible dans le réseau) ;
- le coupon s'affiche et `confirm-coupon` est appelé ;
- un 2ᵉ essai avec le même numéro → écran « déjà participé » ;
- sur une campagne en pause → écran « terminé » dès l'ouverture.

**Vérification :** `npm run verify`, `npm run xp:responsive -- http://localhost:3000/play/<slug> --quick`
**Commit :** `feat(Player-Experience): serve /play/:slug with the new player runtime`

---

## Phase B6 — Nettoyage, déploiement et recette (1,75 j)

### B6.1 — Supprimer l'ancienne page joueur

**Objectif :** retirer le code qui contenait le repli client (S5) et la lecture des bonnes réponses (S6).

**Fichiers :** suppression de `src/pages/play/PlayerFlowPage.tsx`, `src/components/PhoneFrame.tsx`, `PlayerGame.tsx`, `PlayerHitIt.tsx`, `PlayerLanding.tsx`, `PlayerMysteryBox.tsx`, `PlayerQuiz.tsx`, `PlayerResult.tsx`, `PlayerScratch.tsx` ; types devenus inutiles dans `src/types.ts` (`BrandPreset`, `PlayerData`… **seulement** s'ils ne servent plus ailleurs) ; `src/lib/defaultImages.ts` s'il ne sert plus
**Dépend de :** B5.3 **et** la recette de B6.4 sur l'environnement `demo`
**Durée :** 0,25 j

**Détails :** avant chaque suppression, vérifier les imports par une recherche (`Grep`). Aujourd'hui, seul `PlayerFlowPage.tsx` importe ces composants.

**Vérification :** `npm run verify` ; recherche sans résultat de `PlayerFlowPage|PlayerLanding|PhoneFrame`
**Commit :** `chore(Player-Experience): remove the legacy player page`

---

### B6.2 — Fermer les lectures anonymes devenues inutiles

**Objectif :** puisque la page publique ne lit plus que `get_public_experience`, retirer les lectures anonymes directes des tables (P10–P12 de la sonde).

**Fichiers :** `supabase/migrations/<ts>_remove_anonymous_table_reads.sql`
**Dépend de :** B6.1 **déployé** (l'ancienne page utilisait ces politiques)
**Durée :** 0,25 j

**Spécification :**

```sql
DROP POLICY IF EXISTS "public_select_active_campaign_prizes" ON public.prizes;
DROP POLICY IF EXISTS "public_select_active_quiz_questions"  ON public.quiz_questions;
-- Manual cloud policies listed in audit/cloud-baseline.md (B0.1), e.g.:
DROP POLICY IF EXISTS "Public read active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Public read prizes for active campaigns" ON public.prizes;
```

- La liste exacte des politiques manuelles vient de l'audit de B0.1.
- Les politiques de `campaign_impressions` (insertion et mise à jour anonymes) restent : `record_campaign_impression` en a besoin. Leur durcissement est hors MVP (§13).

**Critères d'acceptation :** `npm run backend:probe -- --expect=secured` entièrement vert (P1–P15).

**Vérification :** `npx supabase db reset && npm run backend:probe -- --expect=secured`
**Commit :** `fix(Supabase): remove direct anonymous reads of campaigns, prizes and quiz answers`

---

### B6.3 — Documentation

**Objectif :** que la documentation dise la vérité sur le nouvel état.

**Fichiers :** `CLAUDE.md` (sections Player Portal, Player Experience, Edge Functions) ; `XP/README.md` (« Storage (MVP) », « Demo gateway only », « `/play/:slug` is not wired yet ») ; `XP/services/supabase/README.md` (« Server gaps » → corrigés) ; `docs/DATABASE_AND_TESTING_GUIDE.md` (sonde et script de test) ; index des fiches `tasks_docs/`
**Dépend de :** B6.1, B6.2
**Durée :** 0,25 j

**Points à écrire :**

- la table `campaign_experiences` et les deux RPC ;
- composition Studio (démo + Supabase) et composition publique (`live`) ;
- ordre de déploiement ;
- règle « toute nouvelle fonction SQL : `REVOKE … FROM PUBLIC, anon` puis `GRANT` explicite ».

**Commit :** `docs(Player-Experience): document the Supabase wiring`

---

### B6.4 — Déploiement et recette de bout en bout

**Objectif :** mettre en ligne dans le bon ordre (§10), puis dérouler la checklist du §11 sur l'environnement `demo`, puis sur `stable`.

**Dépend de :** toutes les tâches précédentes
**Durée :** 1 j

**Livrable :** `ai-assistance-prompts-reports/backend/tasks_docs/phase_B6/B6.4-recette.md`, avec pour chaque ligne du §11 : OK/KO, capture ou preuve (requête SQL, onglet réseau), et appareil utilisé.

**Commit :** `docs(Backend): record the end-to-end acceptance of the Supabase wiring`

---

## 9. Récapitulatif et chemin minimum

| Tâche     | Titre                             | Durée        |    Minimum strict    |       Optionnel       |
| --------- | --------------------------------- | ------------ | :------------------: | :-------------------: |
| B0.1      | Branche, pile locale, audit cloud | 0,25         |          ✅          |                       |
| B0.2      | Sonde de sécurité anonyme         | 0,25         |                      |                       |
| B1.1      | Fermer les failles anonymes       | 0,75         |                      |                       |
| B1.2      | `campaign_experiences` + RPC      | 0,75         |          ✅          |                       |
| B1.3      | Pas de tirage après un échec      | 0,25         |          ✅          |                       |
| B2.1      | `select-prize` durci              | 0,75         | ⚠️ consentement seul |                       |
| B2.2      | Script de test `select-prize`     | 0,25         |                      |                       |
| B3.1      | Repository Supabase               | 0,5          |          ✅          |                       |
| B3.2      | Passerelle `live`                 | 0,75         |          ✅          |                       |
| B3.3      | Images Storage                    | 0,5          |                      |                       |
| B3.4      | Analytics minimal                 | 0,15         |                      |                       |
| B3.5      | Compositions de services          | 0,25         |          ✅          |                       |
| B4.1      | Studio et sandbox sur Supabase    | 0,5          |          ✅          |                       |
| B4.2      | Images dans l'aperçu              | 0,25         |                      |                       |
| B4.3      | Import du `localStorage`          | 0,25 (+0,25) |                      | conversion des images |
| B4.4      | Avertissement « en ligne »        | 0,25         |                      |          ✅           |
| B5.1      | Fermée dès le chargement          | 0,25         |                      |                       |
| B5.2      | Chargeur public                   | 0,25         |          ✅          |                       |
| B5.3      | Nouvelle page `/play/:slug`       | 0,5          |          ✅          |                       |
| B6.1      | Suppression de l'ancienne page    | 0,25         |                      |                       |
| B6.2      | Fin des lectures anonymes         | 0,25         |                      |                       |
| B6.3      | Documentation                     | 0,25         |                      |                       |
| B6.4      | Déploiement et recette            | 1            |       ✅ (0,5)       |                       |
| **Total** |                                   | **≈ 9,35 j** |     **≈ 4,5 j**      |      **≈ 0,5 j**      |

**Chemin minimum strict** (le jeu marche avec le backend, mais **sans** fermer les failles) : B0.1 → B1.2 → B1.3 → B2.1 (consentement) → B3.1 → B3.2 → B3.5 → B4.1 → B5.2 → B5.3 → B6.4.

> ⚠️ Je le déconseille pour un lien public : sans B1.1, un visiteur peut toujours lire les téléphones, s'inscrire gagnant et vider le stock sans passer par `select-prize`. B1.1 + B0.2 ne coûtent qu'1 jour.

**Ordre recommandé :** B0.1 → B0.2 → B1.1 → B1.2 → B1.3 → B2.1 → B2.2 → B3.1 → B3.2 → B3.3 → B3.4 → B3.5 → B4.1 → B4.2 → B4.3 → B5.1 → B5.2 → B5.3 → (B4.4) → déploiement §10 → B6.1 → B6.2 → B6.3 → B6.4.

**Lots qu'on peut me confier d'un bloc** (si tu m'y autorises) : B1.1–B1.3 · B3.1–B3.5 · B5.1–B5.3.

---

## 10. Déploiement : ordre, compatibilité et retour arrière

Les Edge Functions et les migrations cloud se déploient **à la main** (`CLAUDE.md`). C'est toi qui lances les commandes.

### 10.1 Ordre

| Étape | Action                                                   | Commande                                                            | Pourquoi dans cet ordre                                                                                                                            |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Sauvegarde de la base cloud                              | tableau de bord Supabase → Database → Backups (ou `pg_dump`)        | Retour arrière possible                                                                                                                            |
| 2     | Migrations B1.1, B1.2, B1.3                              | `npx supabase link --project-ref <ref>` puis `npx supabase db push` | L'ancienne page marche encore après (elle passe par `select-prize`) ; la nouvelle a besoin des RPC                                                 |
| 3     | Vérifier le dashboard cloud                              | test manuel du tableau B1.1                                         | Détecter une régression causée par `SECURITY INVOKER`                                                                                              |
| 4     | Front avec la nouvelle page (B3–B5)                      | `npm run build` puis `firebase deploy --only hosting:demo`          | La nouvelle page envoie déjà le consentement et `client_request_id` ; elle comprend l'ancienne **et** la nouvelle version de `select-prize` (B3.2) |
| 5     | Recette sur `demo`                                       | §11                                                                 | —                                                                                                                                                  |
| 6     | `select-prize` durci (B2.1)                              | `npx supabase functions deploy select-prize`                        | Après l'étape 4 : le consentement devient obligatoire, et plus aucun client ne l'oublie                                                            |
| 7     | Recette de l'étape 6 sur `demo`                          | T1–T10 en conditions réelles, sur une campagne de test              | —                                                                                                                                                  |
| 8     | Front sur `stable`                                       | `firebase deploy --only hosting:stable`                             | —                                                                                                                                                  |
| 9     | Suppression de l'ancien code (B6.1), puis migration B6.2 | nouveau build + `db push`                                           | Seulement quand plus aucune version du front n'utilise les lectures anonymes directes                                                              |

### 10.2 Matrice de compatibilité

|                                      | Ancien `select-prize`                           | Nouveau `select-prize` (B2.1)                         |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| **Ancienne page** (`PlayerFlowPage`) | ✅ aujourd'hui                                  | ❌ refusée (pas de consentement) → ne jamais combiner |
| **Nouvelle page** (`PublicPlayPage`) | ✅ (pas d'idempotence, Hit It corrigé par B1.3) | ✅ cible                                              |

### 10.3 Retour arrière

| Problème                     | Action                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nouvelle page cassée         | Redéployer le build précédent sur Firebase (l'ancienne page revient) **tant que B2.1 n'est pas déployé** ; sinon, redéployer aussi l'ancienne version de `select-prize` (`git show <commit>:supabase/functions/select-prize/index.ts`) |
| Dashboard cassé après B1.1   | Remettre la fonction concernée en `SECURITY DEFINER` (`ALTER FUNCTION … SECURITY DEFINER`), sans rouvrir les droits anon, puis corriger selon le repli décrit en B1.1                                                                  |
| Studio : sauvegarde en échec | Le Studio garde les modifications non enregistrées et bloque la fermeture de l'onglet (déjà en place) ; la copie `localStorage` n'a pas été supprimée (B4.3)                                                                           |

---

## 11. Recette manuelle (checklist)

À faire sur un vrai téléphone Android (Chrome) **et** sur un ordinateur, en fr **et** en ar.

**Studio**

- [ ] Modifier le titre, le thème et le logo → recharger → tout est gardé.
- [ ] Même campagne ouverte dans 2 navigateurs → modification dans les deux → `CONFLICT` explicite dans le second, sans perte silencieuse.
- [ ] Wizard ouvert depuis le Studio → enregistrer → le design n'a pas bougé.
- [ ] Images envoyées → visibles dans l'aperçu, le sandbox et `/play/:slug` ; fichier présent dans Storage sous `<orgId>/experience/<campaignId>/`.
- [ ] Campagne éditée avant le branchement → design retrouvé (import).
- [ ] Sandbox : tirage toujours démo (`DEMO-…`), aucune ligne créée dans `entries`.

**Page joueur `/play/:slug`** (pour chacun des 5 jeux)

- [ ] Le design du Studio s'affiche ; sans design enregistré → valeurs par défaut propres.
- [ ] Consentement non coché → impossible de jouer.
- [ ] Participation → ligne dans `entries` avec `metadata.consent`, `client_request_id`, `source: "web_player"`.
- [ ] Gain → coupon affiché, « J'ai copié » → `coupon_confirmed = true`.
- [ ] Même numéro une 2ᵉ fois → écran « déjà participé ».
- [ ] Coupure réseau pendant le tirage (mode avion au bon moment) → « Retry » → **même** résultat, une seule entrée.
- [ ] Campagne en pause, hors période ou épuisée → écran « terminé » **dès l'ouverture**.
- [ ] Quiz : aucune bonne réponse visible dans l'onglet réseau.
- [ ] Hit It sous le seuil → toujours perdu.
- [ ] Slug inconnu → écran « introuvable ».
- [ ] Impression visible dans Analytics.

**Sécurité**

- [ ] `npm run backend:probe -- --expect=secured` entièrement vert en local.
- [ ] Contre le cloud, **lecture seule** : `from("entries").select()` avec la clé anon → 0 ligne ; `rpc("draw_and_claim_campaign_prize")` → refusé.

**Dashboard**

- [ ] Campaigns, Wizard, Participants, Analytics, Inventory fonctionnent comme avant.

**Technique**

- [ ] `npm run verify` vert.
- [ ] `npx supabase db reset` vert.
- [ ] `npm run xp:responsive -- http://localhost:4173/play/<slug> --quick` sans défaut (sur `vite preview`).

---

## 12. Risques et parades

| Risque                                                                                                     | Probabilité | Impact | Parade                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Base cloud différente des migrations (politiques manuelles)                                                | Élevée      | Moyen  | Audit B0.1 avant toute migration ; B6.2 supprime les politiques manuelles listées                           |
| Régression du dashboard après `SECURITY INVOKER`                                                           | Moyenne     | Élevé  | Tests B1.1 écran par écran ; repli `SECURITY DEFINER` + `is_org_member` par fonction ; retour arrière §10.3 |
| Ancienne page + nouveau `select-prize` déployés ensemble                                                   | Moyenne     | Élevé  | Ordre §10.1 et matrice §10.2                                                                                |
| Écrasement du design par les valeurs par défaut quand le chargement échoue                                 | Faible      | Élevé  | B3.1 lève une erreur au lieu de `null` ; B4.1 coupe la sauvegarde automatique                               |
| Configs lourdes (data URLs importées)                                                                      | Moyenne     | Moyen  | B3.3 + conversion optionnelle de B4.3 ; plafond de 2 Mo dans `save_experience_config`                       |
| Identifiant d'un lot changé (lot retiré puis remis dans le Wizard) → segment de roue ou affichage orphelin | Faible      | Faible | Déjà signalé par la validation du Studio ; ligne de recette                                                 |
| Modification visible tout de suite par les joueurs pendant une campagne                                    | Certaine    | Faible | B4.4 (avertissement) ; brouillon/publication après le MVP                                                   |
| Robot qui joue avec beaucoup de numéros                                                                    | Moyenne     | Moyen  | Hors MVP (captcha) ; la protection anti-doublon par téléphone reste active                                  |
| Stock perdu si l'insertion échoue après le tirage (F3)                                                     | Faible      | Faible | Accepté pour le MVP ; noté §13                                                                              |

---

## 13. Hors périmètre (après ce MVP)

- **Brouillon / publication** (`experience_draft` + `experience_published`) et historique des versions.
- **Captcha** (Turnstile) : `HumanVerification` + vérification dans `select-prize` (le champ `metadata.human_token` est déjà envoyé).
- **F3** : insérer l'entrée avant le tirage, dans une seule transaction (RPC `participate` côté SQL).
- **Nettoyage des images** qui ne servent plus dans Storage.
- **Table d'événements analytics** (entonnoir complet des `ExperienceEventName`).
- **Durcissement de `campaign_impressions`** (mise à jour anonyme limitée à sa propre session).
- **Colonnes dédiées** (consentement, wilaya) au lieu de `metadata`.
- **Bonus de partage** vérifié côté serveur.
- **Édition des lots et des questions dans le Studio** (reste dans le Wizard).
