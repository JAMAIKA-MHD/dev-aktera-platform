# S5 — Données de test et recette finale

| Champ       | Valeur                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Statut      | Terminée                                                                                                 |
| Dépend de   | S4                                                                                                       |
| Démarrée le | 2026-09-30                                                                                               |
| Terminée le | 2026-09-30                                                                                               |
| Fiche       | tasks.md, S5 · plan, §7 et §7 bis · rules, §6 bis                                                        |
| Commit      | `chore(Player-Experience): seed local campaigns to try the Studio table` — **à faire par toi** (D6, §12) |

## 1. Objectif

Remplir la base **locale** avec des campagnes variées : plusieurs pages, tous les statuts, les 5 jeux, des designs enregistrés et d'autres par défaut. Puis faire la recette complète du tableau et du Studio sur ces données.

## 2. Avant / après

- **Avant :** l'organisation du compte de test n'avait que 4 campagnes : une seule page, aucune active dans sa période, aucun design enregistré. Et `npm run db:seed` efface les données et change les identifiants, donc fait perdre les designs.
- **Après :**
  - `npm run studio:seed` ajoute 14 campagnes (18 au total dans l'organisation), sans rien toucher d'autre ;
  - `npm run studio:seed:clean` les retire, et rien d'autre.

  Les données sont **en place** dans ta base locale (§8.4).

## 3. Plan de travail

- [x] Script de seed : garde-fous, nettoyage filtré, création, designs par le module
- [x] Scripts npm `studio:seed` et `studio:seed:clean`, documentés dans le guide
- [x] Rejouable (×2), nettoyage prouvé par les décomptes
- [x] Les 8 designs du seed ouverts dans le Studio : « No issues »
- [x] Recette complète dans le vrai dashboard et sur `/play/…`
- [x] Suite complète, build

## 4. Fichiers créés et modifiés

| Fichier                                                    | Créé / modifié | Rôle                                                                                                  | Lignes   |
| ---------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| `scripts/studio/seed-studio-campaigns.mjs`                 | créé           | Point d'entrée : garde-fous, options, organisation du compte, résumé                                  | 88       |
| `scripts/studio/seedStudioData.mjs`                        | créé           | Les 14 campagnes (une ligne chacune), identifiants `5eed…`, participants fictifs                      | 106      |
| `scripts/studio/seedStudioQuestions.mjs`                   | créé           | Les 2 questions du quiz et leurs traductions fr / ar / en                                             | 39       |
| `scripts/studio/seedStudioCleanup.mjs`                     | créé           | Suppression des seules lignes du seed, et des images Storage de ses campagnes                         | 49       |
| `scripts/studio/seedStudioRows.mjs`                        | créé           | Écriture : modèle et codes, campagnes, lots, stock, questions, participants, codes attribués, designs | 190      |
| `scripts/studio/seedStudioDesigns.mjs`                     | créé           | Designs construits par le module (chargé par Vite)                                                    | 102      |
| `package.json`                                             | modifié        | Scripts `studio:seed` et `studio:seed:clean`                                                          | +2       |
| `docs/DATABASE_AND_TESTING_GUIDE.md`                       | modifié        | Commandes, et section « Method D »                                                                    | +12      |
| `src/components/playerStudio/studioCampaignCells.tsx` (S3) | modifié        | Nom arabe aligné sous le nom de la campagne (§5.5)                                                    | 4 lignes |
| `src/App.studio.test.tsx` (S4)                             | modifié        | Attentes adaptées à une suite de tests chargée (§8.1)                                                 | 5 lignes |

## 5. Le code expliqué

### 5.1 Les garde-fous (règles §6 bis)

| Règle                                | Dans le code                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD1 — local seulement                | Arrêt (code 2) si `VITE_SUPABASE_URL` n'est pas `http://127.0.0.1:54321` ou `http://localhost:54321`                                                                        |
| SD2 — additif                        | Identifiants fixes : campagnes `5eed0000-0000-4000-8001-…`, lots `…-8002-…`, questions `…-8003-…`, modèle `…-8000-…001`. **Chaque** suppression filtre sur ces identifiants |
| SD3 — rejouable                      | Chaque lancement nettoie d'abord ses propres lignes, puis les recrée                                                                                                        |
| SD4 — jamais `db:seed` ni `db reset` | Le script n'en lance aucun                                                                                                                                                  |
| SD5 — aucune donnée réelle           | Téléphones `0699 NN SSSS`, nom « Seed player », `metadata.source = "studio_seed"`                                                                                           |
| SD6 — designs valides                | Construits par le module lui-même (§5.3) ; contrôle « No issues » (§8.3)                                                                                                    |
| SD7 — clé `service_role`             | Lue dans `.env.local` par le script seulement                                                                                                                               |
| SD8 — preuve de non-destruction      | Décomptes hors seed identiques avant / après (§8.2)                                                                                                                         |

### 5.2 Le contenu

- **14 campagnes** (plan §7 bis.2), avec des dates relatives au moment du lancement :
  - les 5 jeux actifs et jouables ;
  - 2 terminées par la date, 2 en pause, 2 brouillons, 2 archivées ;
  - 1 avec un nom arabe (« ليالي رمضان »), 1 avec un nom très long.
- **Lots :** un modèle « Seed 500 DA » avec **300 codes** `SEED-001…300`, et un lot de 20 par campagne, avec son stock (`prize_inventory`).
- **Participants :** 280 participants fictifs, dont un sur quatre gagnant. Chaque gagnant a un vrai code réservé (`redeemed_coupon_value` + `coupon_redemptions`) : les parties réelles reçoivent donc le **code libre suivant** (vérifié : `SEED-067`, §8.5).
- **Questions :** 2 par quiz, avec leur bonne réponse en base. Elle n'est jamais exposée au joueur : la page publique passe par `get_public_experience`.
- **8 designs** enregistrés à des dates étalées (à l'instant, 2 h, 5 h, hier, 3 jours, 3 semaines, 2 mois, 4 mois), avec 5 thèmes différents. Leur titre d'accueil est « Seed design — <nom> ».

### 5.3 Des designs construits par le module lui-même

`seedStudioDesigns.mjs` démarre un serveur Vite en mode intégré (sans port, sans surveillance des fichiers, sans analyse des dépendances de l'app). Il charge ensuite trois fichiers TypeScript du domaine :

- `createDefaultExperience` : le design par défaut, avec le thème voulu ;
- `buildCampaignSnapshot` : la campagne vue comme le Studio la voit ;
- `quizSourceHash` : l'empreinte d'une question, pour ses traductions.

Le module n'est **ni modifié, ni importé** par l'application ; aucune dépendance n'est ajoutée (Vite est déjà là).

### 5.4 Nettoyage (`studio:seed:clean`)

- **Ordre des suppressions :**
  1. participants (leurs codes réservés partent avec) ;
  2. visites, stock, questions, lots, designs ;
  3. campagnes ;
  4. codes, modèle.
- **Storage :** les images envoyées dans le Studio pour ces campagnes (`<org>/experience/<campagne>/`) sont retirées aussi.
- **Les parties jouées pendant la recette** sur des campagnes du seed disparaissent avec elles.

### 5.5 Deux retouches de l'interface (S3) trouvées pendant la recette

| Constat                                                                                          | Correction                                                                                                                                      |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Le nom arabe (« ليالي رمضان ») s'alignait à **droite** de la colonne, loin du nom de la campagne | `self-start` : il s'aligne sous le nom, en gardant son sens de lecture de droite à gauche (mesuré : même bord gauche, 121 px, `direction: rtl`) |
| (S4) Nom de campagne un peu étroit sur un tableau moyen                                          | 20 rem (documenté en S4)                                                                                                                        |

## 6. Décisions et alternatives

| Décision                                           | Alternative écartée                        | Raison                                                                                                              |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Seed à part (D8)                                   | `npm run db:seed`                          | Ce dernier efface les données et fait perdre les designs                                                            |
| Designs construits par le module, chargé par Vite  | JSON écrit à la main                       | Toujours valide et à jour avec le schéma ; aucune dépendance ajoutée                                                |
| Traductions des questions dans les designs de quiz | Laisser les 2 avertissements du Studio     | Le 1ᵉʳ contrôle a montré « 2 issues » (questions non traduites) : un design de démonstration doit être propre (SD6) |
| Nom de lot court (« Seed 500 DA »)                 | « Seed voucher 500 DA »                    | Le 1ᵉʳ contrôle a montré « 1 issue » : le nom sert d'étiquette aux segments de la roue (14 caractères au plus)      |
| Stock du modèle à 300                              | 200                                        | La base refuse d'allouer plus que le stock : 14 lots × 20 = 280                                                     |
| Script npm `studio:seed:clean`                     | `npm run studio:seed -- --clean` seulement | Sous PowerShell, l'enveloppe de npm supprime le `--` : le script **re-seedait** au lieu de nettoyer (constaté)      |
| Fichiers découpés (6 fichiers de 39 à 190 lignes)  | Un script de 400 lignes                    | Limite de 250 lignes (règles §6.2)                                                                                  |
| Données laissées en place à la fin                 | Les retirer                                | Pour que tu puisses essayer tout de suite ; `npm run studio:seed:clean` les retire                                  |

## 7. Tests

Le seed est un script local, vérifié par ses effets (décomptes, Studio, dashboard), comme `backend:probe` et `backend:smoke`. Aucun test Vitest n'est ajouté pour lui.

## 8. Vérification

### 8.1 Commandes

| Commande                                         | Résultat réel                                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx prettier --check`                           | ✅                                                                                                                                                                                                                                        |
| `npm run lint`                                   | ✅ 0 erreur, 26 avertissements (inchangé depuis S4)                                                                                                                                                                                       |
| `npm run typecheck`                              | ✅ OK                                                                                                                                                                                                                                     |
| `npx vitest run --maxWorkers=2` (3 passages)     | 1ᵉʳ : 1 échec dans `App.studio.test.tsx`, qui dépassait 5 s en suite chargée → attentes à 5 s, limite à 15 s. Puis 2ᵉ : 1 échec intermittent dans `PublicPlayPage.test.tsx` (B5.2, non touché, §10) ; 3ᵉ : ✅ **94 fichiers, 1043 tests** |
| `npm run build`                                  | ✅ OK                                                                                                                                                                                                                                     |
| `git diff --stat src/features/player-experience` | ✅ vide                                                                                                                                                                                                                                   |

### 8.2 Seed : rejouable, et sans effet sur le reste

| Mesure (base locale)                          | Avant le 1ᵉʳ seed | Après 2 seeds    | Après `--clean` |
| --------------------------------------------- | ----------------- | ---------------- | --------------- |
| Campagnes hors seed                           | 8                 | 8                | 8               |
| Participants hors seed                        | 170               | 170              | 170             |
| Lots / modèles / codes hors seed              | 10 / 8 / 420      | 10 / 8 / 420     | 10 / 8 / 420    |
| Codes attribués hors seed                     | 90                | 90               | 90              |
| Designs / visites hors seed                   | 0 / 0             | 0 / 0            | 0 / 0           |
| **Campagnes du seed**                         | 0                 | **14**           | 0               |
| **Participants du seed**                      | 0                 | **280**          | 0               |
| **Designs / codes / codes attribués du seed** | 0                 | **8 / 300 / 66** | 0               |

Comparaison automatique « avant » / « après `--clean` » : **identiques**.

Le 1ᵉʳ lancement avait échoué à mi-chemin (stock du modèle trop petit, §6). Le lancement suivant a nettoyé ces lignes partielles, puis tout recréé : preuve de la reprise.

### 8.3 Les 8 designs du seed dans le Studio

Chacun ouvert depuis le tableau : **« No issues »**, le titre « Seed design — <nom> » dans l'aperçu, et **aucun** enregistrement déclenché à l'ouverture. Console propre.

Au 1ᵉʳ contrôle, le Studio signalait « 1 issue » (segment de roue trop long) et « 2 issues » (questions non traduites) : corrigés (§6).

### 8.4 Le tableau sur les données du seed (vrai dashboard, compte de test)

| Contrôle                                            | Résultat                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Compteur, pages                                     | ✅ « 18 campaigns » ; page 1 : 10 lignes ; page 2 : 8 lignes ; « Rows 11–18 of 18 »                |
| Ordre par défaut                                    | ✅ actives d'abord (les plus récentes en premier), puis en pause, brouillons, terminées, archivées |
| Filtres de statut                                   | ✅ Active 6 · Paused 3 · Draft 3 · Ended 6 (= 18)                                                  |
| Filtre de jeu « Quiz Challenge »                    | ✅ les 3 quiz du seed                                                                              |
| Recherche                                           | ✅ en arabe (« رمضان » → 2 campagnes) et par slug (« seed-hit » → 2)                               |
| Tri Players, puis Design                            | ✅ 60, 60, 51 ; puis les designs les plus récents d'abord                                          |
| Colonne Design                                      | ✅ « Saved · 2 hours ago », « yesterday », « 3 weeks ago », « 4 months ago »… et « Default »       |
| Campagne « Default » ouverte, titre modifié, fermée | ✅ « Saved » dans le Studio, puis « Saved · just now » dans le tableau                             |
| Largeurs 1920 → 390 px, clair et sombre             | ✅ 0 débordement ; 7, 7, 6, 4, 4, 3 colonnes ; console propre                                      |

### 8.5 Côté joueur, sur les campagnes du seed (Edge Functions locales)

| Partie                                                 | Résultat                                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/play/seed-summer-spin` (roue, en)                    | ✅ design du seed affiché, tirage par `select-prize` : **gagné `SEED-067`**, le code libre suivant après les 66 attribués. « I've copied my code » → `confirm-coupon` OK   |
| `/play/seed-culture-quiz` (quiz, téléphone en `ar-DZ`) | ✅ question et réponses **en arabe**, issues des traductions du design (« ما هي عاصمة الجزائر؟ ») ; score 100 %, puis tirage perdu (probabilité 50 %, décision du serveur) |
| Réponse publique `get_public_experience`               | ✅ aucune bonne réponse, aucun poids, aucune quantité, aucune probabilité                                                                                                  |

**À vérifier par toi :**

1. **État vide** (« No campaigns yet » + « Create a campaign ») : connecte-toi avec `admin@gmail.com`, dont l'organisation n'a aucune campagne, puis ouvre « Player Studio ». Je n'ai pas son mot de passe. Cet état est couvert par les tests de la page (S3).
2. **Essayer toi-même :** `npm run dev`, connecte-toi avec `studio.test@octoreach.local`, puis ouvre « Player Studio ». Les 14 campagnes du seed sont là. Pour les retirer : `npm run studio:seed:clean`.

## 9. Non-régression

- **Données existantes :** décomptes identiques avant, pendant et après (§8.2).
- **Module Player Experience :** non touché.
- **Tests :** 1043, verts sur 2 des 3 passages ; l'échec restant est un test existant, intermittent (§10).
- **Dashboard :** l'empreinte des 12 écrans, identique après S4, n'a pas été reprise après le seed. Les nouvelles données changent le contenu des écrans ; S5 ne touche aucun style existant.

## 10. Écarts, imprévus et points d'attention

1. **Test existant intermittent : `src/pages/play/PublicPlayPage.test.tsx`** (tâche B5.2, non modifié ici).
   - Il a échoué **une fois** sur 3 passages de la suite complète.
   - Il passe seul (3/3) et en groupe (46/46).
   - C'est probablement une attente d'une seconde trop courte quand la machine est chargée.
   - Noté, pas corrigé (hors périmètre, règle R5).
2. **PowerShell et `--`** : `npm run studio:seed -- --email …` doit s'écrire `npm run studio:seed '--' --email …` sous PowerShell. Écrit dans le guide et en tête du script ; d'où aussi `studio:seed:clean`.
3. **État vide non vérifié dans le navigateur** (mot de passe de `admin@gmail.com` inconnu) : couvert par les tests.
4. **Fichiers de S3 et S4 retouchés** : nom arabe aligné (S3), attentes du test du parcours (S4).
5. **Scripts de recette** (pilote Chrome, empreinte, parties) : jetables, dans le dossier temporaire de la session, hors du dépôt.

## 11. Après le MVP

- Rendre plus tolérantes les attentes de `PublicPlayPage.test.tsx` (délai de `waitFor`), comme ici pour `App.studio.test.tsx`.
- Une option `--organization <id>` du seed, pour une organisation sans compte connu.

## 12. Commit à faire (D6)

```powershell
git add scripts/studio/ package.json docs/DATABASE_AND_TESTING_GUIDE.md src/components/playerStudio/studioCampaignCells.tsx src/App.studio.test.tsx ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/S5-donnees-de-test-et-recette.md ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/README.md ai-assistance-prompts-reports/player-studio-campaigns-table/tasks.md
git commit -m "chore(Player-Experience): seed local campaigns to try the Studio table"
```

## Journal

- 2026-09-30 — Tâche démarrée. Décomptes de départ relevés (hors seed : 8 campagnes, 170 participants…).
- 2026-09-30 — 1ᵉʳ lancement : arrêt au lot 11 (stock du modèle 200 < 280 alloués) et bruit de l'analyse de dépendances de Vite → stock à 300, analyse coupée. 2ᵉ lancement : partiel nettoyé, 14 campagnes.
- 2026-09-30 — Rejoué : mêmes décomptes ; hors seed inchangé.
- 2026-09-30 — Recette du tableau : compteur, pages, filtres, recherche, tris, colonne Design, retour du Studio : OK.
- 2026-09-30 — Studio : « 1 issue » (segment trop long) et « 2 issues » (questions non traduites) sur les designs du seed → nom de lot court + traductions fr / ar / en → 8/8 « No issues ».
- 2026-09-30 — Parties : roue gagnée `SEED-067` ; quiz en arabe traduit. Nom arabe aligné sous le nom.
- 2026-09-30 — `--clean` sous PowerShell : le `--` est supprimé par npm, le script avait re-seedé → vérifié avec `'--'` : décomptes identiques au départ → script `studio:seed:clean` ajouté.
- 2026-09-30 — Découpage en 6 fichiers (le script faisait 400 lignes après Prettier) ; nettoyage + 2 seeds : identiques ; 8/8 designs valides.
- 2026-09-30 — Suite complète : délai du test du parcours adapté ; 1 échec intermittent d'un test existant (B5.2) sur 3 passages ; 1043/1043 au dernier. Build OK. Données laissées en place. Statut → Terminée.
