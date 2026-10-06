# Phase B4 — Studio sur Supabase : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                                             | Statut               | Commit                                                                        | Documentation                                                                      |
| ----- | ------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| B4.1  | Le Studio et le sandbox enregistrent sur Supabase | Terminée (`d310fba`) | `feat(Player-Experience): save the Studio design to Supabase`                 | [B4.1-studio-et-sandbox-sur-supabase.md](./B4.1-studio-et-sandbox-sur-supabase.md) |
| B4.2  | Images Storage dans l'aperçu                      | Terminée (`c029151`) | `feat(Player-Experience): resolve Storage images in the preview frame`        | [B4.2-images-storage-dans-l-apercu.md](./B4.2-images-storage-dans-l-apercu.md)     |
| B4.3  | Import des anciens designs du navigateur          | Terminée (`210a00b`) | `feat(Player-Experience): import designs saved in this browser into Supabase` | [B4.3-import-des-anciens-designs.md](./B4.3-import-des-anciens-designs.md)         |

**Bilan :** phase terminée le 2026-09-29. Pour une vraie campagne :

- **Le Studio et le sandbox** lisent et enregistrent le design sur Supabase (`campaign_experiences`), et les images vont dans Storage. Les tirages restent en démo.
- **Le Studio autonome** reste dans le navigateur, comme avant.
- **Garde-fou :** si le design enregistré ne peut pas être lu, rien ne peut être modifié ni enregistré (message + « Retry »).
- **Les images Storage** s'affichent dans l'aperçu, y compris la cible Hit It.
- **Les designs faits avant le branchement** sont importés une fois, automatiquement.

**À vérifier par toi dans le navigateur :** les listes « À vérifier par toi » de B4.1, B4.2 et B4.3 (enregistrement, conflit entre deux navigateurs, Wizard, images, import).

Phase précédente : [phase B3 — Adaptateurs Supabase](../phase_B3/README.md). Phase suivante : [phase B5 — Page joueur](../phase_B5/README.md).
