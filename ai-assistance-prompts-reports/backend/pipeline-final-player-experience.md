# Le pipeline du Player Experience — aujourd'hui, et après le branchement Supabase

**Date :** 2026-09-28
**À lire avec :** [`diagnostic-branchement-supabase-player-experience.md`](./diagnostic-branchement-supabase-player-experience.md) (le constat) et [`plan-branchement-supabase-player-experience.md`](./plan-branchement-supabase-player-experience.md) (les tâches).
**But :** comprendre simplement **où va chaque donnée** et **quand l'application parle au serveur**, aujourd'hui puis après le plan. Les noms techniques sont entre parenthèses, pour qui veut les retrouver dans le code.

---

## Sommaire

- [En une phrase](#en-une-phrase)
- **Partie A — La version actuelle**
  - [A1. Vue d'ensemble : deux mondes qui ne se parlent pas](#a1-vue-densemble--deux-mondes-qui-ne-se-parlent-pas)
  - [A2. Où va chaque donnée aujourd'hui](#a2-où-va-chaque-donnée-aujourdhui)
  - [A3. Les échanges avec le serveur aujourd'hui](#a3-les-échanges-avec-le-serveur-aujourdhui)
  - [A4. Ce que ça implique](#a4-ce-que-ça-implique)
- **Partie B — La version après le plan**
  - [B1. Est-ce que la base de données change ?](#b1-est-ce-que-la-base-de-données-change-)
  - [B2. Où va chaque donnée après le plan](#b2-où-va-chaque-donnée-après-le-plan)
  - [B3. Le pipeline, étape par étape](#b3-le-pipeline-étape-par-étape)
  - [B4. Les échanges avec le serveur après le plan](#b4-les-échanges-avec-le-serveur-après-le-plan)
  - [B5. Qui peut voir quoi](#b5-qui-peut-voir-quoi)
- **Partie C — [Avant / après en un tableau](#partie-c--avant--après-en-un-tableau)**
- **Partie D — [Scénarios concrets : « je change ceci, c'est stocké où ? »](#partie-d--scénarios-concrets--je-change-ceci-cest-stocké-où-)**
- [Points à décider ensemble](#points-à-décider-ensemble)

---

## En une phrase

**Aujourd'hui :** le Studio est **100 % dans le navigateur**. Il **lit** les campagnes sur le serveur mais n'y **écrit** rien. Le design qu'on y fait reste dans ton navigateur, et les joueurs ne le voient jamais : la page publique est l'ancienne page, avec un design fixe.

**Après le plan :** le design du Studio est **enregistré sur le serveur**, dans une table dédiée (une ligne par campagne). Le joueur qui ouvre le lien public **voit exactement ce design**. Quand il joue, **seul le serveur** décide s'il gagne, lui attribue un coupon et enregistre sa participation.

---

# Partie A — La version actuelle

## A1. Vue d'ensemble : deux mondes qui ne se parlent pas

```
 ┌───────────── TON NAVIGATEUR (dashboard) ─────────────┐
 │                                                      │
 │  WIZARD ─────────── écrit ──────────────────────┐    │
 │  (règles, lots, questions)                      │    │
 │                                                 │    │
 │  STUDIO ◄───── lit les campagnes ──────────┐    │    │
 │   │  (lecture seule)                       │    │    │
 │   ▼                                        │    │    │
 │  localStorage du navigateur                │    │    │
 │   • design de chaque campagne              │    │    │
 │   • images (dans le design)                │    │    │
 │   • préférences d'aperçu                   │    │    │
 │   • participations DÉMO du sandbox         │    │    │
 │                                            │    │    │
 │  SANDBOX / APERÇU : tirages simulés        │    │    │
 │  dans le navigateur, rien n'est envoyé     │    │    │
 └────────────────────────────────────────────┼────┼────┘
                                              │    ▼
                         ┌────────────────── SERVEUR (Supabase) ──────────────────┐
                         │ campagnes, lots, questions (+ bonnes réponses), seuils │
                         │ participations, coupons, statistiques de visites       │
                         └────────────────────────────▲───────────────────────────┘
                                                      │
 ┌──────────── TÉLÉPHONE DU JOUEUR : /play/:slug ─────┼─────────────────────────┐
 │ ANCIENNE page (PlayerFlowPage) : design FIXE violet │ n'utilise pas le Studio │
 │  lit la campagne, compte les visites, appelle le tirage (select-prize)        │
 │  si le tirage ne répond pas : tire et enregistre LUI-MÊME (faille)            │
 └───────────────────────────────────────────────────────────────────────────────┘
```

**Le point clé :** le Studio et la page joueur **ne partagent rien**. Le Studio garde son design dans ton navigateur, et la page joueur ne le lit jamais.

## A2. Où va chaque donnée aujourd'hui

### A2.1 Ce que la marque règle dans le Studio → **dans son navigateur**

Tout le design d'une campagne est enregistré dans le **`localStorage` du navigateur** (un petit espace de stockage propre à chaque navigateur), sous la clé `xp:experience:v1:<id de la campagne>`.

| Ce que la marque règle dans le Studio                              | Rangé aujourd'hui dans                                                                                    | Vu par les joueurs ?                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Couleurs, style, police, arrondis                                  | `localStorage` de **son** navigateur                                                                      | ❌                                                                 |
| Nom de marque, slogan                                              | `localStorage`                                                                                            | ❌                                                                 |
| **Logo, image de fond, images des lots, couverture du grattage**   | transformées en texte et collées **dans** le design, donc dans le `localStorage` (≈ 5 Mo maximum en tout) | ❌                                                                 |
| Textes des écrans en fr / ar / en                                  | `localStorage`                                                                                            | ❌                                                                 |
| **Champs du formulaire** (afficher Wilaya, cacher Email, libellés) | `localStorage`                                                                                            | ❌ (l'ancienne page a toujours les mêmes champs : nom + téléphone) |
| Texte de consentement, mentions légales                            | `localStorage`                                                                                            | ❌                                                                 |
| Segments de la roue, icône des boîtes, cible du Hit It             | `localStorage`                                                                                            | ❌                                                                 |
| Traductions des questions du quiz                                  | `localStorage`                                                                                            | ❌                                                                 |
| Appareil de l'aperçu, appareils personnalisés                      | `localStorage` (`xp:studio:viewport:v1`, `xp:studio:devices:v1`)                                          | —                                                                  |
| Participations « démo » du sandbox                                 | `localStorage` (`xp:demo:entries:v1`)                                                                     | —                                                                  |

Conséquences :

- un autre navigateur, un collègue ou un autre ordinateur ne voit **pas** ce design ;
- vider les données du navigateur **efface** le design ;
- en navigation privée, rien n'est enregistré.

### A2.2 Ce que la marque règle dans le Wizard → **sur le serveur** (déjà le cas)

| Ce que la marque règle                         | Rangé dans                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Nom, lien (`slug`), dates, statut, type de jeu | fiche campagne (`campaigns`)                                                                                            |
| Lots, quantités, poids, probabilité de gain    | lots (`prizes`, `prize_inventory`) + fiche campagne                                                                     |
| Questions du quiz **et bonnes réponses**       | questions (`quiz_questions`)                                                                                            |
| Seuils (quiz, Hit It)                          | fiche campagne (`game_logic_config`)                                                                                    |
| Codes coupons                                  | inventaire des coupons (`prize_template_items`)                                                                         |
| Ancienne config d'écran joueur                 | fiche campagne (`player_screen_config`) : réécrite à chaque enregistrement du Wizard, et **ignorée** par la page joueur |

### A2.3 Ce que le joueur fournit → **sur le serveur**, via l'ancienne page

| Ce que le joueur fournit ou obtient | Rangé aujourd'hui dans                                                    |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Téléphone                           | participation (`entries.phone_number`)                                    |
| Nom                                 | participation (`participant_name`)                                        |
| Email                               | jamais demandé (toujours vide)                                            |
| Wilaya                              | jamais demandée                                                           |
| **Consentement**                    | case cochée à l'écran, mais **ni envoyée ni gardée** par le serveur       |
| Gagné / perdu, lot, coupon          | participation + registre des coupons                                      |
| « J'ai copié mon code »             | participation (`coupon_confirmed`)                                        |
| Visites, temps passé                | statistiques (`campaign_impressions`), envoyées **toutes les 5 secondes** |

## A3. Les échanges avec le serveur aujourd'hui

| #     | Qui                  | Quand                                             | Ce qui est échangé                                                           | Sens                                 |
| ----- | -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| 1     | Dashboard → Studio   | ouverture du Studio                               | liste des campagnes, lots, questions, seuils (déjà chargés par le dashboard) | serveur → Studio (**lecture seule**) |
| 2     | Wizard               | « Edit in campaign settings » puis enregistrement | règles, lots, questions                                                      | Wizard → serveur                     |
| —     | Studio               | enregistrement du design, ajout d'image           | **rien** : tout reste dans le navigateur                                     | —                                    |
| —     | Sandbox / aperçu     | partie jouée                                      | **rien** : tirage simulé                                                     | —                                    |
| 3     | Ancienne page joueur | ouverture du lien                                 | campagne, lots, questions **avec les bonnes réponses**                       | serveur → joueur                     |
| 4     | Ancienne page joueur | ouverture + toutes les 5 s                        | une visite, le temps passé                                                   | joueur → serveur                     |
| 5     | Ancienne page joueur | moment du jeu                                     | participation (nom, téléphone, réponse du jeu) → gagné/perdu + coupon        | joueur ⇄ serveur (`select-prize`)    |
| 5 bis | Ancienne page joueur | si l'échange 5 échoue                             | la page **tire au sort et écrit elle-même** la participation                 | joueur → base (**faille**)           |
| 6     | Ancienne page joueur | clic « J'ai copié »                               | confirmation du coupon                                                       | joueur → serveur                     |

## A4. Ce que ça implique

- Le travail fait dans le Studio est **invisible** pour tout le monde sauf toi, sur ce navigateur.
- Les joueurs voient un design **violet fixe**, les mêmes textes et les mêmes champs pour toutes les marques.
- Le consentement n'a **aucune preuve** côté serveur (loi 18-07).
- Plusieurs failles permettent de tricher ou de lire les participants (détail dans le diagnostic, §2).

---

# Partie B — La version après le plan

## B1. Est-ce que la base de données change ?

**Très peu. Une seule table ajoutée, et aucune table existante modifiée.**

| Quoi                                                                                             | Changement                       | En clair                                                                                                                      |
| ------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Table du design (`campaign_experiences`)**                                                     | **Nouvelle table**               | Une ligne par campagne, qui range tout le design du Studio (+ la date de la dernière modification et qui l'a faite)           |
| Fiche campagne (`campaigns`)                                                                     | **Inchangée**                    | Elle garde les règles du jeu (Wizard) ; le design n'y est pas                                                                 |
| Fonction « enregistrer le design » (`save_experience_config`)                                    | **Nouvelle**                     | Enregistre le design, et refuse si quelqu'un d'autre l'a modifié entre-temps                                                  |
| Fonction « lire la campagne publique » (`get_public_experience`)                                 | **Nouvelle**                     | Donne au joueur ce qu'il a le droit de voir, et rien d'autre                                                                  |
| Fonction « résultat du jeu » (`resolve_game_outcome`)                                            | **Corrigée**                     | Un joueur qui rate le Hit It ou le quiz perd toujours                                                                         |
| Fonction « tirage » (`select-prize`)                                                             | **Renforcée**                    | Exige le consentement ; en cas de nouvel essai, redonne le même résultat ; ne donne jamais deux fois le même coupon           |
| Règles d'accès (sécurité)                                                                        | **Resserrées**                   | Un visiteur anonyme ne peut plus lire les participants, ni tricher sur le tirage                                              |
| Stockage des images (bucket `campaign-media`)                                                    | **Nouveau dossier**, même bucket | Les images du Studio vont dans `<organisation>/experience/<campagne>/`                                                        |
| Participations (`entries`), lots (`prizes`), questions (`quiz_questions`), coupons, statistiques | **Inchangées**                   | Mêmes champs qu'aujourd'hui. Les nouvelles informations (consentement, wilaya) vont dans le champ libre existant (`metadata`) |

> **Pourquoi une table à part ?**
>
> - **Pas l'ancien `player_screen_config` :** le Wizard réécrit entièrement l'ancien champ à chaque enregistrement. Il effacerait le travail fait dans le Studio.
> - **Pas une nouvelle colonne de `campaigns` :** une table à part garde la fiche campagne légère et intacte. Les enregistrements automatiques du Studio (environ une fois par seconde pendant l'édition) ne touchent jamais la ligne de campagne, que lisent le tirage et le Wizard. Et un brouillon / publié ou un historique pourra s'y ajouter plus tard.
> - **Elle n'appartient qu'au Studio.** Elle est supprimée automatiquement avec sa campagne, et seuls les membres de l'organisation peuvent la lire ou l'écrire. Les joueurs n'y ont pas accès directement : ils reçoivent le design par la lecture publique.

## B2. Où va chaque donnée après le plan

Il faut distinguer deux familles :

1. **Le design** : ce que la marque prépare dans le Studio. Il est **public** : tout joueur le voit.
2. **La participation** : ce que le joueur tape et gagne. Elle est **privée** : seule la marque la voit.

Et une règle qui ne bouge pas : **les règles du gain** (lots, stock, probabilités, bonnes réponses, seuils) restent dans le **Wizard**, jamais dans le Studio.

### B2.1 Le design (Studio) → sur le serveur

Tout ce qui suit est rangé **dans la table du design**, sur la ligne de la campagne (`campaign_experiences.config`), sauf les images, qui vont dans le **stockage de fichiers**.

| Ce que la marque règle dans le Studio                                                                                       | Exemple                                   | Rangé dans                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Couleurs, style, police, arrondis, mode sombre/clair                                                                        | « Midnight gold », boutons arrondis       | table du design                                            |
| Nom de la marque, slogan, icône                                                                                             | « Ooredoo — Jouez et gagnez »             | table du design                                            |
| **Logo, image de fond**                                                                                                     | fichier `logo.png`                        | **stockage de fichiers** ; la table ne garde que le chemin |
| Textes des écrans (accueil, inscription, jeu, gagné, perdu) en fr / ar / en                                                 | titre, sous-titre, texte des boutons      | table du design                                            |
| Sections (jackpot, pastilles de lots)                                                                                       | « Gros lot : un iPhone »                  | table du design                                            |
| **Champs du formulaire** : lesquels sont affichés, obligatoires ou non, leurs libellés et exemples                          | afficher « Wilaya », cacher « Email »     | table du design                                            |
| Texte de consentement et sa version                                                                                         | « J'accepte… », version `2026-09-01`      | table du design                                            |
| Mentions légales, liens (CGU, confidentialité, contact)                                                                     | nom de l'organisateur, texte du règlement | table du design                                            |
| Apparence du jeu : segments de la roue (libellé, couleur, icône), couverture du grattage, icône des boîtes, cible du Hit It | segment « Presque ! » en rouge            | table du design ; images dans le **stockage de fichiers**  |
| Traductions des questions du quiz                                                                                           | question traduite en arabe                | table du design (**jamais** la bonne réponse)              |
| Affichage des lots : nom, message de gain par langue, icône, image                                                          | « Bon d'achat 1000 DA »                   | table du design ; image dans le **stockage de fichiers**   |
| Options : son, animations                                                                                                   | son coupé                                 | table du design                                            |

**Ce qui reste dans le navigateur** (préférences d'outil, pas du contenu) :

- l'appareil choisi pour l'aperçu et les appareils personnalisés ;
- les participations « démo » du sandbox ;
- une copie de secours des anciens designs faits avant le branchement ;
- le design du mode « autonome » (Studio ouvert sans campagne, sur la campagne démo).

### B2.2 Les règles du gain (Wizard) → inchangé

| Ce que la marque règle dans le Wizard                   | Rangé dans                                      | Visible par le joueur ?                   |
| ------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| Type de jeu                                             | fiche campagne                                  | oui (il le voit en jouant)                |
| Lots et leur nom                                        | table des lots (`prizes`)                       | nom seulement                             |
| Quantités, poids, probabilité de gain, rythme quotidien | lots + fiche campagne                           | **non**                                   |
| Questions du quiz et leurs options                      | table des questions (`quiz_questions`)          | oui                                       |
| **Bonne réponse** de chaque question                    | table des questions                             | **non** (corrigé : aujourd'hui elle fuit) |
| Seuil du quiz, seuil et durée du Hit It                 | fiche campagne (`game_logic_config`)            | oui (pour afficher « 8 touches en 10 s ») |
| Codes coupons                                           | inventaire des coupons (`prize_template_items`) | seulement **son** code, s'il gagne        |
| Nombre de participations par téléphone                  | fiche campagne                                  | non                                       |

### B2.3 La participation (joueur) → sur le serveur

Tout va dans **une ligne par participation**, dans la table des participations (`entries`).

| Ce que le joueur fournit ou obtient  | Exemple                                                                                               | Rangé dans                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Téléphone** (obligatoire)          | `0541 23 45 67` → enregistré `0541234567`                                                             | champ « téléphone » ; il sert aussi à bloquer une 2ᵉ participation                                                      |
| **Nom** (si le champ est affiché)    | « Amine B. »                                                                                          | champ « nom »                                                                                                           |
| **Email** (si le champ est affiché)  | amine@…                                                                                               | champ « email »                                                                                                         |
| **Wilaya** (si le champ est affiché) | « 16 - Alger »                                                                                        | champ libre (`metadata.wilaya`)                                                                                         |
| **Consentement**                     | case cochée à 14h32, version `2026-09-01`, en arabe                                                   | champ libre (`metadata.consent`) : c'est la **preuve** exigée par la loi 18-07                                          |
| Réussite au jeu d'adresse            | quiz réussi / Hit It réussi                                                                           | champ « réussi » (`quiz_passed`) ; le détail des réponses et le nombre de touches ne sont **pas** gardés                |
| **Gagné ou perdu**, et quel lot      | « gagné : bon 1000 DA »                                                                               | champs « gagnant » et « lot »                                                                                           |
| **Code coupon** attribué             | `OOR-7F3K-92`                                                                                         | champ « coupon », plus une ligne dans le registre des coupons (`coupon_redemptions`), pour qu'il ne soit jamais redonné |
| « J'ai copié mon code »              | clic du joueur                                                                                        | champ « coupon confirmé »                                                                                               |
| Informations techniques              | navigateur, temps passé, identifiant de session, identifiant de la tentative, « venu du lien public » | champs techniques + champ libre (`metadata.client_request_id`, `metadata.source`)                                       |

**Les visites** (lien ouvert, formulaire rempli, partie jouée) vont dans la table des statistiques (`campaign_impressions`), comme aujourd'hui. Aucune donnée personnelle n'y est enregistrée.

## B3. Le pipeline, étape par étape

```
 MARQUE (dashboard)                SERVEUR (Supabase)                 JOUEUR (lien public)
 ─────────────────                 ──────────────────                 ────────────────────
 ① Wizard : règles, lots ───────►  fiche campagne, lots, questions
 ② Studio : design ─────────────►  table du design + images
    (aperçu et sandbox :
     tirages DÉMO, rien
     n'est envoyé)
                                   ③ ◄──────────────────────────────  ouvre /play/mon-jeu
                                     renvoie design + infos sûres ──►  voit le design
                                   ④ ◄── visite ──────────────────────
                                   ⑤ ◄──────────────────────────────  remplit, coche, joue
                                     vérifie, tire au sort,
                                     attribue un coupon,
                                     enregistre ─────────────────────►  voit gagné / perdu + code
                                   ⑥ ◄── « j'ai copié » ──────────────
 ⑦ Participants, Analytics ◄─────  participations, statistiques
```

### ① La marque règle les règles du jeu (Wizard), comme aujourd'hui

Rien ne change. Le Wizard enregistre les lots, les quantités, les questions et les seuils. Il ne touche jamais au design.

### ② La marque habille son jeu (Studio)

- **À l'ouverture**, le Studio va chercher sur le serveur le design déjà enregistré de la campagne. S'il n'y en a pas mais que ton navigateur en a un ancien, il l'envoie une fois sur le serveur (import automatique).
- **À chaque modification**, le Studio enregistre tout seul, moins d'une seconde après la dernière frappe. Aucun bouton « Enregistrer ».
- **Si deux personnes modifient en même temps**, la seconde reçoit « This experience was saved meanwhile… Reload ». Rien n'est écrasé sans prévenir.
- **Quand on ajoute une image**, elle est réduite, envoyée dans le stockage de fichiers, et le design ne garde que son adresse.
- **L'aperçu et le sandbox restent en démo** : on peut jouer autant qu'on veut, les tirages sont simulés dans le navigateur (codes `DEMO-…`), et **rien** n'est enregistré dans les vraies participations ni retiré du vrai stock.
- ⚠️ **Publication immédiate** : sur une campagne active, chaque modification enregistrée est vue tout de suite par les joueurs. Un badge « Live » le rappelle.

### ③ Le joueur ouvre le lien public

- La page demande au serveur « la campagne `mon-jeu` ».
- Le serveur renvoie **uniquement** : le design, le nom de la campagne, le type de jeu, les noms des lots, les questions (**sans** la bonne réponse), les seuils affichables, et l'état de la campagne (ouverte / terminée / plus de lots).
- Il ne renvoie **jamais** : les probabilités, les quantités, les bonnes réponses, les codes coupons, les autres participants.
- La page choisit la langue du joueur : l'arabe si son téléphone est en arabe et que la marque a activé l'arabe, sinon la langue par défaut de la marque.
- **Si la campagne est en pause, terminée ou vide**, le joueur voit tout de suite l'écran « Campagne terminée », sans remplir le formulaire pour rien.
- **Si la marque n'a jamais ouvert le Studio**, le joueur voit un design par défaut propre.

### ④ La visite est comptée

Le serveur note « une visite de plus » pour les statistiques, sans nom ni téléphone. C'est fait une fois à l'ouverture, puis une fois à l'envoi du formulaire, au lieu de toutes les 5 secondes.

### ⑤ Le joueur s'inscrit et joue

1. Il remplit **les champs choisis par la marque** et **coche le consentement**. Sans la case cochée, il ne peut pas continuer, et le serveur refuserait de toute façon.
2. Selon le jeu :
   - **Roue, grattage :** la demande part au serveur **avant** l'animation ; la roue tourne ensuite vers le résultat déjà décidé.
   - **Boîte mystère :** le joueur choisit une boîte, puis la demande part.
   - **Quiz :** il répond, les réponses partent ; **le serveur corrige**.
   - **Hit It :** il tape, le nombre de touches part ; **le serveur vérifie le seuil**.
3. **Le serveur, dans l'ordre :**
   - vérifie le téléphone et le consentement ;
   - si c'est un **nouvel essai** après une coupure réseau, redonne **le même résultat** ;
   - vérifie que la campagne est ouverte ;
   - vérifie que ce téléphone n'a pas déjà joué ;
   - vérifie qu'il reste des lots ;
   - décide gagné ou perdu (perdu d'office si le quiz ou le Hit It est raté) ;
   - enregistre la participation ;
   - si gagné, réserve un code coupon **unique** ;
   - répond.
4. Le jeu joue son animation **vers** ce résultat : l'écran ne décide jamais rien.
5. Le joueur voit « Gagné » avec son code, ou « Perdu ». En cas de souci, il voit un message clair : « déjà participé », « campagne terminée », ou « problème de connexion » avec « Réessayer ».

### ⑥ Le joueur confirme son coupon

Quand il clique « J'ai copié mon code », le serveur le note sur sa participation.

### ⑦ La marque consulte les résultats

Dans **Participants** et **Analytics**, comme aujourd'hui, mais **seulement ses propres campagnes** : le serveur l'impose désormais. Les nouvelles informations (wilaya, preuve du consentement) sont dans le champ libre des participations, prêtes à être affichées ou exportées plus tard.

## B4. Les échanges avec le serveur après le plan

Tout ce que le Player Experience fera avec le backend, rien de plus :

| #   | Qui         | Quand                              | Ce qui est échangé                                                             | Sens                                       |
| --- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | Studio      | ouverture d'une campagne           | lire le design enregistré                                                      | serveur → Studio                           |
| 2   | Studio      | après chaque modification (≈ 1 s)  | enregistrer le design (refusé si modifié ailleurs entre-temps)                 | Studio → serveur                           |
| 3   | Studio      | ajout d'une image                  | envoyer le fichier                                                             | Studio → stockage                          |
| 4   | Studio      | 1ʳᵉ ouverture après le branchement | import d'un ancien design du navigateur                                        | Studio → serveur (une seule fois)          |
| 5   | Page joueur | ouverture du lien                  | lire la campagne publique (design + infos sûres + ouverte/fermée)              | serveur → joueur                           |
| 6   | Page joueur | ouverture et envoi du formulaire   | compter une visite                                                             | joueur → serveur (sans donnée personnelle) |
| 7   | Page joueur | au moment du jeu                   | participer : formulaire + consentement + réponse du jeu → gagné/perdu + coupon | joueur ⇄ serveur                           |
| 8   | Page joueur | clic « J'ai copié »                | confirmer le coupon                                                            | joueur → serveur                           |
| —   | Images      | à l'affichage                      | le navigateur télécharge les images depuis le stockage public                  | stockage → écran                           |

Le Studio continue de **lire** les campagnes comme aujourd'hui (échange A3-1), et le Wizard d'**écrire** les règles (échange A3-2). Le repli qui écrivait directement dans la base (A3-5 bis) **disparaît**.

**Ce qui ne parle jamais au serveur :**

- l'aperçu du Studio, le changement d'écran, de langue ou d'appareil ;
- annuler / rétablir ;
- la vérification de la mise en page ;
- les tirages du sandbox (démo) ;
- les animations et les sons.

## B5. Qui peut voir quoi

| Donnée                                 | La marque (connectée) | Une autre marque | Un joueur / visiteur                                       |
| -------------------------------------- | --------------------- | ---------------- | ---------------------------------------------------------- |
| Design du Studio                       | ✅ modifier           | ❌               | ✅ voir (c'est fait pour)                                  |
| Noms des lots, questions               | ✅                    | ❌               | ✅                                                         |
| Probabilités, quantités, stock         | ✅                    | ❌               | ❌                                                         |
| Bonnes réponses du quiz                | ✅                    | ❌               | ❌ (**corrigé**)                                           |
| Codes coupons                          | ✅                    | ❌               | ✅ seulement **le sien**                                   |
| Participants (téléphone, nom, wilaya…) | ✅                    | ❌               | ❌ (**corrigé** : aujourd'hui tout le monde peut les lire) |
| Statistiques                           | ✅                    | ❌ (**corrigé**) | ❌                                                         |
| Décider d'un gain                      | ❌ (seul le serveur)  | ❌               | ❌ (**corrigé** : aujourd'hui on peut tricher)             |

---

# Partie C — Avant / après en un tableau

|                                       | Aujourd'hui                                               | Après le plan                                                                  |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Où est le design du Studio            | dans le `localStorage` de **ton** navigateur              | sur le serveur, dans la table du design (`campaign_experiences`)               |
| Un collègue voit ton design           | ❌                                                        | ✅                                                                             |
| Les joueurs voient ton design         | ❌ (ancienne page, design violet fixe)                    | ✅                                                                             |
| Images                                | collées dans le design, lourdes, limitées à ~5 Mo en tout | fichiers à part dans le stockage, légers pour le joueur                        |
| Vider le navigateur                   | efface le design                                          | n'efface rien                                                                  |
| Champs du formulaire côté joueur      | toujours nom + téléphone                                  | ceux choisis dans le Studio (nom, téléphone, email, wilaya)                    |
| Langue côté joueur                    | fixe                                                      | fr / ar / en selon le choix de la marque et le téléphone du joueur             |
| Qui décide du gain sur la page joueur | le serveur… ou le navigateur si le serveur ne répond pas  | **uniquement** le serveur                                                      |
| Consentement                          | case à cocher, non envoyée, non gardée                    | vérifiée par le serveur, preuve gardée                                         |
| Hit It raté                           | peut gagner                                               | perd toujours                                                                  |
| Coupure réseau pendant le jeu         | le joueur peut perdre son coupon à l'écran                | « Réessayer » redonne le même résultat                                         |
| Deux gagnants en même temps           | peuvent recevoir le même code                             | codes toujours différents                                                      |
| Campagne terminée                     | le joueur le découvre après le formulaire                 | écran « terminée » dès l'ouverture                                             |
| Bonnes réponses du quiz               | visibles par un joueur malin                              | invisibles                                                                     |
| Liste des participants                | lisible par n'importe qui                                 | seulement la marque                                                            |
| Tables de la base                     | —                                                         | **1 nouvelle table** (`campaign_experiences`), aucune table existante modifiée |

---

# Partie D — Scénarios concrets : « je change ceci, c'est stocké où ? »

Chaque scénario donne : **l'action**, **où c'est stocké aujourd'hui**, **où ce sera stocké après le plan**, et **qui le voit**.

### D1. La marque change le titre de l'écran d'accueil dans le Studio

- **Aujourd'hui →** le titre est enregistré dans le `localStorage` de son navigateur (`xp:experience:v1:<campagne>` → `screens.welcome.title`). Seule elle le voit, sur ce navigateur. Les joueurs voient toujours l'ancien titre fixe.
- **Après →** moins d'une seconde plus tard, il est enregistré sur le serveur, dans la table du design (`campaign_experiences.config` → `screens.welcome.title`). Les collègues **et les joueurs** le voient au prochain chargement de la page.

### D2. La marque ajoute son logo

- **Aujourd'hui →** l'image est réduite puis transformée en long texte, collée dans le design, dans le `localStorage`. Plusieurs grandes images peuvent remplir cet espace (« storage full »).
- **Après →** l'image est réduite puis envoyée dans le stockage de fichiers (`campaign-media/<organisation>/experience/<campagne>/logo-….webp`). Le design ne garde que son chemin. Le joueur télécharge une petite image.

### D3. La marque décide d'afficher le champ « Wilaya » et de cacher « Email »

- **Aujourd'hui →** ce réglage est enregistré dans le `localStorage`. Le joueur ne le voit pas : l'ancienne page demande toujours nom + téléphone.
- **Après →** le réglage est dans la table du design (`campaign_experiences.config` → `form.fields`). Le joueur voit le champ Wilaya et pas l'Email. Quand il choisit « 16 - Alger », sa réponse est rangée **dans sa participation** (`entries.metadata.wilaya`).

### D4. La marque modifie le texte de consentement et sa version

- **Aujourd'hui →** texte dans le `localStorage`, invisible pour les joueurs. La case de l'ancienne page n'est pas envoyée au serveur.
- **Après →** le texte et la version sont dans la table du design. Quand un joueur coche, la **preuve** (heure, version, langue) est rangée dans sa participation (`entries.metadata.consent`). Sans case cochée, le serveur refuse la participation.

### D5. La marque change la couleur d'un segment de la roue

- **Aujourd'hui →** `localStorage`, visible seulement dans l'aperçu du Studio.
- **Après →** table du design (`campaign_experiences.config` → `game.wheel.segments`). Le joueur voit la nouvelle couleur. **La probabilité ne change pas** : elle vient du Wizard, pas de la taille ni de la couleur du segment.

### D6. La marque traduit une question du quiz en arabe

- **Aujourd'hui →** traduction dans le `localStorage`.
- **Après →** traduction dans la table du design (`campaign_experiences.config` → `game.quiz.translations`). La question d'origine **et la bonne réponse** restent dans la table des questions (Wizard). La bonne réponse n'est jamais envoyée au joueur.

### D7. La marque change le nom affiché d'un lot (« Bon 1000 DA » → « بطاقة 1000 دج » en arabe)

- **Aujourd'hui →** `localStorage`.
- **Après →** table du design (`campaign_experiences.config` → `prizeDisplay`). Le **vrai** lot, sa quantité et son stock restent dans la table des lots (Wizard).

### D8. La marque change la probabilité de gain ou ajoute un lot (Wizard)

- **Aujourd'hui →** enregistré sur le serveur (fiche campagne, table des lots). Déjà en place.
- **Après →** **identique**. Le Wizard ne touche plus du tout au design du Studio, qui ne peut donc plus être écrasé.

### D9. Un collègue ouvre le Studio sur son ordinateur

- **Aujourd'hui →** il voit les bonnes campagnes (lues sur le serveur), mais **un design vide ou par défaut** : ton design est dans ton navigateur.
- **Après →** il voit **exactement ton design**. Si vous modifiez en même temps, le second reçoit un message de conflit au lieu d'écraser le travail de l'autre.

### D10. La marque joue dans le sandbox

- **Aujourd'hui →** tirage simulé dans le navigateur ; la participation démo est dans le `localStorage` (`xp:demo:entries:v1`).
- **Après →** **identique**, volontairement. Aucune vraie participation n'est créée, aucun vrai lot n'est consommé.

### D11. Un joueur ouvre le lien et joue à la roue

- **Aujourd'hui →**
  - il voit le design violet fixe ;
  - nom et téléphone sont envoyés au tirage (`select-prize`), puis sa participation est rangée dans `entries` ;
  - si le tirage ne répond pas, **son navigateur** tire au sort et écrit lui-même la participation.
- **Après →**
  - il voit le design du Studio ;
  - ses champs, sa preuve de consentement et son identifiant de tentative partent au serveur ;
  - le serveur décide, puis range la participation dans `entries` (téléphone, nom, email, gagné/perdu, lot, coupon ; wilaya et consentement dans `metadata`) ;
  - la roue s'arrête sur le segment du lot gagné, ou sur un segment « perdu ».

### D12. Le joueur gagne et reçoit un code

- **Aujourd'hui →** le code est choisi parmi les codes libres, sans verrou : deux gagnants simultanés peuvent recevoir le même. Il est rangé dans `entries.redeemed_coupon_value` et dans le registre des coupons.
- **Après →** même rangement, mais le code est **réservé** (verrou), donc toujours unique.

### D13. Le joueur perd le réseau pendant le tirage et appuie sur « Réessayer »

- **Aujourd'hui →** le serveur voit un 2ᵉ essai avec le même numéro et répond « déjà participé » : le joueur ne voit jamais son lot.
- **Après →** le serveur reconnaît la même tentative (`metadata.client_request_id`) et renvoie **le même résultat et le même code**. Une seule participation est enregistrée.

### D14. Le joueur clique « J'ai copié mon code »

- **Aujourd'hui →** `entries.coupon_confirmed = true`.
- **Après →** **identique**.

### D15. La marque met la campagne en pause

- **Aujourd'hui →** le statut est rangé dans la fiche campagne. Le joueur voit « campagne fermée » à l'ouverture si la politique manuelle du cloud le permet.
- **Après →** même rangement. Le joueur voit « Campagne terminée » **dès l'ouverture**, avec le design de la marque.

### D16. La marque ouvre ses Participants / son Analytics

- **Aujourd'hui →** les données viennent de `entries` et `campaign_impressions`. Mais n'importe qui, sans compte, peut aussi les lire.
- **Après →** mêmes données, plus wilaya et consentement dans `metadata`. **Seule la marque** peut les lire.

---

## Points à décider ensemble

Ce sont les choix par défaut du plan. On peut les changer avant la tâche concernée.

1. **Publication immédiate ou brouillon ?** Par défaut, immédiate, avec un badge « Live ». Un vrai « brouillon / publier » demande environ 1 jour de plus.
2. **Wilaya et preuve du consentement dans le champ libre, ou dans des colonnes dédiées ?** Par défaut, champ libre : aucune modification de table. Des colonnes dédiées seraient plus simples à filtrer et à exporter dans le dashboard (≈ 0,5 j de plus).
3. **Garder le détail du jeu ?** Aujourd'hui, seul « réussi / raté » est gardé. Veux-tu aussi le score du quiz, les réponses données ou le nombre de touches au Hit It (utile pour les statistiques) ? C'est peu de travail : le mettre dans le champ libre.
4. **Afficher la wilaya et le consentement dans Participants / l'export ?** Ce n'est pas prévu dans le plan (les données seront là, mais pas encore affichées).
5. **Mode « autonome » du Studio** (sans campagne, sur la campagne démo) : il reste dans le navigateur. D'accord ?
