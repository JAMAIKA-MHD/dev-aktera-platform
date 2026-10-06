# Tableau des campagnes avant le Player Studio — index de la documentation

Une documentation détaillée par tâche de [`tasks.md`](../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../rules.md), R2 et §8).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                                  | Statut                                       | Commit                                                                        | Documentation                                                          |
| ----- | -------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| S0    | Documents de travail et état de départ | Non demandée (état de départ relevé dans S1) | `docs(Player-Experience): plan the campaigns table before the Studio`         | —                                                                      |
| S1    | Base shadcn branchée sur le thème      | Terminée (commit à faire, D6)                | `chore(Dashboard): add the shadcn table primitives`                           | [S1-base-shadcn.md](./S1-base-shadcn.md)                               |
| S2    | Composant `DataTable` générique        | Terminée (commit à faire, D6)                | `feat(Dashboard): add a reusable data table`                                  | [S2-composant-data-table.md](./S2-composant-data-table.md)             |
| S3    | Page « Player Studio » (tableau)       | Terminée (commit à faire, D6)                | `feat(Player-Experience): list the brand campaigns before opening the Studio` | [S3-page-player-studio.md](./S3-page-player-studio.md)                 |
| S4    | Branchement dans le dashboard          | Terminée (commit à faire, D6)                | `feat(Player-Experience): open the Studio from the campaigns table`           | [S4-branchement-dashboard.md](./S4-branchement-dashboard.md)           |
| S5    | Données de test et recette finale      | Terminée (commit à faire, D6)                | `chore(Player-Experience): seed local campaigns to try the Studio table`      | [S5-donnees-de-test-et-recette.md](./S5-donnees-de-test-et-recette.md) |

**Bilan S1–S3 (2026-09-30) :**

- **Base shadcn** (Table, Button, Input, Badge) branchée sur le thème : dashboard **identique** sur 12 écrans, en clair et en sombre.
- **`DataTable` générique :** tri, recherche, filtres, pagination, clavier ; colonnes masquées selon la largeur du tableau.
- **Page « Player Studio » :** prête, pas encore branchée (S4).
- **1037 tests** (1000 + 37), lint inchangé, build OK, module Player Experience non touché.

**Bilan S4–S5 (2026-09-30) :**

- **Le menu « Player Studio »** affiche le tableau ; une ligne ouvre le Studio sur sa campagne ; « ← » ramène au tableau ; le sandbox est indépendant. Vérifié dans le vrai dashboard, de 390 à 1 920 px, en clair et en sombre.
- **`npm run studio:seed`** ajoute 14 campagnes de test (8 designs valides, 280 participants fictifs) sans toucher au reste ; `npm run studio:seed:clean` les retire. Données **en place** dans la base locale.
- **Tests :** 1043. Lint : 26 avertissements. Build OK. Module Player Experience non touché.
