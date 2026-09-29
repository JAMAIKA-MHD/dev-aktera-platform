# Phase B2 — Tirage serveur : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                 | Statut   | Commit                                                                                  | Documentation                                                |
| ----- | --------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| B2.1  | Durcir `select-prize` | Terminée | `fix(Supabase): enforce consent, idempotent retries and atomic coupons in select-prize` | [B2.1-durcir-select-prize.md](./B2.1-durcir-select-prize.md) |

**Bilan :** phase terminée le 2026-09-29. `select-prize` :

- exige le consentement et en garde la preuve ;
- renvoie la même réponse à une tentative rejouée ;
- attribue des codes coupons uniques, sous verrou ;
- vérifie la période de la campagne ;
- met un code sur chaque erreur.

`npm run backend:smoke` rejoue 11 scénarios de bout en bout (11/11) sur ses propres données, qu'il supprime ensuite.

**À retenir :**

- **Ordre de déploiement :** cette version ne doit être mise en ligne **qu'après** la nouvelle page joueur, car l'ancienne n'envoie pas de consentement.
- **Tirage existant sous forte simultanéité :** deux joueurs qui tirent au même instant peuvent voir l'un d'eux perdre (verrou `SKIP LOCKED`). Aucun code dupliqué ni stock perdu. Noté pour après le MVP.

Phase précédente : [phase B1 — Base de données](../phase_B1/README.md). Phase suivante : [phase B3 — Adaptateurs Supabase](../phase_B3/README.md).
