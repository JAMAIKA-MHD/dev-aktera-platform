# Plan — Reward Types & Inventory Logic (Reward Library)

> Issue : « Implement Reward Types & Inventory Logic ».
> Documents liés : `rules.md` (règles à respecter), `tasks.md` (tâches à cocher).
> Principe directeur : **MVP minimal**. On ajoute seulement ce qui manque, on ne réécrit rien de ce
> qui marche, mais on ne laisse pas de trou important (stock, expiration, sécurité) pour gagner du temps.

---

## 1. Le problème en deux phrases

La Reward Library (`/prizes`, composant `PrizesManager`) gère aujourd'hui un seul type de stock : des
codes numériques préchargés. Il manque l'**expiration** des codes, une gestion sûre de
l'**épuisement**, le **suivi de livraison** des lots physiques, et une place visible pour la
**bibliothèque partenaires** (Chargily, Gifty…), qui n'est pas encore branchée.

## 2. Ce qui existe déjà (à garder tel quel)

Lu dans le code et les migrations, **ne pas casser** :

| Élément                                                                                                | Où                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Catalogue de lots par organisation, `category` = `voucher` (code numérique) ou `physical`              | table `prize_templates` (+ `stock_quantity`)                                                                      |
| Codes préchargés, un par ligne (import CSV, génération, ajout manuel, détection de doublons)           | table `prize_template_items` (`item_value`, `is_used`, `redeemed_at`), `inventoryService.ts`, `PrizesManager.tsx` |
| Allocation d'un lot à une campagne, avec garde-fou « quantité demandée ≤ stock disponible »            | table `prizes` + trigger `enforce_prize_template_stock_allocation`                                                |
| Attribution **atomique** d'un code unique (`FOR UPDATE SKIP LOCKED`, `UNIQUE(prize_template_item_id)`) | RPC `claim_campaign_prize_coupon` (`service_role` seulement), table `coupon_redemptions`                          |
| Tirage côté serveur, jamais côté navigateur                                                            | RPC `draw_and_claim_campaign_prize` / `resolve_game_outcome`, Edge Function `select-prize`                        |
| Un gain **sans code** est déjà possible : l'entrée est gagnante et `coupon` vaut `null`                | `select-prize` (étape 10) → l'écran « You Won! » s'affiche                                                        |

Remarque : `src/components/InventoryManager.tsx` (1212 lignes) n'est importé nulle part : c'est du
code mort. On ne le touche pas dans cette issue (voir « Hors périmètre »).

## 3. Écarts constatés entre l'issue et le code

1. **Expiration** : aucune colonne de date sur les codes ; `claim_campaign_prize_coupon` peut
   donner un code périmé.
2. **Épuisement** : le tirage regarde `prizes.quantity - quantity_won`, **pas** le nombre de codes
   réellement disponibles. Si le brand a alloué 10 lots mais chargé 6 codes (ou si des codes ont
   expiré), le 7ᵉ gagnant est déclaré gagnant **sans code**, sans que personne ne le sache.
3. **Livraison** : rien n'enregistre si un lot physique a été remis. Les gagnants sont dans
   `entries`, mais sans statut.
4. **Partenaires** : aucune présence dans l'interface.

## 4. Décisions de conception (et pourquoi)

### 4.1 Rester sur `prize_templates` = la « Local Library »

Le modèle de données recommandé dans l'issue (`type` = `digital_code | partner_digital | manual |
physical_brand`, `quantity_reserved`, table de journal de fulfillment…) est une cible long terme.
Le recopier maintenant obligerait à réécrire la bibliothèque qui marche, ce que la note de l'issue
interdit. On **mappe** plutôt :

| Issue (modèle recommandé)  | MVP (existant)                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `digital_code`             | `prize_templates.category = 'voucher'` (inchangé)                                                                     |
| `physical_brand`           | `prize_templates.category = 'physical'` (inchangé)                                                                    |
| `partner_digital`          | **pas de donnée** : onglet « Coming soon » (UI seule)                                                                 |
| `manual`                   | non fait (pas demandé dans le périmètre)                                                                              |
| `quantity_total/remaining` | déjà couvert par `stock_quantity`, `quantity`, `quantity_won`                                                         |
| `expiry_date`              | **nouveau** : `prize_template_items.expires_at`                                                                       |
| `is_delivered`             | **nouveau** : `entries.delivery_status`                                                                               |
| Fulfillment log            | **reporté** : `coupon_redemptions` sert déjà de preuve d'attribution ; le journal n'a de sens qu'avec les partenaires |

### 4.2 Expiration : une date **par code**, optionnelle

`prize_template_items.expires_at timestamptz NULL`. `NULL` = n'expire jamais (comportement actuel,
donc aucun code existant ne change). Un code est **attribuable** si : valeur non vide, jamais
attribué, et `expires_at IS NULL OR expires_at > now()`. Cette règle est écrite **une seule fois**
dans une fonction SQL et utilisée par l'attribution **et** par le tirage.

L'expiration se règle : par code (tableau des codes) et en lot (« appliquer cette date à tous les
codes du lot » sans écraser une date déjà posée, sauf choix explicite). Un code expiré reste visible
dans le tableau, marqué « Expired », et n'est pas supprimé (trace).

### 4.3 Épuisement : le tirage ne doit plus désigner un lot sans code

Règle (appliquée dans les **deux** boucles de candidats du tirage, mode auto-pace et mode
probabilité) :

- lot **sans aucun code chargé** (le lot n'est pas un lot « à code », ex. un lot de message
  « You Won! » ou un lot physique) → reste éligible comme aujourd'hui ;
- lot **avec des codes chargés** mais **aucun attribuable** (tous utilisés ou expirés) →
  **exclu du tirage** ; si plus aucun lot n'est éligible, le joueur reçoit l'issue « perdu » standard.

Ainsi le joueur n'est jamais déclaré gagnant d'un code qui n'existe plus. Le cas « campagne sans
vraie récompense, juste l'écran You Won! » reste possible via un lot sans code (critère
d'acceptation déjà vrai, on le **prouve par un test** au lieu de le recoder).

Risque résiduel assumé : entre le tirage et l'attribution, le dernier code peut être pris par un
autre gagnant (fenêtre de quelques millisecondes). Dans ce cas, `select-prize` marque l'entrée
(`metadata.reward_unavailable = true`) pour que la marque la voie et la traite, et journalise. C'est
un compromis MVP explicite (voir questions ouvertes).

### 4.4 Livraison physique : un statut sur le **gain** (`entries`)

C'est le gagnant qui est livré, pas le lot. Colonnes ajoutées à `entries` :
`delivery_status text NOT NULL DEFAULT 'not_delivered' CHECK (… IN ('not_delivered','delivered'))`
et `delivered_at timestamptz NULL`. Valeur par défaut pour **toutes** les entrées : sans effet sur
les lots numériques ni sur les perdants.

La mise à jour passe par une RPC `set_entry_delivery_status(p_entry_id, p_status)` :
`SECURITY DEFINER`, `SET search_path = public`, `REVOKE` puis `GRANT EXECUTE` à `authenticated`
seulement, qui vérifie que l'appelant est membre **de l'organisation de l'entrée**, que son rôle
n'est pas `viewer`, et que l'entrée est gagnante d'un lot `physical`. Pas d'`UPDATE` direct côté
navigateur (la RLS actuelle de `entries` laisserait modifier d'autres colonnes).

Aucune logistique : pas d'adresse, pas de transporteur, pas de suivi de colis, pas d'email
(rien n'est collecté ni géré). Seulement un statut visible et modifiable.

### 4.5 Partenaires : interface seule

Dans la Reward Library, deux entrées : **Local Library** (tout l'existant) et **Partner Library**.
La seconde affiche une carte par partenaire (Chargily, Gifty) avec le badge « Coming soon », non
cliquable, sans appel réseau, sans table, sans variable d'environnement.

## 5. Impact par couche

| Couche                   | Changement                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL (1 migration)        | `prize_template_items.expires_at` ; `entries.delivery_status`, `delivered_at` ; fonction interne `is_code_assignable` ; remplacement de `claim_campaign_prize_coupon` (filtre expiration) ; filtre d'épuisement dans le tirage ; RPC `set_entry_delivery_status` |
| Edge Function            | `select-prize` : marquer l'entrée si l'attribution échoue pour un lot à codes ; rien d'autre                                                                                                                                                                     |
| Types / hooks / services | `types.ts` (`expiresAt`, `deliveryStatus`) ; `inventoryService.ts` (lecture/écriture de la date) ; un service `deliveryService.ts` (lecture des gagnants physiques, appel RPC)                                                                                   |
| UI (`PrizesManager`)     | sélecteur Local / Partner ; colonne et champ « Expiration » dans le tableau des codes ; compteurs « disponibles / expirés / utilisés » ; panneau « Winners & delivery » pour les lots physiques                                                                  |
| Tests                    | SQL (script de sonde), Vitest (service + composants), `backend:probe` étendu                                                                                                                                                                                     |
| Docs                     | mise à jour de `supabase/SEED.md` si le seed contient des codes ; ligne dans le runbook `deploiement.md`                                                                                                                                                         |

## 6. Ordre de livraison (détail dans `tasks.md`)

1. **Base** : migration unique (colonnes, fonction d'attribuabilité, claim filtré, tirage filtré, RPC livraison) + sonde SQL.
2. **Edge Function** : marquage `reward_unavailable` + test `backend:smoke`.
3. **Front données** : types, services, mapping.
4. **Front interface** : Local/Partner, expiration, livraison.
5. **Vérification** : `npm run verify`, `backend:probe`, parcours manuel complet.

Chaque étape est indépendante et déployable ; la 1 doit passer avant la 2 (ordre de déploiement du
runbook : base d'abord, puis fonction, puis front).

## 7. Hors périmètre (volontairement)

- Toute intégration d'API partenaire (Chargily, Gifty…), stock partenaire, journal de fulfillment.
- Logistique : adresses, transporteurs, notifications de livraison, statut intermédiaire « en cours ».
- Envoi de code par email / WhatsApp, `quantity_reserved`, nouvelle table de lots.
- Suppression du composant mort `InventoryManager.tsx` et découpage de `PrizesManager.tsx`
  (1617 lignes) : à traiter dans une issue de nettoyage, pas ici.
- Expiration du lot « code unique partagé » (`prize_templates.item_value`) : une seule valeur sans
  date ; comportement conservé.

## 8. Critères d'acceptation → comment on les prouve

| Critère de l'issue                                       | Preuve                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| La logique de codes existante est préservée              | Tests existants verts ; test SQL : 2 gagnants simultanés = 2 codes différents                    |
| Date d'expiration ; un code expiré n'est jamais attribué | Test SQL : lot avec un code expiré et un valide → toujours le valide ; seul expiré → pas de code |
| Épuisement géré sans risque                              | Test SQL : codes tous utilisés/expirés → le tirage ne désigne pas ce lot ; pas de doublon        |
| Campagne sans vraie récompense → « You Won! »            | Test : lot sans code → gagnant, `coupon: null`, l'écran résultat s'affiche                       |
| Partenaires « Coming soon »                              | Test composant : onglet Partner, badges, aucun appel Supabase                                    |
| Lots physiques avec statut de livraison modifiable       | Test RPC (membre OK, viewer refusé, autre organisation refusée) + test composant                 |
| Pas de logistique                                        | Revue : aucune colonne d'adresse/transporteur, aucune notification ajoutée                       |

## 9. Questions ouvertes (à trancher avec l'équipe, sans bloquer le démarrage)

1. **Dernier code pris entre tirage et attribution** : on marque l'entrée (plan actuel). Alternative
   plus stricte (annuler le gain et libérer `quantity_won`) = plus de SQL ; à décider si le cas se
   voit en production.
2. **Qui peut changer le statut de livraison** : plan = `owner`, `admin`, `manager` (pas `viewer`).
   À confirmer. Le correctif de sécurité sur les rôles (voir `analyse-organisations.md`) est un
   préalable pour que « pas `viewer` » ait un sens réel.
3. **Date d'expiration en lot sur import CSV** : seconde colonne optionnelle `expiry_date` dans le
   CSV, ou saisie après import ? Plan : saisie en lot après import d'abord (plus simple), colonne CSV
   seulement si le parseur reste lisible.
