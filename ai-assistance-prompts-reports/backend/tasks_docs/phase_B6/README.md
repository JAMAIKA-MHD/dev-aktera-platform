# Phase B6 — Recette et mise en ligne : index de la documentation

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                          | Statut                                               | Commit                                                                                                                                              | Documentation                                                                                               |
| ----- | ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| B6.1  | Recette locale de bout en bout | Terminée (`3cd54b0`, correction `07b3492`)           | `docs(Backend): record the local end-to-end acceptance` · correction : `fix(Supabase): never hand the same coupon code to two simultaneous winners` | [B6.1-recette-locale.md](./B6.1-recette-locale.md)                                                          |
| B6.2  | Nettoyage final                | Terminée (`7d3291f`)                                 | `chore(Player-Experience): remove the legacy player page and anonymous table reads`                                                                 | [B6.2-nettoyage-final.md](./B6.2-nettoyage-final.md)                                                        |
| B6.3  | Guide de mise en ligne 👤      | Terminée (rédaction) · mise en ligne à faire par toi | `docs(Backend): add the deployment runbook`                                                                                                         | [B6.3-guide-de-mise-en-ligne.md](./B6.3-guide-de-mise-en-ligne.md) · [deploiement.md](../../deploiement.md) |

**Bilan :** phase terminée côté code et documentation le 2026-09-30.

- **Recette locale (B6.1) :** toutes les lignes faisables en local sont OK. Un défaut trouvé et corrigé : deux gagnants simultanés pouvaient recevoir le même code coupon (`07b3492`).
- **Nettoyage (B6.2) :** ancienne page joueur supprimée (−2 887 lignes). Plus aucune lecture anonyme directe des tables du jeu. Sonde 18/18 (27/27 avec les contrôles membre).
- **Mise en ligne (B6.3) :** guide prêt, [`deploiement.md`](../../deploiement.md). L'ordre est corrigé par rapport à `tasks.md` : `stable` passe avant la nouvelle `select-prize`.

**Reste à faire par toi :** la mise en ligne (guide), la recette sur un vrai téléphone, et l'import de tes anciens designs dans ton navigateur habituel (B6.1 §6).

Phase précédente : [phase B5 — Page joueur](../phase_B5/README.md).
