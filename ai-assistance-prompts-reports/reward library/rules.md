# Rules — Reward Types & Inventory Logic

> À relire avant chaque tâche de `tasks.md`. En cas de conflit : ces règles > `tasks.md` > `plan.md`,
> et le `CLAUDE.md` du dépôt prime sur tout.

## A. Philosophie MVP

1. **Minimum obligatoire, mais jamais bâclé.** On ne fait que ce que l'issue demande, mais chaque
   morceau livré doit être correct : validé, testé, sûr. Un champ sans contrainte, un statut sans
   contrôle de rôle ou un stock sans garde-fou ne sont **pas** du « minimum », ce sont des dettes.
2. **Ne pas réécrire ce qui marche.** La logique de codes, l'import, la génération, l'allocation et
   l'attribution atomique restent. On **ajoute** (colonne, filtre, panneau), on ne remplace pas.
   Si une modification d'une fonction existante est nécessaire, elle est **la plus petite
   possible** et le reste de la fonction est recopié à l'identique.
3. **Pas d'anticipation.** Rien pour les partenaires au-delà de l'écran « Coming soon » : pas de
   table, pas de colonne, pas de type TypeScript « au cas où ».
4. **Pas de logistique.** Aucune adresse, aucun transporteur, aucun suivi, aucune notification de
   livraison. AKTERA n'affiche qu'un statut que la marque met à jour.
5. **Pas de nettoyage opportuniste.** Ne pas supprimer `InventoryManager.tsx`, ne pas découper
   `PrizesManager.tsx`, ne pas reformater de fichiers non concernés.

## B. Règles non négociables du projet (rappel)

6. **Le tirage et l'attribution de code restent côté serveur** (`draw_and_claim_campaign_prize`,
   `claim_campaign_prize_coupon`, `select-prize`). Le navigateur ne décide jamais d'un gain, d'un
   code, ni de l'expiration.
7. **RLS activée partout.** Toute nouvelle table aurait la RLS ; ici on n'en crée pas, on ajoute
   seulement des colonnes à des tables déjà protégées.
8. **Consentement et anti-doublon intacts** : aucune modification de ces contrôles dans
   `select-prize`.
9. **Libellés d'interface en anglais** ; documents en français ; code et commentaires en anglais.

## C. Base de données

10. **Une seule migration**, nommée `YYYYMMDDHHMMSS_reward_expiry_and_delivery.sql`, idempotente
    (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`). Aucun `DROP` de colonne ou de table.
11. **Toute nouvelle fonction SQL** : `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon,
authenticated`, puis `GRANT EXECUTE` explicite au seul rôle concerné :
    - `is_code_assignable` (interne) → `service_role` ;
    - `claim_campaign_prize_coupon` → reste `service_role` (re-`REVOKE`/`GRANT` après `CREATE OR REPLACE`) ;
    - `set_entry_delivery_status` → `authenticated` seulement.
12. **Valeurs par défaut sûres** : `expires_at` nullable (`NULL` = n'expire pas) ; `delivery_status`
    `NOT NULL DEFAULT 'not_delivered'` avec `CHECK`. Les lignes existantes doivent se comporter
    exactement comme avant.
13. **L'heure d'expiration se compare côté base avec `now()`**, jamais avec l'heure du navigateur.
    Stockage en `timestamptz` (UTC) ; l'interface affiche et saisit une date (fin de journée à
    Alger), voir tâche T4.2.
14. **Une seule définition de « code attribuable »** (`is_code_assignable`), utilisée par
    l'attribution et par le tirage. Interdit de dupliquer la condition dans plusieurs fonctions.
15. **Pas d'`UPDATE` direct sur `entries.delivery_status` depuis le navigateur.** Passage obligatoire
    par la RPC, qui contrôle : appelant authentifié, membre de l'organisation **de l'entrée**, rôle
    différent de `viewer`, entrée gagnante, lot de catégorie `physical`, valeur dans la liste.
16. **Ne pas élargir les droits** : aucun `GRANT` à `anon`, aucune politique `FOR ALL`, aucun
    `GRANT … ON ALL`.
17. **Ne pas exposer au joueur** le stock, les dates d'expiration, les codes restants, le statut de
    livraison (`get_public_experience` et la réponse de `select-prize` ne changent pas de forme).

## D. Edge Function `select-prize`

18. Changement limité à l'étape « coupon » : si le lot a des codes et que l'attribution ne renvoie
    rien, marquer l'entrée (`metadata.reward_unavailable = true`) et journaliser un avertissement.
    Les codes d'erreur existants et la forme de la réponse ne changent pas.
19. Le déploiement de l'Edge Function est **manuel** ; l'ordre est : migration, puis fonction, puis
    front (`deploiement.md`). Ne rien déployer sans demande explicite.

## E. Front

20. **Types d'abord** : mettre à jour `src/types.ts` et le mapping des hooks/services avant l'interface
    (`expiresAt`, `deliveryStatus`).
21. **Services = écritures et règles, composants = affichage.** Le nouveau code de livraison vit dans
    `src/services/deliveryService.ts`, pas dans `PrizesManager.tsx`. Les nouveaux morceaux d'interface
    sont de **petits composants dans leur propre fichier** (`src/components/rewards/…`) ; on ne
    grossit pas `PrizesManager.tsx` au-delà de l'ajout des points d'entrée.
22. **Style existant** : réutiliser les composants et classes déjà présents dans `PrizesManager`
    (boutons, badges, tableaux). Pas de nouvelle librairie, pas de nouveau système de design.
23. **Partner Library** : statique. Aucun appel réseau, aucune clé, aucun état. Cartes non cliquables
    avec badge « Coming soon ».
24. **Un code expiré est affiché mais jamais effacé** (badge « Expired »). L'interface ne calcule pas
    à elle seule ce qui est attribuable : elle affiche l'information fournie par les données ; le
    seul juge reste la base.
25. **États vides, chargement et erreur** gérés pour chaque nouvel écran (pas d'écran blanc).
26. **Accessibilité de base** : champs avec `label`, boutons avec nom accessible, statut de livraison
    modifiable au clavier.

## F. Tests (obligatoires pour chaque tâche qui change le comportement)

27. **SQL** : script de sonde exécutable sur la base locale (`npx supabase db reset` puis script) qui
    couvre : code expiré jamais attribué ; code valide attribué ; deux attributions concurrentes =
    deux codes différents ; lot épuisé exclu du tirage ; lot sans code toujours éligible ; RPC de
    livraison (membre OK, `viewer` refusé, autre organisation refusée, lot numérique refusé).
28. **`npm run backend:probe`** étendu : `anon` ne peut ni appeler `set_entry_delivery_status` ni
    `is_code_assignable`, ni lire `delivery_status`.
29. **Vitest** : service de livraison, mapping de l'expiration, composant Partner (badges, aucun
    appel), tableau des codes (badge expiré, saisie de date), panneau de livraison (changer le
    statut, erreur affichée).
30. **Non-régression** : les tests existants des inventaires et du tirage restent verts sans être
    modifiés (sauf si une assertion décrit explicitement l'ancien comportement erroné ; dans ce cas
    le dire dans le message de commit).
31. `npm run verify` doit passer avant tout commit de fin de tâche.

## G. Façon de travailler

32. **Une tâche = un commit, fait par Claude lui-même, sans demander la permission** (autorisation
    permanente donnée par l'utilisateur pour cette issue). Messages Conventional Commits :
    `feat(rewards): …`, avec les lignes d'attribution demandées par l'environnement. Le commit est
    fait dès que la tâche est terminée **et** vérifiée (règle 31). Chaque tâche a son fichier dans
    `P0/` … `P5/` avec le message de commit prévu.
    - Un commit ne contient **que** les fichiers de la tâche (`git add` explicite, jamais `-A`) ;
      les fichiers sans rapport (modifs en cours de l'utilisateur) restent intacts.
    - Les hooks (lint-staged, pre-push) ne sont jamais contournés (`--no-verify` interdit) : si un
      hook échoue, on corrige la cause et on refait un **nouveau** commit.
    - **Hors autorisation :** `git push`, déploiement Supabase/Firebase/Edge Function, création de
      merge request, `reset --hard`, suppression de branche. Ils restent soumis à une demande explicite.
33. **Cocher la tâche dans `tasks.md` et dans son fichier `Pn/Tn.m-….md`** quand elle est terminée et
    vérifiée, avec la commande de vérification lancée (la case cochée fait partie du même commit).
    Une case cochée = testée.
34. **Si une hypothèse du plan est fausse** (par exemple le tirage a été redéfini dans une migration
    plus récente), s'arrêter, noter l'écart dans `tasks.md` (section « Écarts rencontrés »), et
    adapter la tâche au lieu de contourner.
35. **Question ouverte = on décide par défaut et on le note**, on ne bloque pas le travail
    (`plan.md`, section 9).
