# Tasks — Reward Types & Inventory Logic

> Cocher une case **seulement** quand la tâche est terminée et vérifiée (règle 33 de `rules.md`).
> **Chaque tâche est commitée par Claude lui-même, sans demander la permission** (règle 32) ; jamais de push
> ni de déploiement sans demande. Le détail de chaque tâche est dans `P0/` … `P5/` (un fichier par tâche).
> Ordre conseillé : P0 → P1 → P2 → P3 → P4 → P5. Chaque phase se termine par un commit.
> Légende des fichiers : `SQL` = `supabase/migrations/…`, `FN` = `supabase/functions/select-prize/index.ts`.

---

## P0 — Préparation (lecture seule, ~30 min)

- [x] **T0.1 Confirmer la définition actuelle du tirage.** Ouvrir la **dernière** définition de
      `draw_and_claim_campaign_prize` (la migration `20260831145100_…` la définit ; vérifier qu'aucune
      migration postérieure, ni `resolve_game_outcome`, ne la redéfinit). Repérer les **deux** boucles
      de candidats (mode auto-pace et mode probabilité) et l'endroit où `quantity_won` est incrémenté.
      Noter le résultat dans « Écarts rencontrés » en bas de ce fichier.
- [x] **T0.2 Confirmer l'écran concerné.** La Reward Library = `PrizesManager.tsx` (route `/prizes`).
      `InventoryManager.tsx` n'est importé nulle part : ne pas y travailler.
- [x] **T0.3 Repérer le tableau des codes** dans `PrizesManager.tsx` (recherche « Loading inventory
      codes from database ») et la liste des lots (catégories `voucher` / `physical`) pour savoir où
      ajouter l'expiration et le panneau de livraison.
- [x] **T0.4 Baseline.** Lancer `npm run verify` et noter l'état (tests verts avant de commencer).

---

## P1 — Base de données (une migration)

Fichier : `supabase/migrations/<timestamp>_reward_expiry_and_delivery.sql`

- [x] **T1.1 Colonnes.**
  - `prize_template_items.expires_at timestamptz NULL`.
  - `entries.delivery_status text NOT NULL DEFAULT 'not_delivered'` avec
    `CHECK (delivery_status IN ('not_delivered','delivered'))`.
  - `entries.delivered_at timestamptz NULL`.
  - Index partiel utile au tirage : sur `prize_template_items(prize_template_id)` filtré sur les
    codes non attribués si absent (réutiliser `idx_prize_template_items_available` s'il suffit).
- [x] **T1.2 Fonction `is_code_assignable`.** Fonction SQL `STABLE` `(p_item_id uuid)` ou version
      sur ligne : vrai si `item_value` non vide, aucune ligne dans `coupon_redemptions` pour cet
      item, et `expires_at IS NULL OR expires_at > now()`. `SET search_path = public`, `REVOKE`
      puis `GRANT EXECUTE` à `service_role` (règle 11).
- [x] **T1.3 Attribution filtrée.** `CREATE OR REPLACE FUNCTION public.claim_campaign_prize_coupon`
      en recopiant la version actuelle (`20260929150000_claim_coupon_without_duplicates.sql`) et en
      ajoutant **uniquement** la condition d'expiration dans la sélection (`FOR UPDATE SKIP LOCKED`
      conservé). Re-`REVOKE`/`GRANT` à `service_role`.
- [x] **T1.4 Tirage : exclure un lot à codes épuisé.** Dans les **deux** boucles de candidats, ajouter
      la règle du plan §4.3 : un lot est éligible si (a) son modèle n'a **aucun** code chargé, ou
      (b) il existe au moins un code attribuable. Recopier la fonction à l'identique pour le reste
      (règle 2). Ne pas changer sa signature ni ses `GRANT`.
- [x] **T1.5 RPC `set_entry_delivery_status(p_entry_id uuid, p_status text)`.** `SECURITY DEFINER`,
      `SET search_path = public`. Contrôles dans cet ordre : `auth.uid()` non nul ; statut dans la
      liste ; entrée trouvée et `is_winner = true` ; lot de catégorie `physical` (via
      `prizes → prize_templates`) ; appelant membre de `entries.organization_id` ; rôle ≠ `viewer`.
      Met à jour `delivery_status` et `delivered_at` (`now()` si `delivered`, `NULL` sinon).
      `REVOKE ALL … FROM PUBLIC, anon, authenticated` puis `GRANT EXECUTE … TO authenticated`.
      Messages d'erreur clairs et distincts (non autorisé / introuvable / pas un lot physique).
- [x] **T1.6 Application locale.** `npx supabase db reset` passe sans erreur ; le seed existant
      (`npm run db:seed`) fonctionne toujours.

### Tests de la phase (règle 27)

- [x] **T1.7 Script de sonde SQL** (`scripts/probe-rewards.sql` ou intégré à `backend:probe`) :
  - [ ] code expiré + code valide → l'attribution renvoie le valide ;
  - [ ] seul un code expiré → l'attribution ne renvoie rien ;
  - [ ] deux attributions concurrentes (deux sessions) → deux codes différents ;
  - [ ] tous les codes utilisés ou expirés → le tirage ne désigne jamais ce lot (boucler ≥ 200 tirages) ;
  - [ ] lot sans aucun code → toujours éligible (gagnant sans code possible) ;
  - [ ] `set_entry_delivery_status` : membre OK ; `viewer` refusé ; autre organisation refusée ;
        entrée perdante refusée ; lot numérique refusé ; `anon` refusé.
- [ ] **T1.8 Étendre `npm run backend:probe`** : `anon` ne peut appeler ni `set_entry_delivery_status`
      ni `is_code_assignable`.

**Commits :** un par tâche, messages dans les fichiers `Pn/` correspondants.

---

## P2 — Edge Function

- [ ] **T2.1 Marquer l'attribution manquée.** Dans `claimCoupon`/l'étape 10 de `select-prize` : si le
      gain est un lot **qui a des codes** et que l'attribution ne renvoie rien, mettre
      `metadata.reward_unavailable = true` sur l'entrée et `console.warn`. Pour un lot sans code,
      aucun changement (le « You Won! » sans récompense continue de marcher). Ne toucher ni aux
      codes d'erreur, ni à la forme de la réponse.
- [ ] **T2.2 Vérifier** avec `npx supabase functions serve --env-file .env.local` puis
      `npm run backend:smoke` : gain avec code, gain sans code, lot épuisé (pas de gain), rejeu avec
      le même `client_request_id` (réponse identique, `replayed: true`).

**Commits :** un par tâche, messages dans les fichiers `Pn/` correspondants.

---

## P3 — Front : types, services, données

- [ ] **T3.1 Types.** `src/types.ts` : `PrizeTemplateItem.expiresAt?: string | null` ; un type
      `DeliveryStatus = "not_delivered" | "delivered"` ; `PhysicalWinner` (id d'entrée, téléphone,
      nom du participant, nom du lot, date du gain, `deliveryStatus`, `deliveredAt`).
- [ ] **T3.2 Lecture/écriture de l'expiration.** `inventoryService.ts` et le hook
      `useInventoryManager.ts` : lire `expires_at`, le mapper en `expiresAt`, et ajouter deux
      fonctions : mettre à jour la date d'un code ; appliquer une date à tous les codes d'un lot
      (option « seulement ceux sans date »). Validation : date valide ; un avertissement (pas un
      blocage) si la date est passée.
- [ ] **T3.3 Compteurs de disponibilité.** Dans le mapping, calculer pour chaque lot : codes
      disponibles / utilisés / expirés (pour l'affichage uniquement). Ne pas changer le sens des
      champs existants (`availableStock`, `allocatedStock`…).
- [ ] **T3.4 `src/services/deliveryService.ts`.** (a) `fetchPhysicalWinners(organizationId, templateId?)` :
      lecture directe de `entries` (RLS par organisation) avec jointure sur `prizes` et
      `prize_templates` filtrée sur `category = 'physical'` et `is_winner = true`, triée par date ;
      (b) `setDeliveryStatus(entryId, status)` : appel de la RPC, erreur propagée avec un message
      lisible.
- [ ] **T3.5 Tests Vitest** : mapping de `expires_at`, service de livraison (succès, erreur RPC),
      date en lot (n'écrase pas une date existante par défaut).

**Commits :** un par tâche, messages dans les fichiers `Pn/` correspondants.

---

## P4 — Front : interface

Nouveaux composants dans `src/components/rewards/` ; points d'entrée minimaux dans `PrizesManager.tsx`
(règle 21).

- [ ] **T4.1 Sélecteur Local / Partner.** Deux onglets en haut de la Reward Library. « Local Library »
      affiche exactement l'écran actuel. « Partner Library » affiche `PartnerLibraryComingSoon`
      (nouveau composant) : cartes Chargily et Gifty, badge « Coming soon », texte court, rien de
      cliquable, aucun appel réseau.
- [ ] **T4.2 Expiration dans le tableau des codes.** Colonne « Expires » : date par code (champ date,
      vide = n'expire pas), badge « Expired » pour un code périmé (visible, non supprimé), ligne
      grisée. Saisie de la date = **fin de journée à Alger** (23:59:59, `Africa/Algiers`) convertie en
      UTC pour la base. Action « Set expiry for all codes » (option : seulement ceux sans date).
      Disponible pour les lots `voucher` uniquement.
- [ ] **T4.3 Résumé de stock du lot.** Dans la fiche d'un lot numérique : « X available · Y used ·
      Z expired », et un avertissement visible quand `available = 0` ou quand l'allocation d'une
      campagne dépasse les codes disponibles (« this reward will stop being drawn when codes run out »).
- [ ] **T4.4 Panneau « Winners & delivery ».** Pour un lot `physical` : liste des gagnants (nom,
      téléphone, date, statut) avec un sélecteur `Not delivered / Delivered` par ligne ; changement
      immédiat via `deliveryService` avec état de chargement par ligne, retour d'erreur lisible et
      annulation du changement affiché en cas d'échec. Masquer le contrôle (lecture seule) pour le
      rôle `viewer`. Mention fixe : « You handle delivery. AKTERA only records the status. »
      États vide / chargement / erreur gérés.
- [ ] **T4.5 Libellés.** Tous en anglais ; si le projet passe par `t()` pour cet écran, suivre le même
      usage, sinon rester cohérent avec le fichier.
- [ ] **T4.6 Tests Vitest/Testing Library** : onglet Partner (badges, `supabase` jamais appelé) ;
      tableau des codes (badge expiré, saisie de date, date en lot) ; panneau de livraison (changer le
      statut, rollback sur erreur, lecture seule pour `viewer`, état vide).

**Commits :** un par tâche, messages dans les fichiers `Pn/` correspondants.

---

## P5 — Vérification finale

- [ ] **T5.1** `npm run verify` (lint + typecheck + tests + build) vert.
- [ ] **T5.2** `npm run backend:probe` vert (anon et membre).
- [ ] **T5.3 Parcours manuel complet** (base locale, `npm run dev`) :
  1. créer un lot numérique avec 3 codes dont 1 expiré ; l'allouer à une campagne (quantité 3) ;
  2. jouer 3 fois : les 2 premiers gagnent un code **différent** et valide, le 3ᵉ ne gagne pas ;
  3. créer un lot sans code dans une autre campagne : le joueur gagne, l'écran « You Won! »
     s'affiche, aucun code ;
  4. créer un lot physique, gagner, ouvrir « Winners & delivery », passer à `Delivered`, recharger :
     le statut est conservé ; essayer avec un compte `viewer` : lecture seule ;
  5. onglet Partner Library : « Coming soon », rien de cliquable.
- [ ] **T5.4 Régression** : import CSV, génération de codes, détection de doublons, allocation à une
      campagne, détail d'une campagne et analytics fonctionnent comme avant.
- [ ] **T5.5 Documentation.** Ajouter au runbook `ai-assistance-prompts-reports/backend/deploiement.md`
      l'ordre de déploiement de cette migration (migration → Edge Function → front). Mettre à jour
      `supabase/SEED.md` seulement si le seed est modifié.
- [ ] **T5.6** Préparer la description de la merge request (changements, migration, compatibilité,
      comment tester). Ne pas pousser ni déployer sans demande.

---

## Écarts rencontrés

_(à remplir pendant le travail : tout fait qui contredit le plan, avec la décision prise)_

**T0.1 — Tirage.**

- Dernière **définition** de `draw_and_claim_campaign_prize` : `supabase/migrations/20260831145100_add_game_type_and_logic_config.sql` (lignes ~460-690). Aucune migration postérieure ne la redéfinit ; `20260929120000_close_anonymous_access.sql` fait seulement `ALTER … SECURITY INVOKER`, `REVOKE … FROM PUBLIC, anon`, `GRANT … TO authenticated, service_role`.
- Deux boucles de candidats : mode auto-pace (~l.529-554, condition `v_remaining_qty > 0 AND v_won_today < v_daily_limit_today`) et mode probabilité (~l.596-603, condition `(p.quantity - quantity_won) > 0`). `quantity_won` est incrémenté après le claim de `prize_inventory` (~l.661).
- `resolve_game_outcome` (redéfinie en `20260929140000_…`) **appelle** le tirage (elle ne le recopie pas).
- **Écart avec le plan :** la fonction est `SECURITY INVOKER` et exécutable par `authenticated` (le test du dashboard, `CampaignTestModal`, l'appelle). Donc (a) le `CREATE OR REPLACE` doit **garder `SECURITY INVOKER`** et refaire les mêmes `REVOKE`/`GRANT` ; (b) l'aide `is_code_assignable` doit être exécutable par `authenticated` **et** `service_role` (pas `anon`), en `SECURITY INVOKER` : un membre ne voit que les codes de son organisation (RLS). Règle 11 de `rules.md` adaptée en conséquence.

**T0.2 — Écran.** `/prizes` → `PrizesPage` → `PrizesManager.tsx` (« Reward Library »). `InventoryManager.tsx` n'est importé nulle part (code mort, non touché).

**T0.3 — Points d'insertion dans `PrizesManager.tsx`.**

- En-tête (« Reward Library » + bouton « Add Custom Reward », ~l.492-515) → sélecteur Local / Partner.
- Tableau des codes (~l.1366-1440, colonnes `#`, `Voucher / Unique Code`, `Status`, `Actions`) → colonne « Expires ».
- Cartes de lots (~l.740-790, `prize.category === "voucher" ? "Voucher" : "Item"`) et fenêtre de détail d'un lot → résumé de stock et panneau de livraison.
- **Écart avec le plan :** les lignes de codes sont en **snake_case** (`TemplateItemRow` dans `inventoryService.ts` : `item_value`, `is_used`, `redeemed_at`…). Le champ d'expiration sera donc `expires_at` dans `TemplateItemRow` (T3.1/T3.2), pas `expiresAt`. Le `select(...)` de `fetchTemplateItemsService` (l.~66) doit lister `expires_at`.

**T1.3 — Défaut existant corrigé.** Le repli de `claim_campaign_prize_coupon` lisait `prize_templates.item_value`, **colonne inexistante** : la fonction levait une erreur dès qu'aucun code n'était disponible (y compris pour un lot sans aucun code). `select-prize` avalait l'erreur (`coupon claim failed`) et renvoyait donc `coupon: null`, ce qui masquait le problème. Le bloc mort est retiré : la fonction renvoie proprement `NULL`. Le « code unique partagé » n'a donc jamais existé ; la ligne correspondante du « Hors périmètre » du plan est sans objet.

**T1.6 — Application locale.** `npx supabase db reset` : 1ʳᵉ exécution en échec sans détail (`error running container`, transitoire), 2ᵉ exécution (`--debug`) complète, migration appliquée ; `npm run db:seed` OK ; `npm run backend:probe` : 18/18.

**T1.5 / T1.7 — Contrôle ajouté.** La sonde a montré qu'un membre (même `viewer`) pouvait modifier `entries.delivery_status` **directement** (politique existante `update_org_entries`). Ajout d'un trigger `guard_entry_delivery_status` : seul `set_entry_delivery_status` (SECURITY DEFINER) peut changer ces deux colonnes. Écart avec le plan : la sonde est un script Node (`scripts/backend/rewards-probe.mjs`, `npm run backend:rewards`) et non un fichier SQL, pour tester la concurrence réelle (`Promise.all`) et des utilisateurs réellement connectés. Le trou plus large de `update_org_entries` (un membre peut modifier `is_winner`, `prize_id`…) existe déjà et sort du périmètre : à traiter avec le correctif de sécurité de `analyse-organisations.md`.

**T0.4 — Baseline `npm run verify` (2026-10-12, branche `feat/inventory-reward-library`).**

- Lint : 0 erreur, 6 avertissements existants. Typecheck : **1 erreur existante** `DeviceToolbar.tsx(5,33): Cannot find module './PhoneRotateIcon'`. Tests : **8 fichiers en échec à l'import (même cause), 1039 tests verts**. Build non lancé (arrêt au typecheck). Durée des tests : ~21 min en entier.
- Cause : un renommage `PhoneRotateIcon.tsx → ScreenRotationIcon.tsx` est **indexé (staged)** dans le dossier de travail, mais `DeviceToolbar.tsx` (commité) importe encore l'ancien nom. Ce travail (icône de rotation du Studio) n'appartient pas à cette issue : **non touché**. Mes commits n'incluent que mes fichiers (`git commit -- <fichiers>`).
- Conséquence : `npm run verify` est rouge pour une raison étrangère à l'issue. Critère utilisé pendant le travail : aucune erreur nouvelle par rapport à cette baseline (typecheck filtré, tests ciblés sur les fichiers modifiés).

## Questions ouvertes (reprises du plan, avec le choix par défaut)

| Question                                      | Choix par défaut                                   |
| --------------------------------------------- | -------------------------------------------------- |
| Dernier code pris entre tirage et attribution | Marquer l'entrée `reward_unavailable` (T2.1)       |
| Qui change le statut de livraison             | `owner`, `admin`, `manager` ; pas `viewer`         |
| Date d'expiration à l'import CSV              | Saisie en lot après import ; colonne CSV plus tard |
