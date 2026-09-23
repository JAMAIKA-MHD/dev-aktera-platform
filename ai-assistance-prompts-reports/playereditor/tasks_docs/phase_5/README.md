# Phase 5 — Moteurs de jeu et accroches de pregame : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../plan&tasks/tasks.md), tenue à jour du début à la fin de la tâche ([`rules.md`](../../rules.md), règle R2).

**Statuts :** En cours · Terminée · Bloquée

| Tâche | Titre                                | Statut   | Commit proposé                                                                                    | Documentation                                                                                  |
| ----- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T5.1  | Contrat et registre                  | Terminée | `feat(Player-Experience): add game engine and teaser contracts and registry`                      | [T5.1-contrat-et-registre.md](./T5.1-contrat-et-registre.md)                                   |
| T5.2  | Roue                                 | Terminée | `feat(Player-Experience): add wheel engine and teaser driven by configuration and server outcome` | [T5.2-roue.md](./T5.2-roue.md)                                                                 |
| T5.3  | Grattage                             | Terminée | `feat(Player-Experience): add scratch card engine and teaser`                                     | [T5.3-grattage.md](./T5.3-grattage.md)                                                         |
| T5.4  | Boîtes mystère                       | Terminée | `feat(Player-Experience): add mystery boxes engine and teaser`                                    | [T5.4-boites-mystere.md](./T5.4-boites-mystere.md)                                             |
| T5.5  | Quiz                                 | Terminée | `feat(Player-Experience): add quiz engine and teaser`                                             | [T5.5-quiz.md](./T5.5-quiz.md)                                                                 |
| T5.6  | Hit It                               | Terminée | `feat(Player-Experience): add hit it engine and teaser`                                           | [T5.6-hit-it.md](./T5.6-hit-it.md)                                                             |
| T5.7  | Contrôle responsive des 5 mécaniques | Terminée | `chore(Player-Experience): responsive check of all five mechanics`                                | [T5.7-controle-responsive-des-5-mecaniques.md](./T5.7-controle-responsive-des-5-mecaniques.md) |

**Bilan :** phase terminée le 2026-09-23. Les cinq mécaniques (roue, grattage, boîtes mystère, quiz, Hit It) ont chacune leur moteur, qui **reçoit** le résultat du serveur sans jamais le calculer, et leur accroche de pregame, dessinée avec le même composant que le jeu. Le point de validation n° 2 (T5.7) est passé : 5 280 tailles balayées en français et en arabe sans un défaut, redimensionnement en cours de partie sans remise à zéro, comparaison élément par élément avec le prototype. Les améliorations visées par `rules.md` §6.2 qui ne sont pas livrées sont listées dans T5.7, §7.

Phase précédente : [phase 4 — Parcours et écrans](../phase_4/README.md). Phase suivante : [phase 6 — Studio](../phase_6/README.md).
