# Phase B1 — Base de données : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                                     | Statut               | Commit                                                                             | Documentation                                                                                |
| ----- | ----------------------------------------- | -------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B1.1  | Fermer les accès anonymes                 | Terminée (`cb4ad17`) | `fix(Supabase): close anonymous access to entries and internal functions`          | [B1.1-fermer-les-acces-anonymes.md](./B1.1-fermer-les-acces-anonymes.md)                     |
| B1.2  | Table du design et lecture publique       | Terminée (`50df4d3`) | `feat(Supabase): store the player experience design and expose a safe public read` | [B1.2-table-du-design-et-lecture-publique.md](./B1.2-table-du-design-et-lecture-publique.md) |
| B1.3  | Pas de tirage après un jeu d'adresse raté | Terminée             | `fix(Supabase): never draw a prize after a failed skill game`                      | [B1.3-pas-de-tirage-apres-un-jeu-rate.md](./B1.3-pas-de-tirage-apres-un-jeu-rate.md)         |

**Bilan :** phase terminée le 2026-09-29. Trois migrations, appliquées en local et rejouées sans erreur :

- `20260929120000_close_anonymous_access.sql` :
  - un anonyme ne lit, n'écrit ni ne modifie plus aucune participation, et n'appelle plus aucune fonction interne ;
  - les fonctions du dashboard sont limitées à l'organisation de l'appelant.
- `20260929130000_add_campaign_experiences.sql` :
  - table `campaign_experiences` (le design du Studio, une ligne par campagne) ;
  - `save_experience_config` (enregistrement avec contrôle de version) ;
  - `get_public_experience` (lecture publique, champs sûrs uniquement).
- `20260929140000_skill_games_never_draw_on_failure.sql` : un quiz ou un Hit It raté perd toujours, sans consommer de stock.

**Script de vérification :** `npm run backend:probe` → **24/24**.

**À retenir :**

- **L'outil « tester une campagne » du dashboard (`CampaignTestModal`)** tire de vrais lots et écrit des participations directement. Il a été préservé (limité à ses propres campagnes), mais il faudra y réfléchir avant la production (B1.1 §10).
- **Incident corrigé en B1.1 :** un 1ᵉʳ passage du script, avant la migration, a consommé un lot sur une campagne active. Le stock a été rétabli, et le script ne vise plus que des brouillons.

Phase précédente : [phase B0 — Préparation](../phase_B0/README.md). Phase suivante : [phase B2 — Tirage serveur](../phase_B2/README.md).
