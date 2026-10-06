# Phase 1 — Domaine : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../plan&tasks/tasks.md), tenue à jour du début à la fin de la tâche ([`rules.md`](../../rules.md), règle R2).

**Statuts :** En cours · Terminée · Bloquée

| Tâche | Titre                                   | Statut   | Commit proposé                                                                          | Documentation                                                                                |
| ----- | --------------------------------------- | -------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| T1.1  | Langues et textes localisés             | Terminée | `feat(Player-Experience): add locale primitives for player content`                     | [T1.1-langues-et-textes-localises.md](./T1.1-langues-et-textes-localises.md)                 |
| T1.2  | Téléphone algérien                      | Terminée | `feat(Player-Experience): add Algerian phone normalization shared with server contract` | [T1.2-telephone-algerien.md](./T1.2-telephone-algerien.md)                                   |
| T1.3  | Types de jeux et moment du tirage       | Terminée | `feat(Player-Experience): declare game types and outcome timing table`                  | [T1.3-types-de-jeux-et-moment-du-tirage.md](./T1.3-types-de-jeux-et-moment-du-tirage.md)     |
| T1.4  | Types de la configuration               | Terminée | `feat(Player-Experience): define experience configuration types`                        | [T1.4-types-de-la-configuration.md](./T1.4-types-de-la-configuration.md)                     |
| T1.5  | Contrat de participation                | Terminée | `feat(Player-Experience): define participation contract mirroring select-prize`         | [T1.5-contrat-de-participation.md](./T1.5-contrat-de-participation.md)                       |
| T1.6  | Schéma de validation (zod)              | Terminée | `feat(Player-Experience): validate experience config with zod`                          | [T1.6-schema-de-validation-zod.md](./T1.6-schema-de-validation-zod.md)                       |
| T1.7  | Presets et contenus par défaut          | Terminée | `feat(Player-Experience): add theme presets, default copy and icon registry`            | [T1.7-presets-et-contenus-par-defaut.md](./T1.7-presets-et-contenus-par-defaut.md)           |
| T1.8  | Configuration par défaut                | Terminée | `feat(Player-Experience): generate default experience per game type`                    | [T1.8-configuration-par-defaut.md](./T1.8-configuration-par-defaut.md)                       |
| T1.9  | Migrations et import de l'ancien format | Terminée | `feat(Player-Experience): migrate legacy player screen config`                          | [T1.9-migrations-et-import-ancien-format.md](./T1.9-migrations-et-import-ancien-format.md)   |
| T1.10 | Machine d'états du parcours             | Terminée | `feat(Player-Experience): add player flow state machine`                                | [T1.10-machine-d-etats-du-parcours.md](./T1.10-machine-d-etats-du-parcours.md)               |
| T1.11 | Contrôle qualité du design              | Terminée | `feat(Player-Experience): add design validation and contrast checks`                    | [T1.11-controle-qualite-du-design.md](./T1.11-controle-qualite-du-design.md)                 |
| T1.12 | Branchement dans les types globaux      | Terminée | `feat(Player-Experience): expose experience config on campaign types`                   | [T1.12-branchement-dans-les-types-globaux.md](./T1.12-branchement-dans-les-types-globaux.md) |

**Bilan :** phase terminée le 2026-09-21, un commit par tâche. Le domaine (`src/features/player-experience/domain/`) est du TypeScript pur, couvert à 100 % en lignes, et vérifié en mode strict.

Phase précédente : [phase 0 — Préparation](../phase_0/README.md). Phase suivante : phase 2 — Services (pas encore commencée).
