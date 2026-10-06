# Phase B3 — Adaptateurs Supabase : index de la documentation ✅

Une documentation détaillée par tâche de [`tasks.md`](../../tasks.md), créée au démarrage de la tâche et tenue à jour jusqu'à la fin ([`rules.md`](../../rules.md), R2 et §9).

**Statuts :** À faire · En cours · Terminée · Bloquée

| Tâche | Titre                                   | Statut               | Commit                                                                        | Documentation                                                                                        |
| ----- | --------------------------------------- | -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| B3.1  | Dépôt du design sur Supabase            | Terminée (`ced4975`) | `feat(Player-Experience): add the Supabase experience repository`             | [B3.1-depot-du-design-sur-supabase.md](./B3.1-depot-du-design-sur-supabase.md)                       |
| B3.2  | Passerelle de participation réelle      | Terminée (`ed0fd72`) | `feat(Player-Experience): add the live participation gateway on select-prize` | [B3.2-passerelle-de-participation-reelle.md](./B3.2-passerelle-de-participation-reelle.md)           |
| B3.3  | Images dans Supabase Storage            | Terminée (`9347c7c`) | `feat(Player-Experience): upload experience images to Supabase Storage`       | [B3.3-images-dans-supabase-storage.md](./B3.3-images-dans-supabase-storage.md)                       |
| B3.4  | Statistiques et assemblage des services | Terminée (`6ca9355`) | `feat(Player-Experience): compose the Studio and public services on Supabase` | [B3.4-statistiques-et-assemblage-des-services.md](./B3.4-statistiques-et-assemblage-des-services.md) |

**Bilan :** phase terminée le 2026-09-29. Les 4 adaptateurs Supabase (`XP/services/supabase/`) et leurs 2 assemblages :

| Assemblage             | Sauvegarde             | Tirage                  | Images           | Statistiques                 |
| ---------------------- | ---------------------- | ----------------------- | ---------------- | ---------------------------- |
| `createStudioServices` | `campaign_experiences` | démo                    | Supabase Storage | console                      |
| `createPublicServices` | lecture seule          | `live` (`select-prize`) | URL publique     | `record_campaign_impression` |

- **Tests :** 59 nouveaux, tous sans réseau, grâce à un faux client Supabase partagé. Le stockage local et le dépôt local ont été réorganisés **sans changer leur comportement** : leurs tests n'ont pas été modifiés.
- **Contrôle réel sur Storage local :** envoi, lecture publique, et refus pour une autre organisation.
- **À corriger en B4.2 :** la cible Hit It lit `image.url` directement, et n'afficherait donc pas une image rangée dans Storage.

Phase précédente : [phase B2 — Tirage serveur](../phase_B2/README.md). Phase suivante : [phase B4 — Studio sur Supabase](../phase_B4/README.md).
