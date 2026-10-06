# Le pipeline final — du menu du dashboard au design enregistré

**Date :** 2026-09-30
**À lire avec :** [`plan.md`](./plan.md) (le comment) et [`tasks.md`](./tasks.md) (les tâches).
**But :** comprendre simplement **ce que voit la marque**, **ce que fait l'application à chaque clic** et **où va chaque donnée**, aujourd'hui puis après les tâches S0 à S5. Les noms techniques sont entre parenthèses, pour qui veut les retrouver dans le code.

---

## Sommaire

- [En une phrase](#en-une-phrase)
- [A. Aujourd'hui](#a-aujourdhui)
- [B. Après les tâches](#b-après-les-tâches)
  - [B1. Le parcours de la marque, étape par étape](#b1-le-parcours-de-la-marque-étape-par-étape)
  - [B2. Qui affiche quoi](#b2-qui-affiche-quoi)
  - [B3. Les échanges avec le serveur](#b3-les-échanges-avec-le-serveur)
  - [B4. Où va chaque donnée](#b4-où-va-chaque-donnée)
  - [B5. Qui peut voir quoi](#b5-qui-peut-voir-quoi)
- [C. Avant / après en un tableau](#c-avant--après-en-un-tableau)
- [D. Scénarios concrets](#d-scénarios-concrets)
- [E. Les données pour essayer (S5)](#e-les-données-pour-essayer-s5)

---

## En une phrase

La marque clique sur **Player Studio**, voit **toutes ses campagnes** dans un tableau, en choisit **une**, la modifie dans le **Studio** (sauvegardé tout seul dans Supabase), puis **ferme** et retrouve le tableau, avec la date de son dernier enregistrement.

---

## A. Aujourd'hui

```
Menu « Player Screen »
      │
      ▼
Studio en plein écran, sur la 1ʳᵉ campagne de la liste (choisie d'office)
      │  la marque change de campagne par la liste déroulante en haut du Studio
      │  « Fermer »
      ▼
Onglet « Campaigns »
```

**Ce que ça implique :**

- la marque n'a **pas de vue d'ensemble** : quelles campagnes ont déjà un design, lesquelles montrent encore le design par défaut aux joueurs ;
- elle arrive dans le Studio **sur une campagne qu'elle n'a pas choisie** ;
- le Studio et le sandbox **partagent** la campagne sélectionnée (`sandboxCampaignId`) : changer l'un change l'autre.

---

## B. Après les tâches

### B1. Le parcours de la marque, étape par étape

```
① Menu « Player Studio »
      │
      ▼
② Page « Player Studio » : le tableau de TOUTES ses campagnes
      │  recherche · filtres (statut, jeu) · tri · pagination
      │  colonne Design : « Saved · 2 h ago » ou « Default »
      │
      ├── « Open standalone demo » ──► Studio autonome (démo, dans le navigateur)
      │
      │  ③ clic sur une ligne (ou Entrée, ou « Open »)
      ▼
④ Studio en plein écran, sur CETTE campagne, avec son design enregistré
      │  ⑤ la marque modifie : chaque changement est enregistré tout seul (« Saved »)
      │     « Edit in campaign settings » → Wizard par-dessus, comme aujourd'hui
      │     liste en haut du Studio → changer de campagne sans revenir au tableau
      │
      │  ⑥ « Fermer »
      ▼
⑦ Retour à la page « Player Studio » : la colonne Design montre le nouvel enregistrement
```

**Les autres portes d'entrée restent :** « Customize player screen » depuis Campaigns, depuis l'espace d'une campagne ou depuis le Wizard ouvre **directement** le Studio (④) sur cette campagne. « Fermer » ramène alors au tableau (②).

### B2. Qui affiche quoi

| Étape | Ce que voit la marque                     | Composant (code)                                                    | Où                             |
| ----- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------ |
| ②     | Le tableau des campagnes                  | `StudioCampaignsPage` → `DataTable` (shadcn Table + TanStack Table) | Zone de contenu, menu à gauche |
| ④ ⑤   | Le Studio                                 | `CampaignStudio` (module Player Experience, **inchangé**)           | Plein écran, par-dessus        |
| ⑤     | Le Wizard (« Edit in campaign settings ») | `CampaignWizard` (inchangé)                                         | Par-dessus le Studio           |

**Un seul état décide de l'écran** (`studioCampaignId` dans `App.tsx`) :

| `studioCampaignId`  | Écran affiché                |
| ------------------- | ---------------------------- |
| `null`              | le tableau                   |
| l'id d'une campagne | le Studio sur cette campagne |
| `"standalone"`      | le Studio autonome (démo)    |

Le sandbox garde sa propre sélection (`sandboxCampaignId`) : les deux ne se gênent plus.

### B3. Les échanges avec le serveur

| Moment                 | Appel                                                             | Nouveau ?                                                                                     |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Ouverture du dashboard | `campaigns` + `prizes` + `quiz_questions` (`useCampaigns`)        | Non : déjà chargé aujourd'hui, **réutilisé** par le tableau                                   |
| ② Affichage du tableau | `select campaign_id, updated_at from campaign_experiences`        | **Oui**, une lecture légère (colonne Design). RLS : les campagnes de l'organisation seulement |
| ④ Ouverture du Studio  | Lecture du design (`campaign_experiences.config`), images Storage | Non : c'est le Studio actuel (branchement Supabase B4)                                        |
| ⑤ Chaque modification  | `save_experience_config` (sauvegarde automatique), envoi d'images | Non : Studio actuel                                                                           |
| ⑤ Wizard enregistré    | `save_campaign_full_in_place`                                     | Non                                                                                           |
| ⑦ Retour au tableau    | Nouvelle lecture de `campaign_experiences` (dates à jour)         | **Oui** (même requête qu'en ②)                                                                |

**Aucune nouvelle table, fonction SQL, migration ni Edge Function.** Tout passe par ce qui existe déjà.

### B4. Où va chaque donnée

| Donnée                                           | Où elle est stockée                                             | Qui l'écrit                                   |
| ------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------- |
| La liste des campagnes, leur statut, leurs dates | Table `campaigns` (Supabase)                                    | Wizard                                        |
| Le design d'une campagne (textes, thème, jeu…)   | Table `campaign_experiences`, colonne `config` (Supabase)       | Studio (sauvegarde automatique)               |
| La date du dernier enregistrement du design      | `campaign_experiences.updated_at`                               | `save_experience_config`, à chaque sauvegarde |
| Les images du design                             | Storage, `campaign-media/<organisation>/experience/<campagne>/` | Studio                                        |
| Le design du Studio autonome (démo)              | Le navigateur (`localStorage`)                                  | Studio autonome                               |
| Recherche, filtres, tri, page du tableau         | **Nulle part** : état de la page, perdu au rechargement         | —                                             |

### B5. Qui peut voir quoi

| Qui                                 | Tableau                                      | Studio                              |
| ----------------------------------- | -------------------------------------------- | ----------------------------------- |
| Membre de l'organisation (connecté) | Toutes les campagnes de **son** organisation | Oui, sur ces campagnes              |
| Membre d'une autre organisation     | Rien de cette organisation (RLS)             | Non (RLS : `NOT_FOUND`)             |
| Visiteur anonyme                    | Pas d'accès (route protégée)                 | Pas d'accès                         |
| Joueur                              | —                                            | Voit le résultat sur `/play/<slug>` |

---

## C. Avant / après en un tableau

| Sujet                                  | Aujourd'hui                                       | Après S0–S4                                                  |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| Clic sur le menu                       | Studio plein écran, 1ʳᵉ campagne choisie d'office | Tableau de toutes les campagnes                              |
| Choisir la campagne                    | Liste déroulante dans le Studio                   | Clic sur une ligne (la liste du Studio reste)                |
| Savoir quelles campagnes ont un design | Impossible sans les ouvrir une à une              | Colonne Design                                               |
| « Fermer » le Studio                   | Onglet Campaigns                                  | Tableau du Player Studio                                     |
| Studio et sandbox                      | Même campagne sélectionnée                        | Sélections séparées                                          |
| Libellé du menu                        | « Player Screen »                                 | « Player Studio »                                            |
| Studio lui-même, sauvegarde, Wizard    | —                                                 | **Inchangés**                                                |
| Base de données                        | —                                                 | **Inchangée** (une lecture de plus, sur une table existante) |

---

## D. Scénarios concrets

### D1. La marque veut habiller sa nouvelle campagne « Ramadan Quiz »

Menu **Player Studio** → recherche « ramadan » → la ligne indique **Design : Default** → clic → le Studio s'ouvre sur « Ramadan Quiz » → elle change le thème et le titre → « Saved » → **Fermer** → la ligne indique **Design : Saved · just now**.

### D2. Elle veut vérifier quelles campagnes actives ont encore le design par défaut

Filtre **Status : Active**, puis tri sur la colonne **Design** : les campagnes « Default » arrivent ensemble.

### D3. Elle est dans l'onglet Campaigns et clique « Customize player screen » sur une campagne

Le Studio s'ouvre **directement** sur cette campagne, comme aujourd'hui. En fermant, elle arrive sur le tableau du Player Studio.

### D4. Elle n'a encore aucune campagne

La page affiche « No campaigns yet » et **Create a campaign**, qui ouvre le Wizard. Le bouton **Open standalone demo** lui permet quand même d'essayer le Studio.

### D5. La connexion coupe au chargement de la page

Si la liste des campagnes ne charge pas, la page affiche « Could not load your campaigns. » et **Retry**. Si seule la colonne Design ne charge pas, le tableau s'affiche quand même et la colonne montre « — ».

### D6. Elle ouvre le sandbox pendant qu'elle travaille dans le Studio

Le sandbox garde **sa** campagne : ouvrir une campagne dans le Studio ne change plus celle du sandbox, et inversement.

---

## E. Les données pour essayer (S5)

La base locale n'a aujourd'hui que 4 campagnes dans l'organisation de test, aucune active, aucune avec un design : de quoi voir le tableau, mais pas de quoi l'essayer. La dernière tâche ajoute donc des **données de test**, sans rien effacer.

```
npm run studio:seed            ──►  14 campagnes « Seed · … » dans l'organisation de studio.test@octoreach.local
                                     · les 5 jeux, actifs et jouables sur /play/seed-…
                                     · 2 terminées (date passée), 2 en pause, 2 brouillons, 2 archivées
                                     · de 0 à 60 participations fictives chacune
                                     · 8 designs enregistrés (dates étalées), 6 « Default »

npm run studio:seed -- --clean ──►  tout ce qui porte le préfixe 5eed… disparaît ; rien d'autre ne bouge
```

**Pourquoi pas `npm run db:seed` ?** Il efface les données de l'organisation et recrée les campagnes avec de nouveaux identifiants : les designs enregistrés dans le Studio seraient perdus. Le nouveau seed ne touche qu'à ses propres lignes.

**Ce qu'on essaie avec :**

- deux pages de tableau ;
- chaque filtre et chaque tri ;
- une campagne « Default » habillée puis fermée, dont la colonne Design passe à « Saved · just now » ;
- une campagne active du seed jouée sur `/play/<slug>` ;
- l'état « No campaigns yet », avec le compte `admin@gmail.com`, dont l'organisation n'a aucune campagne.
