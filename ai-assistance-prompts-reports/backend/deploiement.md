# Guide de mise en ligne — Player Experience sur Supabase

**Date :** 2026-09-30
**Tâche :** B6.3 ([`tasks.md`](./tasks.md)) · **Règles :** [`rules.md`](./rules.md) §6.6 : **c'est toi qui lances chaque commande cloud**, jamais moi.
**Branche :** `feat/player-experience-backend` (dernier commit de code : `7d3291f`).

> **En une phrase :** on sauvegarde, on audite, on pousse les migrations compatibles, on met le nouveau front sur `demo` **puis** sur `stable`, et seulement ensuite la nouvelle `select-prize`. La fermeture des lectures anonymes part en dernier.

---

## Sommaire

0. [Avant de commencer](#0-avant-de-commencer)
1. [Sauvegarde](#1-sauvegarde)
2. [Audit de la base cloud](#2-audit-de-la-base-cloud)
3. [Migrations compatibles](#3-migrations-compatibles)
4. [Vérification du dashboard](#4-vérification-du-dashboard)
5. [Front sur `demo`](#5-front-sur-demo)
6. [Front sur `stable`](#6-front-sur-stable)
7. [Nouvelle `select-prize`](#7-nouvelle-select-prize)
8. [Recette sur `demo`](#8-recette-sur-demo)
9. [Fermeture des lectures anonymes](#9-fermeture-des-lectures-anonymes)
10. [Retour arrière](#10-retour-arrière)

---

## Vue d'ensemble

| Étape | Action                                                 | Commande principale                                         | Pourquoi à ce moment                                                            |
| ----- | ------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0     | Pousser la branche, préparer les accès                 | `git push -u origin feat/player-experience-backend`         | Le code déployé existe aussi sur le dépôt distant                               |
| 1     | Sauvegarde de la base et de `select-prize`             | `npx supabase db dump --linked …`                           | Retour arrière possible                                                         |
| 2     | Audit en lecture seule                                 | requêtes SQL (éditeur SQL du tableau de bord)               | Connaître les politiques ajoutées à la main avant de toucher à quoi que ce soit |
| 3     | Migrations B1.1, B1.2, B1.3 et la correction du coupon | `npx supabase db push` (**sans** la migration B6.2)         | L'ancien front marche encore après ; le nouveau en a besoin                     |
| 4     | Vérifier le dashboard en ligne                         | test manuel                                                 | Détecter une régression due à `SECURITY INVOKER` (B1.1)                         |
| 5     | Nouveau front sur `demo`                               | `npm run build` + `npx firebase deploy --only hosting:demo` | Le nouveau front comprend l'ancienne **et** la nouvelle `select-prize`          |
| 6     | Nouveau front sur `stable`                             | `npx firebase deploy --only hosting:stable`                 | **Avant** l'étape 7 : plus aucun front en ligne n'utilise l'ancienne page       |
| 7     | Nouvelle `select-prize` (B2.1)                         | `npx supabase functions deploy select-prize`                | Le consentement devient obligatoire : tous les fronts en ligne l'envoient déjà  |
| 8     | Recette sur `demo`, dont un vrai téléphone             | checklist                                                   | —                                                                               |
| 9     | Migration B6.2 (lectures anonymes)                     | `npx supabase db push`                                      | Seulement quand plus aucun front en ligne ne lit les tables directement         |

### Compatibilité (plan §10.2)

|                                      | Ancienne `select-prize`                              | Nouvelle `select-prize` (B2.1)                            |
| ------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------- |
| **Ancienne page** (`PlayerFlowPage`) | ✅ aujourd'hui                                       | ❌ refusée (pas de consentement) → **ne jamais combiner** |
| **Nouvelle page** (`PublicPlayPage`) | ✅ (sans rejeu idempotent ; Hit It corrigé par B1.3) | ✅ cible                                                  |

### ⚠️ Écart volontaire avec `tasks.md`

`tasks.md` (B6.3) met le front sur `stable` à la **fin** (étape 8), après la nouvelle `select-prize`. Entre les deux, `stable` servirait encore l'ancienne page, qui n'envoie pas le consentement : **toutes ses participations seraient refusées**. C'est interdit par `rules.md` §3.3 (« à aucun moment, une version en ligne du front ne doit parler à une fonction qui la refuse »), qui l'emporte sur `tasks.md`. Ce guide déploie donc `stable` à l'étape 6, **avant** `select-prize`.

**Hypothèse :** `demo` et `stable` utilisent **le même projet Supabase**. Si ce n'est pas le cas, fais les étapes 1 à 4, 7 et 9 pour chaque projet, chaque fois après le front qui lui parle.

---

## 0. Avant de commencer

**Ce qu'il te faut :**

- l'identifiant du projet Supabase (`<project-ref>`, dans l'URL du tableau de bord : `https://supabase.com/dashboard/project/<project-ref>`) et le **mot de passe de la base** ;
- la **clé anon** du projet cloud (tableau de bord → Project Settings → API) ;
- un compte Firebase avec accès au projet `octoreach-mvp` (`npx firebase login`) ;
- Docker démarré (`supabase db dump` s'en sert) ;
- un créneau calme : les étapes 5 à 7 se suivent en quelques minutes.

**Commandes :**

```powershell
git status                                         # propre, sur feat/player-experience-backend
git push -u origin feat/player-experience-backend  # le hook pre-push relance npm run verify
npx supabase login
npx supabase link --project-ref <project-ref>      # demande le mot de passe de la base
```

**À vérifier :** `git push` passe (le hook `pre-push` doit être vert) ; `npx supabase link` répond `Finished supabase link`.

**Retour arrière :** rien à défaire. `link` écrit seulement dans `supabase/.temp/`, ignoré par git.

---

## 1. Sauvegarde

```powershell
New-Item -ItemType Directory -Force supabase/.temp/backups | Out-Null
npx supabase db dump --linked -f supabase/.temp/backups/cloud-before-wiring-schema.sql
npx supabase db dump --linked --data-only -f supabase/.temp/backups/cloud-before-wiring-data.sql
npx supabase db dump --linked --role-only -f supabase/.temp/backups/cloud-before-wiring-roles.sql
```

**Garder aussi le code de `select-prize` actuellement en ligne :** tableau de bord → Edge Functions → `select-prize` → onglet **Code**. Copie le contenu dans `supabase/.temp/backups/select-prize-cloud-before-wiring.ts`.

⚠️ N'utilise **pas** `npx supabase functions download select-prize` : cette commande écrase `supabase/functions/select-prize/index.ts`, donc la nouvelle version du dépôt.

**À vérifier :**

- les 3 fichiers `.sql` existent et ne sont pas vides ;
- le fichier `.ts` contient bien `serve(` ;
- si ton offre Supabase a les sauvegardes automatiques (tableau de bord → Database → Backups), note la date de la dernière.

**Retour arrière :** rien à défaire (lecture seule).

---

## 2. Audit de la base cloud

Tableau de bord → **SQL Editor**. Lance ces requêtes **en lecture seule** (aucune n'écrit) et **colle-moi les résultats**, ou enregistre-les dans `ai-assistance-prompts-reports/backend/audit/cloud-baseline.md`.

```sql
-- A. Policies actually in place
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage') order by 1, 2;

-- B. Functions anon/authenticated can execute
select p.proname, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by 1;

-- C. Migrations applied in the cloud
select version, name from supabase_migrations.schema_migrations order by version;

-- D. The new table must not exist yet
select to_regclass('public.campaign_experiences') as campaign_experiences;

-- E. Storage bucket used by the Studio images
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'campaign-media';
```

**Ce que je vérifie avec toi, avant l'étape 3 :**

| Point                                                       | Attendu                                                                                         | Sinon                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| C : dernière migration                                      | `20260831151000` (tout le dépôt avant ce branchement)                                           | Des migrations plus anciennes manquent : on regarde ensemble, avant de pousser                                         |
| C : aucune migration inconnue du dépôt                      | aucune                                                                                          | `db push` refusera. **Ne lance pas `supabase migration repair` seul** : envoie-moi la liste                            |
| D                                                           | `null`                                                                                          | La table existe déjà : on s'arrête et on compare                                                                       |
| E                                                           | une ligne, `public = true`                                                                      | Le bucket manque : il faut la migration `20260702214554` (déjà dans le dépôt, donc poussée à l'étape 3 si elle manque) |
| A : politiques ajoutées à la main (absentes des migrations) | au plus « Public read active campaigns » et « Public read prizes for active campaigns »         | Je complète la migration B6.2 avec leurs vrais noms, dans un commit `fix(Supabase): …`, **avant** l'étape 9            |
| A : politiques anonymes sur `entries`                       | `select_entries_failsafe`, `public_insert_entries`, `anon_confirm_coupon` (supprimées par B1.1) | Un autre nom ouvre `entries` à anon : je l'ajoute à une migration, avant l'étape 3                                     |

**Retour arrière :** rien à défaire (lecture seule).

---

## 3. Migrations compatibles

On pousse les migrations **B1.1, B1.2, B1.3** et la **correction du coupon (B6.1)**. La migration **B6.2** reste de côté : `supabase db push` pousse tout ce qui manque, et on ne peut pas lui indiquer où s'arrêter.

| Migration                                              | Tâche | Effet                                                                                                                   |
| ------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `20260929120000_close_anonymous_access.sql`            | B1.1  | `entries` fermée à anon ; fonctions de tirage réservées à `service_role` ; fonctions du dashboard en `SECURITY INVOKER` |
| `20260929130000_add_campaign_experiences.sql`          | B1.2  | Table du design, `save_experience_config`, `get_public_experience`                                                      |
| `20260929140000_skill_games_never_draw_on_failure.sql` | B1.3  | Hit It ou quiz raté → jamais de tirage                                                                                  |
| `20260929150000_claim_coupon_without_duplicates.sql`   | B6.1  | Deux gagnants simultanés n'ont jamais le même code                                                                      |
| ~~`20260929160000_remove_anonymous_table_reads.sql`~~  | B6.2  | **Étape 9 seulement**                                                                                                   |

```powershell
# 1. Put the B6.2 migration aside (not committed: git status will show it as deleted)
Move-Item supabase/migrations/20260929160000_remove_anonymous_table_reads.sql supabase/.temp/

# 2. Check what would be pushed: exactly the 4 migrations above (+ older ones the audit found missing)
npx supabase db push --dry-run

# 3. Push
npx supabase db push

# 4. Put the B6.2 migration back, and check that the tree is clean again
Move-Item supabase/.temp/20260929160000_remove_anonymous_table_reads.sql supabase/migrations/
git status
```

**À vérifier :**

- `--dry-run` liste **exactement** les migrations attendues. Si une autre apparaît, ou si `20260929160000` est dans la liste, **stop** ;
- `db push` se termine par `Finished supabase db push` ;
- `git status` est propre après l'étape 4 ;
- dans le SQL Editor :
  ```sql
  select to_regclass('public.campaign_experiences');                              -- campaign_experiences
  select has_function_privilege('anon', 'public.draw_and_claim_campaign_prize(uuid, boolean)', 'EXECUTE'); -- false
  select has_function_privilege('anon', 'public.get_public_experience(text)', 'EXECUTE');                 -- true
  select version from supabase_migrations.schema_migrations order by version desc limit 4;               -- 150000, 140000, 130000, 120000
  ```
- **l'ancienne page marche encore** : sur `stable` (toujours l'ancien front), joue une partie sur une campagne de test active. La participation passe par l'ancienne `select-prize`.

**Retour arrière :** voir §10, lignes « Dashboard cassé après B1.1 » et « Migration à annuler ».

---

## 4. Vérification du dashboard

Sur le front actuellement en ligne (ancien front), connecté avec un compte de marque :

| Écran                  | Ce qu'on vérifie                                              |
| ---------------------- | ------------------------------------------------------------- |
| Campaign Radios        | Liste des campagnes ; ouvrir une campagne                     |
| Wizard                 | Modifier une campagne de test → « Apply & Save Changes » → OK |
| Analytics Desk         | Chiffres et liste des participants de **ton** organisation    |
| Reward Library (stock) | Modèles et stock affichés                                     |
| Billing & Quota        | S'affiche                                                     |

**À vérifier :** aucun écran vide ou en erreur, et aucune erreur rouge dans la console (F12).

**Retour arrière :** §10, ligne « Dashboard cassé après B1.1 ».

---

## 5. Front sur `demo`

⚠️ **Piège :** Vite lit `.env.local`, qui pointe sur la base **locale**, même pour `npm run build`. Il faut un fichier qui l'emporte pour la production : `.env.production.local`. Il est ignoré par git (règle `.env*`).

```powershell
# 1. Production values (once). Anon key = public key, safe in the bundle. Never the service_role key.
@'
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<cloud anon key>
VITE_REGISTRATION_ENABLED=<same value as the current production>
'@ | Set-Content -Encoding utf8 .env.production.local

# 2. Build
npm run build

# 3. The bundle must point to the cloud, never to the local stack
Select-String -Path dist/assets/*.js -Pattern '127\.0\.0\.1:54321' -List    # must print NOTHING
Select-String -Path dist/assets/*.js -Pattern '<project-ref>\.supabase\.co' -List | Select-Object -First 1   # must print a file

# 4. Deploy
npx firebase deploy --only hosting:demo
```

**À vérifier sur `demo`** (en navigation privée) :

1. Le dashboard s'ouvre et se connecte (reprends le tableau de l'étape 4).
2. **Studio** (Player Screen) sur une campagne de test : change le titre → « Saved ». Dans le SQL Editor : `select campaign_id, updated_at from campaign_experiences;` → une ligne.
3. **Image** : envoie un logo → il s'affiche dans l'aperçu. Storage → `campaign-media/<org>/experience/<campagne>/` : le fichier y est.
4. **Sandbox** : une partie → code `DEMO-…`, et **aucune** nouvelle ligne dans `entries`.
5. **`/play/<slug-de-test>`** : le design du Studio s'affiche, sans badge « Demo ». Joue une partie : elle passe par l'**ancienne** `select-prize` (compatible) ; gain → code ; « J'ai copié » → OK.

**Retour arrière :** redéploie le build précédent. Firebase → Hosting → site `octoreach-mvp-demo` → historique des versions → « Rollback » sur la version d'avant. Tant que l'étape 7 n'est pas faite, c'est sans risque.

---

## 6. Front sur `stable`

Le **même build** que l'étape 5, déjà vérifié :

```powershell
npx firebase deploy --only hosting:stable
```

**À vérifier sur `stable` :** dashboard connecté, `/play/<slug-de-test>` affiche la nouvelle page et une partie passe.

**Retour arrière :** rollback Firebase du site `octoreach-mvp-stable` (comme à l'étape 5). **Seulement tant que l'étape 7 n'est pas faite** : ensuite, l'ancienne page serait refusée par la nouvelle `select-prize`.

---

## 7. Nouvelle `select-prize`

**Condition :** les étapes 5 **et** 6 sont faites. Plus aucun front en ligne ne sert l'ancienne page.

```powershell
npx supabase functions deploy select-prize
```

**À vérifier :**

1. **Refus sans consentement.** Appel sans risque : le serveur refuse avant de lire la base.
   ```powershell
   $u = "https://<project-ref>.supabase.co"; $k = "<cloud anon key>"
   $body = '{"campaign_id":"00000000-0000-0000-0000-000000000000","phone_number":"0550000000","game_payload":{},"metadata":{}}'
   try { Invoke-RestMethod -Method Post "$u/functions/v1/select-prize" -Headers @{ apikey = $k; Authorization = "Bearer $k" } -ContentType "application/json" -Body $body }
   catch { $_.ErrorDetails.Message }   # → {"ok":false,"code":"CONSENT_REQUIRED",...}
   ```
2. **Une vraie partie sur `demo`**, campagne de test :
   - la réponse de `select-prize` (onglet réseau) contient `"ok":true` ;
   - dans `entries`, la ligne a `metadata.consent`, `client_request_id` et `source = "web_player"` ;
   - même numéro une 2ᵉ fois → « Vous avez déjà participé » (`code: "ALREADY_PARTICIPATED"`).

**Retour arrière :** redéploie l'ancienne version, gardée à l'étape 1. Copie temporairement `supabase/.temp/backups/select-prize-cloud-before-wiring.ts` à la place de `supabase/functions/select-prize/index.ts`, `npx supabase functions deploy select-prize`, puis remets le fichier du dépôt (`git restore supabase/functions/select-prize/index.ts`). À défaut de copie : `git show 97c8022:supabase/functions/select-prize/index.ts` (dernière version du dépôt avant B2.1). ⚠️ Si l'ancienne `select-prize` revient, l'**ancienne** page peut revenir aussi ; l'inverse est interdit.

---

## 8. Recette sur `demo`

Sur une campagne de test **active et dans sa période**, avec un lot et des codes :

1. **La checklist de la page joueur** ([`B6.1`](./tasks_docs/phase_B6/B6.1-recette-locale.md), §3.2) : les 5 jeux ; fr et ar ; consentement ; gain et « J'ai copié » ; doublon ; campagne en pause → « terminée » dès l'accueil ; slug inconnu → « introuvable ».
2. **Sur un vrai téléphone Android (Chrome)** : la même chose. Pour la coupure réseau, passe en mode avion juste après « Participer », reviens, puis « Réessayer » → **même** résultat, une seule ligne dans Analytics.
3. **Sécurité, contre le cloud, en lecture seule :**
   ```powershell
   $h = @{ apikey = $k; Authorization = "Bearer $k" }
   Invoke-RestMethod "$u/rest/v1/entries?select=id&limit=1" -Headers $h                  # → (empty)
   try { Invoke-RestMethod -Method Post "$u/rest/v1/rpc/draw_and_claim_campaign_prize" -Headers $h -ContentType "application/json" -Body '{"p_campaign_id":"00000000-0000-0000-0000-000000000000","p_quiz_passed":false}' }
   catch { $_.ErrorDetails.Message }                                                     # → permission denied (42501)
   ```
4. **Analytics** : la visite et la participation de test apparaissent.
5. **À surveiller** (B6.1 §5.1) : en local, des appels **simultanés** pouvaient renvoyer une erreur `500` à cause de la pile Docker. En ligne, si un joueur voit « Connexion échouée », « Réessayer » rejoue la même tentative. Note s'il y en a.

À la fin, **archive** (statut `ended`) la campagne de test. Ne la supprime pas si elle a des participations (dashboard).

**Retour arrière :** selon le défaut, voir §10.

---

## 9. Fermeture des lectures anonymes

**Condition :** l'étape 8 est validée, **et** la migration B6.2 contient les vrais noms des politiques manuelles trouvées à l'étape 2 (je l'ajuste si besoin).

```powershell
git pull                                  # if I committed an adjusted B6.2 migration meanwhile
npx supabase db push --dry-run            # must list ONLY 20260929160000_remove_anonymous_table_reads.sql
npx supabase db push
```

**À vérifier :**

```powershell
Invoke-RestMethod "$u/rest/v1/quiz_questions?select=id,correct_option_index" -Headers $h   # → (empty)
Invoke-RestMethod "$u/rest/v1/prizes?select=id,weight" -Headers $h                         # → (empty)
Invoke-RestMethod "$u/rest/v1/campaigns?select=id,win_probability" -Headers $h             # → (empty)
```

- `/play/<slug-de-test>` s'affiche toujours, sur `demo` **et** sur `stable` (elle ne lit que `get_public_experience`).
- Le dashboard montre toujours campagnes, lots et questions (politiques `select_org_*`).
- SQL Editor : `select policyname from pg_policies where roles @> array['anon']::name[] and tablename in ('campaigns','prizes','quiz_questions');` → aucune ligne.

**Retour arrière :** §10, ligne « Lecture anonyme à rétablir ».

---

## 10. Retour arrière

| Problème                                    | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nouvelle page cassée (étapes 5–6)           | Rollback Firebase de `demo` / `stable`, **tant que l'étape 7 n'est pas faite**. Après l'étape 7 : redéployer aussi l'ancienne `select-prize` (étape 7, retour arrière), **d'abord**                                                                                                                                                                                                                                                                                                     |
| Dashboard cassé après B1.1 (étape 3 ou 4)   | Pour la fonction en cause seulement : `ALTER FUNCTION public.get_campaign_participants(uuid, uuid) SECURITY DEFINER;` (idem pour `get_campaign_analytics_v2(uuid, uuid)` ou `save_campaign_full_in_place(…)`). **Sans** rouvrir les droits d'anon. Puis dis-le-moi : je corrige proprement (repli `is_org_member`, prévu par B1.1)                                                                                                                                                      |
| Hit It / quiz : tirage à rétablir (B1.3)    | Peu probable : la correction ne fait que supprimer des gains non mérités. Sinon, rejouer dans le SQL Editor la définition précédente, `supabase/migrations/20260831151000_resolve_game_outcome_rpc.sql`, **sans** sa dernière ligne (`GRANT … TO anon, authenticated, service_role`), suivie de `REVOKE ALL ON FUNCTION public.resolve_game_outcome(uuid, jsonb) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.resolve_game_outcome(uuid, jsonb) TO service_role;` |
| Coupon (B6.1) à rétablir                    | Rejouer la définition de `supabase/migrations/20260818150000_claim_prize_coupon_rpc.sql` **sans** sa dernière ligne (`GRANT … TO anon, authenticated, service_role`), puis `REVOKE ALL ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) TO service_role;`. Déconseillé : l'ancienne version peut donner le même code à deux gagnants                               |
| `select-prize` refuse des joueurs (étape 7) | Vérifier d'abord que `stable` et `demo` servent bien le nouveau front (Firebase → versions). Sinon, redéployer l'ancienne `select-prize` (étape 7, retour arrière)                                                                                                                                                                                                                                                                                                                      |
| Studio : sauvegarde en échec                | Le Studio garde les modifications non enregistrées et prévient avant de fermer l'onglet. Les anciens designs restent aussi dans le navigateur (B4.3). Vérifier la table `campaign_experiences` et le message de l'alerte « Not saved » (survol)                                                                                                                                                                                                                                         |
| Images du Studio refusées                   | Bucket `campaign-media` absent ou sans ses politiques : migration `20260702214554` (audit, point E)                                                                                                                                                                                                                                                                                                                                                                                     |
| Lecture anonyme à rétablir (étape 9)        | Seulement si un front en ligne sert encore l'ancienne page (ce qui ne devrait pas arriver). Recréer les politiques supprimées : pour les deux du dépôt, le SQL exact est dans `supabase/migrations/20260630150507_create_dzengage_rls_policies.sql` (lignes « public_select_active_campaign_prizes » et « public_select_active_quiz_questions ») ; pour les politiques manuelles, leur définition est dans le résultat de l'audit (étape 2, requête A)                                  |
| Tout annuler (base)                         | Dernier recours : restauration depuis les fichiers de l'étape 1 (ou la sauvegarde automatique Supabase). Les participations faites entre-temps seraient perdues : à décider ensemble                                                                                                                                                                                                                                                                                                    |

---

## Après la mise en ligne

- Dis-moi le résultat de chaque étape. Je note la recette en ligne dans la documentation de la phase B6.
- La branche peut ensuite partir en revue vers `develop` (pull request, par toi).
- `.env.production.local` peut rester sur ton poste : il est ignoré par git et ne contient que des valeurs publiques. **Jamais** la clé `service_role`.
