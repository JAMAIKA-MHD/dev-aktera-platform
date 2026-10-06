# Règles du branchement Supabase du Player Experience

**Date :** 2026-09-28
**Portée :** toutes les tâches de [`tasks.md`](./tasks.md) (B0.1 → B6.3), et toute autre tâche demandée dans le cadre de ce branchement.
**Statut :** en vigueur. Ces règles s'appliquent **à chaque tâche, sans exception**.

> **Les trois règles à retenir :**
>
> 1. **Documentation en français, code entièrement en anglais (R0).**
> 2. **Ne pas casser ce qui marche** : on améliore, on n'invente pas de nouveaux problèmes (R5).
> 3. **MVP : le minimum qui marche bien**, sans sur-ingénierie (R6).

---

## Sommaire

0. [Ordre de priorité et lecture obligatoire](#0-ordre-de-priorité-et-lecture-obligatoire)
1. [Règles de travail](#1-règles-de-travail)
2. [Règles Git et commits](#2-règles-git-et-commits)
3. [Ne pas casser ce qui marche](#3-ne-pas-casser-ce-qui-marche)
4. [MVP sans sur-ingénierie](#4-mvp-sans-sur-ingénierie)
5. [Règles de sécurité](#5-règles-de-sécurité)
6. [Règles Supabase (SQL, Edge Functions, déploiement)](#6-règles-supabase-sql-edge-functions-déploiement)
7. [Règles d'architecture (module Player Experience)](#7-règles-darchitecture-module-player-experience)
8. [Règles de code et de tests](#8-règles-de-code-et-de-tests)
9. [Modèle : documentation d'une tâche](#9-modèle--documentation-dune-tâche)
10. [Modèle : résumé de fin de tâche](#10-modèle--résumé-de-fin-de-tâche)
11. [Check-list avant de déclarer une tâche terminée](#11-check-list-avant-de-déclarer-une-tâche-terminée)

---

## 0. Ordre de priorité et lecture obligatoire

### Ordre de priorité en cas de conflit

1. **`CLAUDE.md`** (règles non négociables du projet) ;
2. **ce fichier `rules.md`** ;
3. **[`tasks.md`](./tasks.md)** (ce qu'il faut faire, tâche par tâche) ;
4. **[`plan-branchement-supabase-player-experience.md`](./plan-branchement-supabase-player-experience.md)** (référence technique : SQL, signatures, correspondances) ;
5. **[`diagnostic-…md`](./diagnostic-branchement-supabase-player-experience.md)** et **[`pipeline-final-…md`](./pipeline-final-player-experience.md)** (contexte).

`tasks.md` a **simplifié** le plan : des tâches y sont fusionnées, d'autres retirées. Quand les deux diffèrent, **`tasks.md` l'emporte**. Le plan reste la source des détails techniques que `tasks.md` ne répète pas.

Si deux documents se contredisent sur un point qui change le résultat, **je m'arrête et je te le signale** avant d'écrire du code.

### À relire au début de chaque tâche

| Document                                   | Ce que j'y relis                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `rules.md`                                 | Tout le fichier                                                                       |
| `tasks.md`                                 | La fiche de la tâche, ses dépendances, §0.3 (décisions) et §0.4 (retiré du périmètre) |
| Le plan                                    | Les sections citées par la fiche                                                      |
| `tasks_docs/`                              | Les documentations des tâches dont la tâche courante dépend                           |
| `src/features/player-experience/README.md` | Les règles du module, pour toute tâche qui touche `XP/`                               |

---

## 1. Règles de travail

### R0 — Langue : documentation en français, implémentation en anglais _(règle prioritaire)_

| En **français**                                           | En **anglais**, sans exception                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| la documentation des tâches (`tasks_docs/`)               | noms des fichiers et dossiers de code                                                   |
| les documents de `ai-assistance-prompts-reports/backend/` | identifiants : variables, fonctions, types, composants, tables, colonnes, fonctions SQL |
| les résumés de fin de tâche                               | commentaires dans le code et dans le SQL                                                |
| nos échanges                                              | noms et descriptions des tests                                                          |
|                                                           | messages d'erreur, de log, de console, codes d'erreur renvoyés par le serveur           |
|                                                           | libellés du Studio et du dashboard                                                      |
|                                                           | noms de scripts npm, messages de commit                                                 |

**Une seule exception : le contenu vu par le joueur.** Les textes affichés aux joueurs (par exemple « Campagne introuvable ») existent en **fr / ar / en**, comme **valeurs** dans des fichiers de contenu. Leurs clés et tout le code autour restent en anglais. Le contenu arabe utilise `dir="auto"` et la police Noto Sans Arabic (`CLAUDE.md`, règle 5).

### R1 — Exécution des tâches

1. Tu me donnes **une tâche** (« fais B1.2 ») ou **un lot** (« fais B1.1 à B1.3 », « fais la phase B3 »).
2. J'exécute les tâches **dans l'ordre de `tasks.md`**. À la fin de chaque tâche : vérification, documentation, **commit fait par moi** (R3).
3. J'enchaîne la tâche suivante **seulement si elle fait partie du lot demandé**. À la fin du lot, je m'arrête et je te donne le résumé.
4. **Je m'arrête avant la fin du lot si :**
   - une vérification échoue et que je ne peux pas la corriger dans le périmètre de la tâche ;
   - une tâche demande une action que toi seul peux faire (Supabase Cloud, Firebase, un téléphone réel) ;
   - je découvre un imprévu qui change le périmètre, ou une contradiction entre documents ;
   - une tâche risquerait de casser quelque chose qui marche (R5).

   Je te dis alors exactement ce qui bloque et ce que je propose.

5. **Pas de décision silencieuse.** Pour un choix mineur dans la fiche, je décide seul et je l'écris dans la documentation (§6 « Décisions »). Pour un choix qui change le périmètre, le schéma de la base ou un comportement visible, je te demande d'abord.

### R2 — Documentation par tâche

- **Un dossier par phase :** `ai-assistance-prompts-reports/backend/tasks_docs/phase_B<n>/`.
- **Une documentation par tâche :** `tasks_docs/phase_B<n>/<ID>-<titre-court-en-francais>.md` (par exemple `B1.2-table-du-design-et-lecture-publique.md`), suivant le modèle du §9.
- Elle est **créée au démarrage** de la tâche, avant le code, **mise à jour** à chaque étape importante, et **finalisée** avec les résultats **réels** des vérifications.
- Elle est **détaillée et pédagogique** : elle doit te permettre de comprendre le code sans le lire en entier (le rôle de chaque fichier, les extraits clés commentés, les décisions).
- L'**index de la phase** (`tasks_docs/phase_B<n>/README.md`) est mis à jour : statut de la tâche et hash du commit.
- Le tableau d'avancement de `tasks.md` §0.5 est mis à jour quand une **phase** change de statut.
- Prettier est lancé sur les fichiers Markdown créés, avant le commit (le hook `pre-commit` les reformaterait de toute façon).

### R3 — Commits : je commite moi-même

Tu m'autorises à commiter **seul, sans attendre ton feu vert**, à la fin de chaque tâche. Détail au §2.

### R4 — Honnêteté des résultats

- Je rapporte les résultats **tels qu'ils sont** : un test qui échoue est signalé avec sa sortie, une étape sautée est dite sautée, une vérification non faite n'est pas présentée comme faite.
- Une tâche dont les vérifications échouent **n'est pas commitée comme terminée**. Soit je corrige, soit je m'arrête et je te le dis (R1.4).
- Ce que je ne peux pas vérifier moi-même (un téléphone réel, le cloud) est listé dans « À vérifier par toi », avec la marche à suivre exacte.

---

## 2. Règles Git et commits

| Autorisé (sans te demander)                                           | Interdit                                                                                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git switch -c feat/player-experience-backend` (une seule fois, B0.1) | `git push` (quel que soit le remote)                                                                                                                |
| `git add <fichiers précis de la tâche>`                               | `git add -A` / `git add .` (risque d'embarquer un fichier sans rapport ou un secret)                                                                |
| `git commit` avec le message de la fiche                              | `--no-verify`, `--no-gpg-sign`, ou tout contournement des hooks                                                                                     |
| `git status`, `git diff`, `git log`, `git show`                       | `git commit --amend`, `rebase`, `reset`, `stash`, `merge`, `cherry-pick`, `checkout -- <fichier>`, `clean`, changement de branche en cours de route |
|                                                                       | commiter un fichier `.env*`, une clé, un mot de passe                                                                                               |

**Règles :**

1. **Un commit par tâche**, qui contient le code **et** sa documentation `tasks_docs/`.
2. **Message :** celui de la ligne « Commit » de la fiche `tasks.md`. Si le contenu réel de la tâche l'a fait évoluer, je l'adapte et je le justifie dans la documentation. Format :
   ```
   <type>(<scope>): <summary in English, imperative>

   <optional body: what changes and why, in English>

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
   - Types : `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.
   - Scopes : `Supabase` (base de données, Edge Functions), `Player-Experience` (module `XP/`, page joueur), `Backend` (scripts, documents du branchement).
3. **Avant chaque commit :** lint, typecheck, tests et build passent (`npm run verify` ; §8.6 pour les tests sur cette machine). Pour une tâche SQL, la migration est appliquée et rejouée sans erreur (§6.4). Sinon, pas de commit (R4).
4. **Si le hook `pre-commit` échoue :** je corrige la cause et je relance un **nouveau** `git commit`. Jamais `--amend`, jamais `--no-verify`.
5. Après le commit, je note son **hash** dans la documentation de la tâche et dans l'index de la phase. Ce changement de documentation part dans le commit de la tâche suivante, ou dans un petit commit `docs(Backend): …` en fin de lot.
6. **Le push reste à toi** : `git push -u origin feat/player-experience-backend`. Le hook `pre-push` relance `npm run verify`.

---

## 3. Ne pas casser ce qui marche

### R5 — Principe : on améliore, on ne crée pas d'autres problèmes

Ce qui fonctionne aujourd'hui doit fonctionner **à l'identique** après chaque tâche, sauf si la fiche dit explicitement le contraire.

### 3.1 Zones protégées (on n'y touche pas)

| Zone                                                                                                                    | Pourquoi                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wizard** (`src/components/CampaignWizard.tsx`) et son RPC d'enregistrement (contenu de `save_campaign_full_in_place`) | Il marche. Seuls ses **droits d'exécution** changent (B1.1)                                                                                                     |
| Écrans du dashboard : Campaigns, Participants, Analytics, Inventory, Billing, Settings                                  | Il marchent. Seul le repli « global » de `analyticsService.ts` est retiré (B1.1)                                                                                |
| Runtime joueur : écrans, cadre à 8 slots, jeux, animations, thème, responsive (`XP/runtime/` hors `host/`, `XP/theme/`) | Terminés et vérifiés sur toutes les tailles. Seule exception : `useExperienceFlow` (B5.1)                                                                       |
| Panneaux du Studio, validation, aperçu responsive (`XP/studio/panels/`, `validation/`, `preview/`)                      | Terminés                                                                                                                                                        |
| Domaine (`XP/domain/`)                                                                                                  | Stable et testé. Seuls ajouts permis : `flow.ts` (B5.1), `publicCampaign.ts` et `locale.ts` (B5.2), déplacement du type `Availability`                          |
| Adaptateurs locaux (`XP/services/local/`)                                                                               | Le mode autonome et la démo en dépendent. Seule exception : l'extraction de la compression d'image (B3.3), sans changer le comportement                         |
| `create-organization`, `confirm-coupon` (Edge Functions)                                                                | Ils marchent et ne sont pas concernés                                                                                                                           |
| Tables existantes : colonnes, index, contraintes                                                                        | Aucune colonne ajoutée, supprimée ou renommée. Le seul ajout au schéma est **une nouvelle table**, `campaign_experiences` (B1.2, validée par toi le 2026-09-29) |
| Anciennes migrations (`supabase/migrations/` existantes)                                                                | **Jamais modifiées.** On ajoute toujours une nouvelle migration                                                                                                 |
| Vite (`host 0.0.0.0`, port 3000), scripts npm existants, hooks Git                                                      | `CLAUDE.md`, règle 6                                                                                                                                            |

### 3.2 Fichiers existants que les tâches ont le droit de modifier

Uniquement ceux listés dans la fiche de la tâche. Toute modification d'un fichier existant **hors de cette liste** doit être :

1. nécessaire (sans elle, la tâche ne marche pas) ;
2. la plus petite possible ;
3. justifiée dans la documentation (§9 « Écarts »).

### 3.3 Garanties à chaque tâche

- **Les tests existants passent sans être modifiés.** Si un test existant doit changer, c'est parce que le comportement change volontairement ; je l'explique dans la documentation.
- **Le mode autonome du Studio** (sans campagne) et **le sandbox en démo** marchent toujours.
- **Aucun changement visuel** sur ce qui existe, sauf ce que demande la fiche.
- **Rétrocompatibilité :** un design déjà enregistré (`localStorage`, `schemaVersion: 1`) se charge toujours. Une image en `dataUrl` s'affiche toujours.
- **Ordre de déploiement respecté** (tasks.md B6.3) : à aucun moment, une version en ligne du front ne doit parler à une base ou à une fonction qui la refuse.
- **Un problème trouvé hors périmètre** est **noté** dans la documentation (§9 « Écarts »), **pas corrigé** au passage, sauf s'il bloque la tâche.

---

## 4. MVP sans sur-ingénierie

### R6 — Le minimum qui marche bien

| On fait                                                                                                                                                                         | On ne fait pas                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Ce que la fiche demande, complètement et proprement                                                                                                                             | Une fonctionnalité que la fiche ne demande pas « parce que ce sera utile plus tard » |
| Réutiliser ce qui existe : ports, `parseExperienceConfig`, `createDefaultExperience`, `select-prize`, `claim_campaign_prize_coupon`, bucket `campaign-media`, écrans du runtime | Recréer un mécanisme qui existe déjà                                                 |
| Une fonction simple, lisible, testée                                                                                                                                            | Une abstraction, une fabrique ou une option de configuration pour **un seul** usage  |
| Les 3 codes d'erreur existants de chaque port                                                                                                                                   | Ajouter des codes, des ports ou des types « au cas où »                              |
| Stocker les nouvelles infos dans `entries.metadata`                                                                                                                             | Créer une table ou une colonne sans décision explicite (§0.3 de tasks.md)            |
| Des messages d'erreur clairs pour l'utilisateur                                                                                                                                 | Des systèmes de retry, de cache, de file d'attente ou de journalisation élaborés     |

**Interdits sans ton accord explicite :**

- nouvelle **dépendance npm** (`@supabase/supabase-js`, `zod` et `vitest` sont déjà là, et suffisent) ;
- nouvelle **table** ou nouvelle **Edge Function** ;
- nouvelle **route** autre que celles de la fiche ;
- **changement d'un port** (`ports.ts`) au-delà de ce que la fiche indique.

**Une idée tentante mais hors périmètre ?** Je l'écris dans la section « Après le MVP » de la documentation de la tâche, et je ne la code pas.

---

## 5. Règles de sécurité

Elles traduisent les règles non négociables de `CLAUDE.md` pour ce travail.

| #   | Règle                                          | En pratique                                                                                                                                                                                                                 |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Le tirage est côté serveur uniquement** (N1) | Aucun code du front ne décide d'un gain, n'écrit dans `entries` ni n'appelle une fonction de tirage. La page publique n'accepte que la passerelle `live` (`allowedGatewayModes={["live"]}`). Aucun « repli » client, jamais |
| S2  | **RLS reste activé partout** (N2)              | Aucun `DISABLE ROW LEVEL SECURITY`. On ferme des accès, on n'en ouvre pas, sauf `get_public_experience` (champs sûrs)                                                                                                       |
| S3  | **Consentement strict** (N3)                   | Le front n'envoie rien sans consentement ; le serveur refuse sans consentement et garde la preuve                                                                                                                           |
| S4  | **Protection anti-doublon** (N4)               | L'index unique `(campaign_id, phone_number)` et la vérification `max_entries` restent ; l'idempotence ne les contourne pas (elle ne rejoue que **la même** tentative)                                                       |
| S5  | **Rien de secret vers le joueur**              | Jamais renvoyés au public : bonnes réponses, poids, quantités, probabilité, codes coupons des autres, `organization_id`, données des autres participants                                                                    |
| S6  | **Clé `service_role`**                         | Uniquement dans les Edge Functions et les scripts locaux. Jamais dans `src/`, jamais préfixée `VITE_`, jamais commitée                                                                                                      |
| S7  | **Nouvelle fonction SQL**                      | `SET search_path = public` ; `REVOKE ALL … FROM PUBLIC, anon, authenticated`, puis `GRANT EXECUTE` explicite au seul rôle voulu. `SECURITY DEFINER` seulement si nécessaire, et justifié en commentaire                     |
| S8  | **Données personnelles**                       | Jamais dans les statistiques ni dans les logs (`console.log` d'un téléphone, d'un nom, d'un email : interdit)                                                                                                               |
| S9  | **Isolation des organisations**                | Une marque ne lit et n'écrit que ses campagnes : c'est RLS qui le garantit, pas le front                                                                                                                                    |

---

## 6. Règles Supabase (SQL, Edge Functions, déploiement)

1. **Une migration par tâche SQL**, nommée `supabase/migrations/<AAAAMMJJHHMMSS>_<snake_case_english>.sql`, avec un horodatage **postérieur** à la dernière migration existante.
2. **Migrations idempotentes :** `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `DROP FUNCTION IF EXISTS`. Relancer la migration ne doit rien casser.
3. **Chaque migration commence par un commentaire en anglais** : ce qu'elle fait et pourquoi (référence à la tâche, par exemple `-- B1.2`).
4. **Vérification systématique, sans effacer la base locale :**
   - `npx supabase migration up` applique la nouvelle migration **sans toucher aux données** ;
   - puis la même migration est **rejouée une 2ᵉ fois**, sans erreur (preuve d'idempotence) :
     `Get-Content <fichier.sql> -Raw | docker exec -i supabase_db_mvp-octoreach psql -U postgres -d postgres -v ON_ERROR_STOP=1` ;
   - `npx supabase migration list --local` montre toutes les migrations appliquées.

   **`npx supabase db reset` est interdit sans ton accord explicite.** Le seed crée des identifiants aléatoires : un reset change l'identifiant de toutes les campagnes, supprime les comptes locaux (`admin@gmail.com`, `studio.test@octoreach.local`) et rend orphelins les designs du Studio rangés dans ton navigateur (constaté en B0.1). S'il devient nécessaire (vérifier toute la chaîne de migrations depuis zéro, en B6.1), je fais d'abord une sauvegarde (§6.9) et je te demande.

5. **Sauvegarde de la base locale** avant toute opération risquée : `pg_dump -Fc` dans `supabase/.temp/backups/` (dossier ignoré par git). La sauvegarde de départ est `local-before-backend-wiring-2026-09-29.dump`.
6. **Je ne touche jamais au cloud.** Aucune commande `supabase db push`, `supabase functions deploy`, `supabase link`, ni `firebase deploy` n'est lancée par moi. Je les écris dans le guide de mise en ligne (B6.3), et **c'est toi** qui les lances.
7. **Edge Functions :** testées en local avec `npx supabase functions serve` ; pas de nouvelle dépendance Deno ; mêmes en-têtes CORS qu'aujourd'hui.
8. **Réponses de `select-prize` rétrocompatibles :** chaque erreur garde son message `error` actuel et reçoit en plus un `code`.
9. **Données de test :** les scripts de vérification créent leurs propres données et les suppriment à la fin. Ils ne tournent **qu'en local** (ils refusent de démarrer si `VITE_SUPABASE_URL` n'est pas `http://127.0.0.1:54321` ou `http://localhost:54321`).

---

## 7. Règles d'architecture (module Player Experience)

Les règles du module (`XP/README.md`) restent en vigueur. En plus :

1. **Le reste de l'app importe seulement `XP/index.ts`** (ESLint le vérifie).
2. **`domain/` n'importe jamais Supabase**, ni `services/`, `runtime/`, `studio/`. Les conversions JSON → types du domaine y sont pures et validées par `zod`.
3. **`runtime/` n'importe aucun adaptateur concret** (`services/local/`, `services/supabase/`). Une fonction pure partagée (par exemple l'URL publique Storage) vit hors de ces dossiers.
4. **Les adaptateurs Supabase reçoivent le client en paramètre** (`client: SupabaseClient`) : ils n'importent pas `src/lib/supabase.ts`, et se testent avec un faux client, sans réseau.
5. **Les erreurs attendues sont des valeurs** (`{ ok: false, error }`), jamais des exceptions, comme les ports l'exigent. Exception documentée : `repository.load` lève une erreur en cas de panne réseau (B3.1), pour ne jamais écraser la base avec les valeurs par défaut.
6. **Le runtime s'affiche toujours dans un document à lui** : la page publique rend `PlayerExperience` directement, jamais dans le `div` d'une autre page (`CLAUDE.md`).
7. **Règles responsive et thème du runtime inchangées** : pas de `sm:`/`md:`/`lg:`, pas de tailles fixes en pixels, pas de `100vh`, pas de couleurs écrites en dur dans `runtime/`.
8. **Le Studio et le sandbox gardent la passerelle démo** : ils ne consomment jamais de vrai stock.

---

## 8. Règles de code et de tests

1. **TypeScript :** pas de `any` dans `XP/` (ni dans le code nouveau ailleurs) ; `unknown` + validation à l'entrée des données du serveur.
2. **Taille :** un fichier de plus de 250 lignes doit être découpé ; une fonction fait une seule chose.
3. **Style :** celui du code autour (nommage, densité de commentaires, organisation). Un commentaire explique le **pourquoi**, pas le quoi.
4. **Tests (Vitest) :**
   - chaque adaptateur et chaque fonction pure nouvelle a son test, dans le même dossier (`*.test.ts`) ;
   - chaque correspondance serveur → front (codes et messages de `select-prize`) a **un test par cas**, pour qu'un changement de texte côté serveur soit remarqué ;
   - pas de réseau dans les tests : faux client Supabase ;
   - les SQL et Edge Functions sont vérifiés par les scripts locaux de la fiche (`migration up`, 2ᵉ passage de la migration, script de vérification).
5. **Messages visibles :** en anglais pour le Studio et le dashboard ; fr / ar / en pour le joueur.
6. **Commandes de vérification** avant chaque commit : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (= `npm run verify`), plus les commandes propres à la fiche.
   - **Sur cette machine**, `npm test` peut échouer avec `Failed to start forks worker … Timeout waiting for worker to respond` : la machine est chargée (nombreux conteneurs Docker), et Vitest n'arrive pas à démarrer tous ses processus à temps. Ce n'est pas un échec de test. Dans ce cas, je relance avec `npx vitest run --maxWorkers=2` (état de départ en B0.1 : 77 fichiers, 883 tests, tous verts). Je rapporte les deux sorties.
   - Le lint compte **32 avertissements** déjà présents au départ (0 erreur) : une tâche ne doit pas en **ajouter**.
7. **Serveur de développement :** Vite recharge la page à chaque modification de fichier du dépôt. Pour une longue vérification visuelle, utiliser `npm run build` puis `npx vite preview --port 4173`. Un Vite resté ouvert s'arrête **par son port**, jamais en tuant tous les processus `node`.

---

## 9. Modèle : documentation d'une tâche

Fichier `tasks_docs/phase_B<n>/<ID>-<titre-court>.md`, créé au démarrage de la tâche et tenu à jour jusqu'à la fin (R2).

```markdown
# <ID> — <Titre de la tâche>

| Champ       | Valeur                                               |
| ----------- | ---------------------------------------------------- |
| Statut      | En cours · Terminée · Bloquée (raison)               |
| Phase       | B<n> — <nom de la phase>                             |
| Dépend de   | <IDs>                                                |
| Démarrée le | AAAA-MM-JJ                                           |
| Terminée le | AAAA-MM-JJ                                           |
| Fiche       | tasks.md, <ID> · plan, §<sections>                   |
| Commit      | `<type>(<scope>): <résumé>` — `<hash>` une fois fait |

## 1. Objectif

En deux ou trois phrases : ce que la tâche apporte, et pourquoi.

## 2. Avant / après

- **Avant :** comment ça marchait (avec les fichiers concernés).
- **Après :** comment ça marche maintenant.
- Un petit schéma si cela aide (qui appelle quoi, où va la donnée).

## 3. Plan de travail

- [ ] Étape 1
- [ ] Étape 2

## 4. Fichiers créés et modifiés

| Fichier | Créé / modifié | Rôle | Lignes |
| ------- | -------------- | ---- | ------ |

## 5. Le code expliqué

Pour chaque fichier important : son rôle en une phrase, les extraits clés commentés (ce que fait chaque
partie et pourquoi), ce qu'il exporte, les cas limites gérés. Pour le SQL : ce que fait chaque bloc, et
qui a le droit de l'exécuter.

## 6. Décisions et alternatives

| Décision | Alternative écartée | Raison |
| -------- | ------------------- | ------ |

## 7. Tests

| Fichier de test / script | Ce qu'il vérifie | Comment le lancer |
| ------------------------ | ---------------- | ----------------- |

## 8. Vérification

Commandes exécutées et résultat **réel** :

| Commande | Résultat |
| -------- | -------- |

**À vérifier par toi :** marche à suivre exacte (ou « rien »).

## 9. Non-régression

Ce qui marchait avant et a été revérifié (R5) : …

## 10. Écarts, imprévus et points d'attention

Ce qui diffère de la fiche, et pourquoi. Problèmes découverts hors périmètre (notés, non corrigés).

## 11. Après le MVP

Idées écartées pour rester minimal (R6), à reprendre plus tard (ou « aucune »).

## 12. Comment relire cette tâche

Les fichiers dans l'ordre de lecture conseillé, et les points à vérifier en priorité.

## Journal

- AAAA-MM-JJ HH:MM — Tâche démarrée, documentation créée.
- AAAA-MM-JJ HH:MM — <étape réalisée, décision, imprévu…>
- AAAA-MM-JJ HH:MM — Vérification : <résultat>. Statut → Terminée. Commit `<hash>`.
```

---

## 10. Modèle : résumé de fin de tâche

Donné dans la conversation à la fin de chaque tâche (ou regroupé à la fin d'un lot : un bloc par tâche).

```markdown
## <ID> terminée — <Titre>

**Ce que j'ai fait :** …

**Fichiers :** créés … · modifiés …

**Vérification :**

- `npm run verify` → …
- `npx supabase migration up` + 2ᵉ passage → … (tâches SQL)
- <commandes de la fiche> → …
- À vérifier par toi : … (ou « rien »)

**Non-régression :** … (ce qui a été revérifié)

**Écarts et points d'attention :** … (ou « aucun »)

**Documentation :** `tasks_docs/phase_B<n>/<ID>-<titre-court>.md`

**Commit :** `<hash>` — `<type>(<scope>): <résumé>`

**Suite :** <ID suivant> — <titre> (enchaîné si dans le lot, sinon j'attends ta demande).
```

---

## 11. Check-list avant de déclarer une tâche terminée

- [ ] La fiche de `tasks.md` est entièrement réalisée, critères d'acceptation compris, **et rien de plus** (R6).
- [ ] **Langue (R0) :** tout le code, le SQL, les tests et les messages sont en anglais ; la documentation est en français.
- [ ] **Non-régression (R5) :** tests existants verts sans modification injustifiée ; mode autonome et sandbox en démo toujours OK ; aucune zone protégée touchée.
- [ ] **Sécurité (§5) :** aucune règle S1–S9 enfreinte.
- [ ] **Vérifications** de la fiche lancées, résultats rapportés tels quels ; `npm run verify` vert (ou lint + typecheck + `vitest --maxWorkers=2` + build, §8.6) ; migration appliquée et rejouée sans erreur pour une tâche SQL ; aucun `db reset` sans ton accord.
- [ ] **Documentation** complète, journal à jour, statut `Terminée`, index de la phase à jour.
- [ ] **Aucun secret** et aucun fichier hors tâche dans les fichiers indexés (`git diff --cached --stat`).
- [ ] **Commit** fait avec le message de la fiche et la ligne `Co-Authored-By`, sans `--no-verify`, sans `--amend`, sans push.
- [ ] Résumé de fin de tâche donné (§10).
