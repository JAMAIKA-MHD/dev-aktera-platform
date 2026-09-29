# Phase B5 — Page joueur : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                           | Statut               | Commit                                                                        | Documentation                                                                        |
| ----- | ------------------------------- | -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| B5.1  | Campagne fermée dès l'ouverture | Terminée (`1334a2c`) | `feat(Player-Experience): show a closed campaign before the player registers` | [B5.1-campagne-fermee-des-l-ouverture.md](./B5.1-campagne-fermee-des-l-ouverture.md) |
| B5.2  | Nouvelle page `/play/:slug`     | Terminée             | `feat(Player-Experience): serve /play/:slug with the new player runtime`      | [B5.2-nouvelle-page-play-slug.md](./B5.2-nouvelle-page-play-slug.md)                 |

**Bilan :** phase terminée le 2026-09-29.

- **Ce que voient les joueurs :** `/play/:slug` affiche le design du Studio sur le vrai tirage serveur (passerelle `live` uniquement), dans la langue du téléphone quand la marque l'a activée.
- **Campagne fermée ou épuisée :** annoncée dès l'accueil.
- **Slug inconnu :** « Campagne introuvable », en 3 langues.
- **Contrôle réel de bout en bout sur la base locale :** tirage gagné avec code, rejeu identique, doublon refusé, coupon confirmé, puis `SOLD_OUT`.
- **1000 tests verts.**

**Reste pour B6 :**

- recette dans le navigateur, sur une vraie campagne ;
- suppression de l'ancienne page (non routée) et des lectures anonymes directes ;
- guide de mise en ligne : cette page doit partir **avant** la nouvelle `select-prize`.

Phase précédente : [phase B4 — Studio sur Supabase](../phase_B4/README.md). Phase suivante : [phase B6 — Recette et mise en ligne](../phase_B6/README.md).
