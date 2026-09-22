# Phase 2 — Services et adaptateurs locaux : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../plan&tasks/tasks.md), tenue à jour du début à la fin de la tâche ([`rules.md`](../../rules.md), règle R2).

**Statuts :** En cours · Terminée · Bloquée

| Tâche | Titre                                     | Statut   | Commit proposé                                                                    | Documentation                                                                                          |
| ----- | ----------------------------------------- | -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| T2.1  | Ports des services                        | Terminée | `feat(Player-Experience): declare service ports`                                  | [T2.1-ports-des-services.md](./T2.1-ports-des-services.md)                                             |
| T2.2  | Dépôt local de configuration              | Terminée | `feat(Player-Experience): add local experience repository`                        | [T2.2-depot-local-de-configuration.md](./T2.2-depot-local-de-configuration.md)                         |
| T2.3  | Moteur de tirage de démonstration         | Terminée | `feat(Player-Experience): add demo draw engine and entry store`                   | [T2.3-moteur-de-tirage-de-demonstration.md](./T2.3-moteur-de-tirage-de-demonstration.md)               |
| T2.4  | Passerelles de participation              | Terminée | `feat(Player-Experience): add demo and scripted participation gateways`           | [T2.4-passerelles-de-participation.md](./T2.4-passerelles-de-participation.md)                         |
| T2.5  | Images, analytics et vérification humaine | Terminée | `feat(Player-Experience): add asset storage, analytics and verification adapters` | [T2.5-images-analytics-et-verification-humaine.md](./T2.5-images-analytics-et-verification-humaine.md) |
| T2.6  | Composition et contexte des services      | Terminée | `feat(Player-Experience): compose local services and provider`                    | [T2.6-composition-et-contexte-des-services.md](./T2.6-composition-et-contexte-des-services.md)         |

**Bilan :** phase terminée le 2026-09-21, un commit par tâche. Les services du MVP (`src/features/player-experience/services/`) implémentent les 5 ports ; tout leur code est couvert à 100 % par les tests. Deux défauts du serveur ont été trouvés et documentés dans `services/supabase/README.md` (seuil de Hit It non appliqué, consentement non vérifié).

Phase précédente : [phase 1 — Domaine](../phase_1/README.md). Phase suivante : [phase 3 — Thème, mise en page adaptative et cadre](../phase_3/README.md).
