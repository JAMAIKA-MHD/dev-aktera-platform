# Phase 3 — Thème, mise en page adaptative et cadre à 8 slots : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../plan&tasks/tasks.md), tenue à jour du début à la fin de la tâche ([`rules.md`](../../rules.md), règle R2).

**Statuts :** En cours · Terminée · Bloquée

| Tâche | Titre                                   | Statut   | Commit proposé                                                                          | Documentation                                                                      |
| ----- | --------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| T3.1  | Thème                                   | Terminée | `feat(Player-Experience): add theme scope, tokens and backgrounds`                      | [T3.1-theme.md](./T3.1-theme.md)                                                   |
| T3.2  | Système de mise en page adaptative      | Terminée | `feat(Player-Experience): add adaptive layout system and breakpoints`                   | [T3.2-mise-en-page-adaptative.md](./T3.2-mise-en-page-adaptative.md)               |
| T3.3  | Hôte isolé `/xp-frame` et pont d'aperçu | Terminée | `feat(Player-Experience): add isolated frame host and preview bridge`                   | [T3.3-hote-isole-et-pont-d-apercu.md](./T3.3-hote-isole-et-pont-d-apercu.md)       |
| T3.4  | Cadre et slots 1 à 4                    | Terminée | `feat(Player-Experience): add experience frame with header, hero, title and copy slots` | [T3.4-cadre-et-slots-1-a-4.md](./T3.4-cadre-et-slots-1-a-4.md)                     |
| T3.5  | Slots 5 à 8                             | Terminée | `feat(Player-Experience): add interaction, reinforcement, CTA and footer slots`         | [T3.5-slots-5-a-8.md](./T3.5-slots-5-a-8.md)                                       |
| T3.6  | Sections jackpot et chips               | Terminée | `feat(Player-Experience): add jackpot and prize chips sections`                         | [T3.6-sections-jackpot-et-chips.md](./T3.6-sections-jackpot-et-chips.md)           |
| T3.7  | Retours sensoriels et hooks             | Terminée | `feat(Player-Experience): add feedback utilities and runtime hooks`                     | [T3.7-retours-sensoriels-et-hooks.md](./T3.7-retours-sensoriels-et-hooks.md)       |
| T3.8  | Vérification responsive automatisée     | Terminée | `chore(Player-Experience): add shared layout audit and responsive sweep script`         | [T3.8-balayage-responsive-automatise.md](./T3.8-balayage-responsive-automatise.md) |

**Bilan :** phase terminée le 2026-09-22. Le runtime a son thème (5 presets, aucune couleur écrite), une mise en page adaptative sur toute l'enveloppe (280 → 2560 × 320 → 1600 px), son document à lui (`/xp-frame`, pont d'aperçu), le cadre à 8 slots, les sections jackpot et chips, et ses retours sensoriels. Le balayage de T3.8 vérifie les 7 fixtures du cadre en fr, ar et en : 9 240 audits, 0 défaut, 0 message de console ; il a trouvé et fait corriger un faux avertissement latent du rapport en direct. Commits : T3.1 à T3.7 faits ; T3.8 proposé, non commité.

Phase précédente : [phase 2 — Services et adaptateurs locaux](../phase_2/README.md). Phase suivante : phase 4 — Parcours et écrans (pas encore commencée).
