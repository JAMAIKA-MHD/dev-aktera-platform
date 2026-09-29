# Phase B0 — Préparation : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                                                 | Statut               | Commit                                                                 | Documentation                                                                          |
| ----- | ----------------------------------------------------- | -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| B0.1  | Branche, pile Supabase locale et documents de travail | Terminée (`eef9ac2`) | `chore(Backend): prepare the local Supabase stack and the wiring plan` | [B0.1-branche-pile-locale-et-documents.md](./B0.1-branche-pile-locale-et-documents.md) |

**Bilan :** phase terminée le 2026-09-29.

- Branche `feat/player-experience-backend` créée.
- Pile locale vérifiée : 24/24 migrations appliquées.
- Base locale sauvegardée dans `supabase/.temp/backups/`.
- État de départ relevé : 0 erreur de lint (32 avertissements), typecheck OK, 883 tests verts, build OK.
- Décision importante : **pas de `db reset`** sans ton accord. Il effacerait les données locales et rendrait orphelins les designs du Studio rangés dans le navigateur. `rules.md` §6.4 et `tasks.md` ont été adaptés.

Phase suivante : [phase B1 — Base de données](../phase_B1/README.md).
