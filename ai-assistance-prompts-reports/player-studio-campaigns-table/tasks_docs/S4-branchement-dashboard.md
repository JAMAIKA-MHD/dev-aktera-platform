# S4 — Branchement dans le dashboard

| Champ       | Valeur                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Statut      | Terminée                                                                                            |
| Dépend de   | S3                                                                                                  |
| Démarrée le | 2026-09-30                                                                                          |
| Terminée le | 2026-09-30                                                                                          |
| Fiche       | tasks.md, S4 · plan, §6                                                                             |
| Commit      | `feat(Player-Experience): open the Studio from the campaigns table` — **à faire par toi** (D6, §12) |

## 1. Objectif

Le menu « Player Studio » affiche le tableau des campagnes (S3). Une ligne ouvre le Studio sur sa campagne, et « Fermer » ramène au tableau.

## 2. Avant / après

```
Avant : menu « Player Screen » ──► Studio plein écran (1ʳᵉ campagne choisie d'office)
                                     « Fermer » ──► onglet Campaigns

Après : menu « Player Studio » ──► tableau des campagnes (zone de contenu, menu à gauche)
            ├─ clic / Entrée / « Open » ────────► Studio plein écran sur CETTE campagne
            ├─ « Open standalone demo » ────────► Studio autonome (démo)
            └─ « Create a campaign » ───────────► Wizard (onglet creator)
        Studio : « Back to dashboard » ──────────► tableau
        Campaigns · « Customize player screen » ─► Studio sur cette campagne ; « Back » ──► tableau
```

**Le sandbox garde sa propre campagne.** Avant, le Studio et le sandbox partageaient la même campagne sélectionnée.

## 3. Plan de travail

- [x] État `studioCampaignId`, séparé de `sandboxCampaignId`
- [x] Page dans la zone de contenu (chargée à la demande), Studio seulement quand une campagne est choisie
- [x] Entrées existantes (« Customize player screen », Wizard), navigation du menu, libellé « Player Studio »
- [x] Test du parcours (6 tests)
- [x] Contrôle dans le vrai dashboard : parcours, sandbox, 6 largeurs, clair / sombre ; empreinte des autres écrans
- [x] Suite complète, build

## 4. Fichiers créés et modifiés

| Fichier                                                    | Créé / modifié | Rôle                                                         | Lignes    |
| ---------------------------------------------------------- | -------------- | ------------------------------------------------------------ | --------- |
| `src/App.tsx`                                              | modifié        | État, page, conditions du Studio, entrées, libellé           | +53 / −11 |
| `src/App.studio.test.tsx`                                  | créé           | 6 tests du parcours dans `App`                               | 183       |
| `src/components/playerStudio/studioCampaignCells.tsx` (S3) | modifié        | Nom de campagne un peu plus large sur tableau moyen (20 rem) | 1 ligne   |

## 5. Le code expliqué

### 5.1 L'état

```ts
// Campaign open in the Studio: null shows the Player Studio table. Separate from the
// sandbox's own campaign, so that one never changes the other.
const [studioCampaignId, setStudioCampaignId] = useState<string | null>(null);
```

| `activeTab`      | `studioCampaignId` | Ce qui s'affiche                         |
| ---------------- | ------------------ | ---------------------------------------- |
| `"playerScreen"` | `null`             | la page « Player Studio » (tableau)      |
| `"playerScreen"` | un identifiant     | le Studio plein écran sur cette campagne |
| `"playerScreen"` | `"standalone"`     | le Studio autonome (démo)                |

### 5.2 Les changements dans `App.tsx`

1. **Import à la demande** de `StudioCampaignsPage`, comme `CampaignStudio` : la page et TanStack Table sont dans leur propre fichier JS, chargé à la 1ʳᵉ ouverture.
2. **`useCampaigns`** : on lit aussi `error`, pour l'état « Could not load your campaigns » de la page.
3. **Zone de contenu** : un bloc `activeTab === "playerScreen" && studioCampaignId === null`, avec la même animation d'entrée que les autres onglets. La page reçoit :
   - `campaigns`, `loading`, `error`, `organizationId` ;
   - `onOpenCampaign = setStudioCampaignId` ;
   - « Open standalone demo » → `STANDALONE_STUDIO` ;
   - « Create a campaign » → `handleSidebarNavigate("creator")` ;
   - « Retry » → `refetchCampaigns`.
4. **Bloc du Studio** : condition `studioCampaignId !== null`. Le Studio lit `studioCampaignId`, sa liste de campagnes le met à jour (`onCampaignChange`), et **`onClose` le remet à `null`** : retour au tableau. Avant, `onClose` ouvrait l'onglet Campaigns.
5. **`handleOpenPlayerScreenEditor`** (« Customize player screen », Wizard) : `setStudioCampaignId(camp.id ?? null)`, donc Studio direct. Sans identifiant (campagne pas encore enregistrée), c'est le tableau. Il ne touche plus au sandbox.
6. **`handleSidebarNavigate`** remet `studioCampaignId` à `null` : un clic sur le menu montre toujours le tableau.
7. **Libellé du menu** : `t("nav.playerScreen", "Player Studio")` (D2). La clé n'existait dans aucune traduction : c'est le texte par défaut qui s'affiche, en fr comme en ar. L'identifiant `playerScreen` et la route `/studio` ne changent pas ; `/studio` affiche désormais le tableau.

**Ce qui ne change pas :** `sandboxCampaignId` et son choix d'office de la 1ʳᵉ campagne (il ne sert plus qu'au sandbox), le Wizard par-dessus le Studio (`studioWizard`), les props passées au Studio (`backend`, `campaigns`, `prizeTemplates`…), et le module Player Experience.

## 6. Décisions et alternatives

| Décision                                                          | Alternative écartée            | Raison                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Nouvel état `studioCampaignId`                                    | Réutiliser `sandboxCampaignId` | Le tableau a besoin d'un « aucune campagne ouverte », et le sandbox ne doit plus suivre le Studio (plan §6) |
| « Fermer » ramène au tableau, même quand on est venu de Campaigns | Revenir à l'onglet d'origine   | Plan §6.1 ; une seule règle, simple. Revenir à l'onglet d'origine : après le MVP                            |
| Page chargée à la demande                                         | Import direct                  | Le bundle principal ne grossit que de 0,7 Ko                                                                |

## 7. Tests

`src/App.studio.test.tsx`, **6 tests**. Le Studio, le simulateur et les hooks de données sont remplacés par des faux légers : on teste le **branchement** dans `App`, pas ces composants (déjà testés).

| Test                                                         | Ce qu'il vérifie                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| shows the campaigns table from the menu, then the Studio…    | Campaigns → menu → tableau (sans Studio) → clic sur « Winter Wheel » → Studio `c2` |
| goes back to the table when the Studio closes                | Studio → « Close » → tableau, Studio parti                                         |
| follows the Studio's own campaign picker                     | la liste du Studio change la campagne ouverte                                      |
| opens the standalone Studio from the page                    | « Open standalone demo » → Studio `null`                                           |
| still opens the Studio directly from Customize player screen | Campaigns → « Customize… » → Studio ; fermer → tableau                             |
| keeps the sandbox on its own campaign                        | Studio ouvert sur `c2`, puis sandbox → `c1` (sa propre campagne)                   |

**Particularité du 1ᵉʳ test :** l'instance `userEvent` qui a cliqué sur le menu n'envoyait **aucun** événement au clic suivant, sans erreur, puis dépassait le délai.

- **Enquête :** avec `fireEvent`, ou une nouvelle instance `userEvent`, le clic ouvre bien le Studio. Aucune règle `pointer-events` sur les ancêtres, aucune erreur de l'application. Aucun événement n'est capté au niveau du document.
- **Cause :** l'état de pointeur interne de l'outil, resté lié au bouton du menu.
- **Solution :** une nouvelle instance pour ce clic, avec un commentaire.
- **Preuve que ce n'est pas l'application :** le même chemin, avec de **vrais** clics souris dans Chrome (§8.2), fonctionne.

## 8. Vérification

### 8.1 Commandes

| Commande                                                | Résultat réel                                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/App.studio.test.tsx`                | 1ᵉʳ passage : 5/6 (§7) → ✅ **6/6**                                                                                         |
| `npx prettier --check`                                  | ✅                                                                                                                          |
| `npm run lint`                                          | ✅ 0 erreur, **26** avertissements (27 avant S4 : un de moins)                                                              |
| `npm run typecheck`                                     | ✅ OK                                                                                                                       |
| `npx vitest run --maxWorkers=2`                         | ✅ **94 fichiers, 1043 tests**                                                                                              |
| `npm run build`                                         | ✅ OK. `StudioCampaignsPage-….js` : 102,34 Ko (29,74 Ko gzip), chargé à la demande ; bundle principal 1 409,53 Ko (+0,7 Ko) |
| `git diff --stat src/features/player-experience`        | ✅ vide                                                                                                                     |
| Empreinte des 12 écrans du dashboard comparée au départ | ✅ 12/12 identiques                                                                                                         |

### 8.2 Dans le vrai dashboard (serveur de dev, compte de test, Chrome sans interface, vrais clics souris)

| Parcours                                                                                           | Résultat                                                                                            |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Menu « Player Studio » (depuis Campaigns)                                                          | ✅ tableau des 4 campagnes de l'organisation ; libellé « Player Studio » dans le menu               |
| Clic sur la 2ᵉ ligne (« … Ramadan Night Rewards (Draft) »)                                         | ✅ Studio ouvert **sur cette campagne** (liste du Studio), tableau masqué                           |
| « Back to dashboard »                                                                              | ✅ tableau, Studio fermé                                                                            |
| « Open standalone demo »                                                                           | ✅ Studio sur « Standalone (demo campaign) »                                                        |
| Campaigns → « Customize Player Screen UI in Editor »                                               | ✅ Studio sur la campagne ; « Back » → tableau                                                      |
| Sandbox avant : « Ramadan… (Draft) » ; Studio ouvert sur « Weekend Flash Special » ; sandbox après | ✅ toujours « Ramadan… (Draft) » : **indépendant**                                                  |
| `/studio` à 1920, 1440, 1280, 1024, 768 et 390 px, clair et sombre                                 | ✅ 0 débordement de la page, 0 défilement du tableau ; 7, 7, 6, 4, 4 et 3 colonnes ; console propre |

**À vérifier par toi** (après avoir lancé `npm run dev`, connecté) :

1. Clique « Player Studio » dans le menu : le tableau de tes campagnes s'affiche.
2. Clique une campagne : le Studio s'ouvre dessus. « ← » (Back to dashboard) : retour au tableau.

## 9. Non-régression

- Écrans du dashboard : empreinte identique (12 écrans).
- Studio, Wizard par-dessus le Studio, sandbox : fonctionnent comme avant. Le sandbox est désormais indépendant du Studio, comme prévu.
- 1037 tests précédents : verts, aucun modifié.

## 10. Écarts, imprévus et points d'attention

1. **Test du 1ᵉʳ parcours :** particularité de `userEvent` (§7), vérifiée dans un vrai navigateur.
2. **Retouche de S3 :** nom de campagne un peu plus large sur un tableau moyen (20 rem), après la capture dans le vrai dashboard.
3. **Comportement changé, voulu (fiche S4) :**
   - « Fermer » le Studio ramène au tableau, et non plus à l'onglet Campaigns ;
   - le sandbox ne suit plus le Studio.

## 11. Après le MVP

- Revenir à l'onglet d'origine après le Studio (Campaigns → Studio → Campaigns).
- Adresse par campagne (`/studio/:campaignId`, décision D5).

## 12. Commit à faire (D6)

```powershell
git add src/App.tsx src/App.studio.test.tsx src/components/playerStudio/studioCampaignCells.tsx ai-assistance-prompts-reports/player-studio-campaigns-table/tasks_docs/S4-branchement-dashboard.md
git commit -m "feat(Player-Experience): open the Studio from the campaigns table"
```

## Journal

- 2026-09-30 — Tâche démarrée, documentation créée. S1 à S3 pas encore commités : S4 part de l'arbre de travail.
- 2026-09-30 — `App.tsx` modifié (+53 / −11) ; typecheck OK.
- 2026-09-30 — Test du parcours : 5/6. L'instance `userEvent` du clic de menu n'envoie plus rien → enquête (§7) → nouvelle instance pour ce clic → 6/6.
- 2026-09-30 — Contrôle dans le vrai dashboard : parcours complet, sandbox indépendant, 6 largeurs × clair / sombre sans débordement. Nom de campagne élargi à 20 rem sur tableau moyen.
- 2026-09-30 — Empreinte 12/12, lint 26, typecheck OK, 1043 tests, build OK. Statut → Terminée.
- 2026-09-30 — (Pendant S5) Suite complète chargée : ce test dépassait la limite de 5 s par test (1ᵉʳ chargement à la demande de la page et du Studio). Attentes portées à 5 s et limite à 15 s pour ce fichier ; 94 fichiers / 1043 tests verts.
