# Phase 4 — Parcours et écrans : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../plan&tasks/tasks.md), tenue à jour du début à la fin de la tâche ([`rules.md`](../../rules.md), règle R2).

**Statuts :** En cours · Terminée · Bloquée

| Tâche | Titre                                | Statut   | Commit proposé                                                  | Documentation                                                                                  |
| ----- | ------------------------------------ | -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T4.1  | Hook de parcours et composant racine | Terminée | `feat(Player-Experience): wire flow state machine to services`  | [T4.1-hook-de-parcours-et-composant-racine.md](./T4.1-hook-de-parcours-et-composant-racine.md) |
| T4.2  | Écrans d'accueil et d'inscription    | Terminée | `feat(Player-Experience): add welcome and registration screens` | [T4.2-ecrans-d-accueil-et-d-inscription.md](./T4.2-ecrans-d-accueil-et-d-inscription.md)       |
| T4.3  | Écrans d'attente et de statut        | Terminée | `feat(Player-Experience): add resolving and status screens`     | [T4.3-ecrans-d-attente-et-de-statut.md](./T4.3-ecrans-d-attente-et-de-statut.md)               |
| T4.4  | Écrans de gain et de défaite         | Terminée | `feat(Player-Experience): add win and lose screens`             | [T4.4-ecrans-de-gain-et-de-defaite.md](./T4.4-ecrans-de-gain-et-de-defaite.md)                 |
| T4.5  | Tests du parcours complet            | Terminée | `test(Player-Experience): cover the full player flow`           | [T4.5-tests-du-parcours-complet.md](./T4.5-tests-du-parcours-complet.md)                       |

**Bilan :** phase terminée le 2026-09-23. Le parcours complet existe, du hook d'état (`useExperienceFlow`) jusqu'à ses huit écrans (accueil, inscription, jeu, attente, trois statuts non gagnants, gain, défaite), chacun avec son propre composant et ses tests. Les cinq scénarios que la passerelle peut renvoyer (gain, perte, déjà joué, campagne fermée, erreur réseau) sont verrouillés par un test de bout en bout à travers les vrais écrans, avant que la phase 5 y branche les moteurs de jeu. Commits : T4.1 à T4.5 faits.

Phase précédente : [phase 3 — Thème, mise en page adaptative et cadre à 8 slots](../phase_3/README.md). Phase suivante : [phase 5 — Moteurs de jeu et accroches de pregame](../phase_5/README.md).
