# Les statuts de la Reward Library — explication

Cette page reprend, telle quelle, l'explication donnée sur les statuts des codes : tous les cas possibles,
dans l'interface et dans la base de données.

Référence technique en anglais (même sujet, avec les requêtes SQL et les fichiers du code) :
`docs/REWARD_CODE_STATUSES.md`.

---

## Le principe : trois « statuts » qui ne veulent pas dire la même chose

| Où                                                      | Valeurs                                            | Ce que ça décrit                         |
| ------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Tableau des codes (page du reward)                      | **Prepared** / **Empty** / **Redeemed**            | l'état de la place                       |
| Export CSV, résumé « X available · Y used · Z expired » | **Available** / **Used** / **Expired** / **Empty** | l'état du code côté stock                |
| Lots physiques                                          | **Not delivered** / **Delivered**                  | la livraison, par gagnant (pas par code) |

**« Redeemed » / « Used » veut dire « donné à un gagnant ». Cela ne veut pas dire « utilisé en magasin ».**
AKTERA ne suit pas l'usage en magasin.

---

## Comment la base décide qu'un code est « donné »

Un code est « donné » dès qu'une ligne existe dans `coupon_redemptions` pour son id. C'est la source qui
fait foi. L'interface regarde en plus d'autres champs, qui ne prouvent pas la même chose :

| Champ en base                                   | Rôle réel                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coupon_redemptions` (une ligne par code donné) | **La preuve.** Créée par `claim_campaign_prize_coupon`. `UNIQUE(prize_template_item_id)` : un code ne peut être donné qu'une fois.                                         |
| `coupon_redemptions.expires_at`                 | L'échéance fixée à la remise (lot « après livraison »).                                                                                                                    |
| `coupon_redemptions.redeemed_by_player`         | Toujours `false` : rien ne le met à `true`. Champ mort.                                                                                                                    |
| `entries.redeemed_coupon_value`                 | Le code reçu par le gagnant. `NULL` si le lot n'a pas de code.                                                                                                             |
| `entries.coupon_confirmed`                      | Le joueur a cliqué « j'ai copié mon code » (Edge Function `confirm-coupon`). Rien à voir avec l'usage en magasin.                                                          |
| `prize_template_items.is_used` / `redeemed_at`  | Marqués par `select-prize` après l'attribution. **Doublon de la preuve** : l'interface les recalcule depuis `coupon_redemptions`, donc ce drapeau peut être désynchronisé. |
| `prize_template_items.item_value`               | Vide ou nul = place sans code.                                                                                                                                             |
| `prize_template_items.expires_at`               | Date propre au code.                                                                                                                                                       |
| `prize_templates.expires_at` / `expiry_days`    | Date du lot, ou durée après livraison (jamais les deux).                                                                                                                   |

L'interface considère un code comme donné si `coupon_redemptions` le contient, **ou** si un gain de
l'organisation a reçu exactement ce texte de code (`fetchTemplateItemsService`).

---

## Tous les cas d'un code de lot numérique

La date d'un code est, par priorité : sa date propre, puis l'échéance fixée à la remise, puis la date du lot.

| #   | Situation en base                                    | Tableau                                 | Export / résumé | Peut être donné ?                  | Colonne « Expires »                                                |
| --- | ---------------------------------------------------- | --------------------------------------- | --------------- | ---------------------------------- | ------------------------------------------------------------------ |
| 1   | `item_value` vide                                    | **Empty**                               | Empty           | non                                | « — »                                                              |
| 2   | Code, jamais donné, aucune date                      | **Prepared**                            | Available       | **oui**                            | vide                                                               |
| 3   | Jamais donné, date propre future                     | Prepared                                | Available       | oui                                | cette date                                                         |
| 4   | Jamais donné, date propre **passée**                 | Prepared + badge **Expired**            | **Expired**     | **non**                            | cette date                                                         |
| 5   | Jamais donné, pas de date propre, date du lot future | Prepared                                | Available       | oui                                | date du lot, « from reward »                                       |
| 6   | Idem, date du lot **passée**                         | Prepared + badge Expired                | Expired         | non                                | date du lot                                                        |
| 7   | Jamais donné, lot « 30 jours après livraison »       | Prepared                                | Available       | oui (le décompte n'a pas commencé) | « 1 month after delivery »                                         |
| 8   | **Donné**, aucune échéance                           | **Redeemed** (ligne rouge, verrouillée) | **Used**        | non (déjà pris)                    | vide                                                               |
| 9   | Donné, lot « après livraison »                       | Redeemed                                | Used            | non                                | échéance figée (fin du jour de remise + durée), « after delivery » |
| 10  | Donné, date propre ou date du lot                    | Redeemed                                | Used            | non                                | cette date                                                         |
| 11  | Cas 8 à 10 dont l'échéance est **passée**            | Redeemed + badge Expired                | **Used**        | non                                | échéance passée                                                    |

Règles à retenir :

- **« Used » l'emporte sur « Expired »** : un code donné dont l'échéance passe reste « Used » (la ligne garde
  son badge Expired).
- **Un code non donné n'expire jamais en mode « après livraison »** : le décompte démarre à la remise, et
  l'échéance est figée à ce moment. Modifier le lot ensuite ne la déplace pas.
- **Une date propre l'emporte** sur celle du lot, dans les deux sens.
- Le tirage exclut un lot dont les codes sont tous donnés ou expirés. Un lot **sans aucun code chargé** reste
  tirable : c'est le « You Won! » sans récompense.

---

## Le statut du gain (`entries`)

| Cas                                                                                          | `is_winner` | `redeemed_coupon_value` | Particularité                                                                     |
| -------------------------------------------------------------------------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------------- |
| Perdant                                                                                      | false       | null                    | pas de prix                                                                       |
| Gagnant d'un lot numérique                                                                   | true        | le code                 | une ligne dans `coupon_redemptions`                                               |
| Gagnant d'un lot numérique, mais le dernier code a été pris entre le tirage et l'attribution | true        | **null**                | `metadata.reward_unavailable = true` : à régler à la main                         |
| Gagnant d'un lot sans code (« You Won! »)                                                    | true        | null                    | normal, non marqué                                                                |
| Gagnant d'un lot **physique**                                                                | true        | null                    | `delivery_status` : `not_delivered` (défaut) puis `delivered` avec `delivered_at` |

Seule la fonction `set_entry_delivery_status` peut changer la livraison (membre de l'organisation, pas
`viewer`, lot physique, gain réel). Un trigger bloque toute modification directe.

---

## Ce que contenait la base locale au moment de l'analyse

| Cas                                            | Nombre de places |
| ---------------------------------------------- | ---------------- |
| Jamais donné, sans date (#2)                   | 384              |
| Jamais donné, avec une échéance (#3, #5 ou #7) | 111              |
| Place vide (#1)                                | 100              |
| Donné, sans échéance (#8)                      | 96               |
| Donné, avec une échéance (#9, #10 ou #11)      | 39               |

Cela fait **730 places** : 100 vides, 135 données et 495 encore disponibles. Les 135 codes donnés ont
`is_used = false` en base : le seed crée la preuve (`coupon_redemptions`) mais pas ce drapeau. C'est pour cela
que l'interface se base sur la preuve et pas sur le drapeau. Il y avait aussi 144 gagnants, tous
`not_delivered`, dont 9 sans code, et 0 gain confirmé par le joueur (`coupon_confirmed`).

---

## Trois incohérences trouvées en relisant

1. **Ordre des priorités différent.** Dans le tableau, « Redeemed » passe avant « Empty ». Dans l'export et le
   résumé, c'est « Empty » qui passe avant « Used ». Un code donné dont la valeur a été vidée à la main apparaît
   donc « Redeemed » dans le tableau et « Empty » dans l'export. L'interface empêche de vider un code donné,
   mais la base ne l'interdit pas.
2. **La détection par texte du code** compare avec tous les gains de l'organisation. Deux lots qui partagent le
   même texte de code se marquent mutuellement comme donnés. Elle ne regarde aussi que les 1000 premiers gains
   (limite de lecture), alors que la preuve par `coupon_redemptions` n'a pas cette limite.
3. **Deux champs morts** : `redeemed_by_player` et le drapeau `is_used`, qui peut se désynchroniser (par
   exemple si une participation est supprimée : le code redevient disponible, mais `is_used` reste à `true`).
