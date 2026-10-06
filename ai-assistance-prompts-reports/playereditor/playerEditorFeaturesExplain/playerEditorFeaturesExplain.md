# L'éditeur d'écrans joueur (Studio) : ce qu'il fera, en images

**Date :** 2026-09-21
**But de ce document :** montrer le **résultat final** de l'éditeur et chacune de ses fonctionnalités, sans entrer dans la technique, pour **valider ou améliorer** avant de commencer l'implémentation.
**Basé sur :** [`plan.md`](../plan&tasks/plan.md) et [`tasks.md`](../plan&tasks/tasks.md), dans leur version révisée du 2026-09-21.

> **Comment lire les images.** Les maquettes sont des croquis : elles montrent l'organisation et le contenu, pas le design final (couleurs, arrondis, icônes).
>
> **Langues.** Les libellés de l'éditeur sont en **anglais** (règle du projet). Le contenu vu par les joueurs est en **français, arabe et anglais**.

---

## Sommaire

1. [L'idée en 30 secondes](#1-lidée-en-30-secondes)
2. [Le Studio en un coup d'œil](#2-le-studio-en-un-coup-dœil)
3. [Une campagne prête en 25 minutes](#3-une-campagne-prête-en-25-minutes)
4. [Les fonctionnalités, une par une](#4-les-fonctionnalités-une-par-une)
5. [Le résultat : ce que voit le joueur](#5-le-résultat--ce-que-voit-le-joueur)
6. [Les garde-fous : ce qui est volontairement impossible](#6-les-garde-fous--ce-qui-est-volontairement-impossible)
7. [Ce que cette première version ne fait pas encore](#7-ce-que-cette-première-version-ne-fait-pas-encore)
8. [À valider avant de commencer](#8-à-valider-avant-de-commencer)
9. [Idées d'amélioration, à décider](#9-idées-damélioration-à-décider)

---

## 1. L'idée en 30 secondes

Le Studio est l'endroit où une marque **habille** sa campagne : style, couleurs, textes, formulaire, présentation du jeu. Elle remplit des formulaires simples et voit le résultat en direct. Elle ne dessine rien et ne place rien à la main : la mise en page est déjà faite, et elle est belle sur tous les écrans.

```
RÉGLAGES DE CAMPAGNE            STUDIO                          ÉCRAN DU JOUEUR
(existent déjà)                 (l'éditeur d'écrans)            (téléphone, PC...)

┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│ Type de jeu          │        │ Style et couleurs    │        │ Accueil + animation  │
│ Lots et quantités    │  ───►  │ Textes fr / ar / en  │  ───►  │ Inscription          │
│ Chances de gain      │        │ Formulaire, légal    │        │ Jeu                  │
│ Questions du quiz    │        │ Présentation du jeu  │        │ Gain ou perte        │
│ Seuils de réussite   │        │ Test sur tout écran  │        │                      │
└──────────────────────┘        └──────────────────────┘        └──────────────────────┘
→ ce qui se joue                → comment ça se montre          → ce que le joueur vit
```

**Les quatre promesses du Studio :**

| Promesse                                         | En pratique                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Ce que vous voyez est ce que le joueur verra** | L'aperçu n'est pas une image : c'est le vrai écran du joueur, à sa vraie taille                                                |
| **Impossible de casser l'écran**                 | On choisit et on remplit ; on ne déplace rien. Un bouton ne peut pas sortir de l'écran, un texte ne peut pas devenir illisible |
| **Beau sur tous les écrans**                     | Du plus petit téléphone pliable au grand écran d'ordinateur, en portrait comme en paysage                                      |
| **Conforme par construction**                    | Consentement, mentions légales et protection contre les participations multiples sont intégrés : on ne peut pas les retirer    |

---

## 2. Le Studio en un coup d'œil

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ (1) Campaign: Rentrée Zeta ▼    Undo  Redo    ● Saved    ! 2 issues    [ Open in window ]│
├───────────────┬──────────────────────────────────┬───────────────────────────────────────┤
│ (2) MENU      │ (3) RÉGLAGES : Brand             │ (4) APERÇU EN DIRECT                  │
│               │                                  │ Welcome Register Play Win Lose        │
│ > Template    │ Name    [ Zeta Market       ]    │ FR  AR  EN    Mode: Full flow ▼       │
│   Brand       │ Logo    [ Upload ] [ Remove ]    │ (5) iPhone 12-14 ▼ 390×844  Fit       │
│   Content     │ Primary [■] #1E7A46   AA OK      │       ┌──────────────────┐            │
│   Sections    │ Mode    (•) Dark  ( ) Light      │       │ ZETA MARKET    ● │            │
│   Form        │ Corners Sharp Rounded [Pill]     │       │                  │            │
│   Game        │ Background Mesh ▼                │       │ Tentez votre     │            │
│   Legal       │ Overlay ───────●── 85 %          │       │ chance !         │            │
│   Share       │                                  │       │    (la roue)     │            │
│               │                                  │       │                  │            │
│ (6) Validation│                                  │       │ [LANCER LE JEU]  │            │
│   2 warnings  │                                  │       │ Privacy · Terms  │            │
│               │                                  │       └──────────────────┘            │
│               │                                  │   390×844 · une colonne · 100 %       │
└───────────────┴──────────────────────────────────┴───────────────────────────────────────┘
```

| Zone                      | Rôle                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **(1) Barre du haut**     | Choix de la campagne · annuler / rétablir · état de la sauvegarde · nombre de problèmes à corriger · ouvrir l'aperçu dans une fenêtre séparée |
| **(2) Menu**              | Les 8 rubriques de réglages : Template, Brand, Content, Sections, Form, Game, Legal, Share                                                    |
| **(3) Réglages**          | Le formulaire de la rubrique choisie                                                                                                          |
| **(4) Aperçu en direct**  | Le vrai écran du joueur, qui change à chaque modification ; choix de l'écran, de la langue et du mode de test                                 |
| **(5) Barre d'appareils** | Téléphones, tablettes, ordinateurs, ou taille libre, comme l'outil « Inspecter » du navigateur                                                |
| **(6) Validation**        | La liste de ce qu'il faut corriger ou améliorer, avec un lien direct vers le bon champ                                                        |

---

## 3. Une campagne prête en 25 minutes

Exemple : « Zeta Market », chaîne de supérettes, lance une roue de la fortune pour la rentrée. La campagne (lots, chances, dates) a déjà été créée dans les réglages de campagne habituels.

| Étape | Ce que fait la marque                                                                                             | Durée  |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| 1     | Ouvre le Studio : un écran complet s'affiche déjà (style par défaut, textes prêts, roue construite avec ses lots) | 10 s   |
| 2     | Choisit un style de départ                                                                                        | 1 min  |
| 3     | Met son logo, ses couleurs, une photo de fond                                                                     | 3 min  |
| 4     | Adapte les textes en français et en arabe                                                                         | 10 min |
| 5     | Règle la carte « jackpot » et les petites étiquettes de lots                                                      | 2 min  |
| 6     | Choisit les champs du formulaire                                                                                  | 1 min  |
| 7     | Personnalise la roue : libellés, couleurs, segments « Rejouez »                                                   | 3 min  |
| 8     | Teste : gagne, perd, rejoue avec le même numéro, sur plusieurs téléphones                                         | 5 min  |

**Il n'y a rien à enregistrer :** tout est sauvegardé automatiquement au fil de l'eau.

---

## 4. Les fonctionnalités, une par une

### 4.1 Choisir un style (Template)

Le point de départ : un style complet, prêt à l'emploi, qu'on ajuste ensuite.

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ ■■■■■■■■■■ │  │ ■■■■■■■■■■ │  │ ■■■■■■■■■■ │  │ ■■■■■■■■■■ │  │ ■■■■■■■■■■ │
│ Midnight   │  │ Obsidian   │  │ Clean      │  │ Telecom    │  │ Retail     │
│ Gold       │  │ Violet     │  │ Light      │  │ Red        │  │ Blue       │
│ dark       │  │ dark       │  │ light      │  │ dark       │  │ light      │
│ ● selected │  │            │  │            │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘

  [ Apply ]    [ Reset to preset ]
```

| Style               | Ambiance                                                     |
| ------------------- | ------------------------------------------------------------ |
| **Midnight Gold**   | Sombre et doré, premium. C'est le design de référence actuel |
| **Obsidian Violet** | Sombre et violet, moderne                                    |
| **Clean Light**     | Clair et épuré                                               |
| **Telecom Red**     | Rouge vif, énergique                                         |
| **Retail Blue**     | Clair et bleu, grande distribution                           |

- **Appliquer un style** change les couleurs, le fond, les arrondis et la police. Si des modifications ont déjà été faites, le Studio demande confirmation.
- **« Reset to preset »** revient au style d'origine.
- Aucun style ne porte le nom d'une vraie marque.

### 4.2 Mettre la campagne aux couleurs de la marque (Brand)

```
┌────────────────────────────────────────────────────────────────┐
│ Brand                                                          │
├────────────────────────────────────────────────────────────────┤
│ Name         [ Zeta Market                      ]              │
│ Tagline      [ Le bon prix, près de chez vous   ]  FR AR EN    │
│ Logo         [ Upload image ]   or   [ Pick an icon ▼ ]        │
│                                                                │
│ Colors       Primary   [■] #1E7A46    Contrast AA  OK          │
│              Secondary [■]   Accent [■]                        │
│              Surface   [■]   Text   [■]                        │
│ Mode         (•) Dark    ( ) Light                             │
│                                                                │
│ Background   Solid  Gradient  [Mesh]  Dots  Image              │
│              Image  [ Upload ]      Overlay ──────●── 85 %     │
│              Focus point: click on the image   (+)             │
│                                                                │
│ Corners      Sharp    Rounded    [Pill]                        │
│ Font         [Poppins]    Plus Jakarta Sans                    │
└────────────────────────────────────────────────────────────────┘
```

| Réglage                         | Ce qu'il permet                                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nom et slogan**               | Affichés en haut de chaque écran ; le slogan existe en fr / ar / en                                                                                 |
| **Logo**                        | Une image importée, un lien vers une image, ou une icône de la bibliothèque                                                                         |
| **5 couleurs**                  | Principale (boutons), secondaire, accent, fond, texte. **Un indicateur de lisibilité** prévient si un texte devient difficile à lire sur sa couleur |
| **Mode sombre / clair**         | Pour tout l'écran joueur                                                                                                                            |
| **Fond**                        | Uni, dégradé, « mesh », points, ou **photo de la marque** avec un voile réglable pour garder les textes lisibles                                    |
| **Point d'intérêt de la photo** | On clique sur l'élément important de la photo (un produit, un visage) : il reste visible quel que soit l'écran (voir ci-dessous)                    |
| **Arrondis**                    | Carrés, arrondis ou très arrondis                                                                                                                   |
| **Police**                      | Deux choix pour le latin ; l'arabe utilise toujours _Noto Sans Arabic_                                                                              |

**Le point d'intérêt, pourquoi ?** Une même photo est recadrée différemment sur un téléphone (étroit et haut) et sur un ordinateur (large et bas). Le point choisi reste toujours dans le cadre.

```
Photo importée              Téléphone      Ordinateur
┌──────────────────────┐    ┌─────────┐    ┌────────────────────────────┐
│                      │    │         │    │                            │
│      (+) produit     │    │  (+)    │    │          (+) produit       │
│                      │    │         │    │                            │
│                      │    │         │    └────────────────────────────┘
└──────────────────────┘    │         │
                            └─────────┘
```

### 4.3 Écrire les textes, en trois langues (Content)

On choisit un écran (Welcome, Register, Play, Win, Lose), puis on remplit ses textes.

```
┌────────────────────────────────────────────────────────────────┐
│ Content      Screen: [Welcome]  Register  Play  Win  Lose      │
├────────────────────────────────────────────────────────────────┤
│ Title             [FR]  AR  EN                      34/60      │
│   [ Tentez votre chance instantanément            ]            │
│ Subtitle          [FR]  AR !  EN      AR: missing translation  │
│   [ Jouez en 30 secondes, repartez avec un cadeau ]            │
│ Hero visual       None  [Badge]  Trophy  Gift  Timer           │
│ Show header       [x]                                          │
│ Main button       [ Lancer le jeu ]                            │
│ Second button     [ ]  off                                     │
├────────────────────────────────────────────────────────────────┤
│ Languages         [x] FR (default)   [x] AR   [ ] EN           │
└────────────────────────────────────────────────────────────────┘
```

- **Chaque texte existe en français, en arabe et en anglais.** Un badge signale une traduction manquante ; dans ce cas, le joueur voit la langue par défaut.
- **Les textes arabes** s'affichent automatiquement de droite à gauche, avec la bonne police.
- **Un compteur de caractères** prévient quand un titre risque de dépasser 2 lignes sur un petit téléphone.
- **Par écran**, on règle aussi :
  - l'en-tête (affiché ou non) ;
  - un petit visuel (badge, trophée, cadeau, chrono) ;
  - un texte d'encouragement (« 1 essai restant », « Plus que 10 secondes ») ;
  - le bouton principal et un éventuel bouton secondaire.
- **Les textes par défaut changent selon le jeu :** une roue et un quiz n'ont pas le même titre d'accueil.
- **Les langues proposées** au joueur et la langue par défaut se choisissent ici.

### 4.4 L'écran d'accueil et ses blocs (Sections)

Tous les écrans suivent la **même organisation en 8 zones**, toujours dans le même ordre. Une zone peut être vide ; elle ne change jamais de place. C'est ce qui garantit un bel écran partout.

```
┌────────────────────────────┐
│ [Z] ZETA MARKET          ● │  ← 1. En-tête : logo, nom de la marque
│                            │
│ Tentez votre chance        │  ← 3. Titre (2 lignes maximum)
│ instantanément             │
│ Jouez en 30 s, repartez    │  ← 4. Sous-titre
│ avec un cadeau             │
│                            │
│        .  5000 DA  .       │  ← 5. L'animation du jeu choisi
│    Presque !     -30 %     │
│   .     ( JOUER )     .    │  ←    (ici la roue, qui tourne seule)
│    Sac Zeta      10 Go     │
│        '  Rejouez  '       │
│                            │
│ ┌────────────────────────┐ │
│ │ OFFRE RENTRÉE  Gagnant │ │  ←    Carte « jackpot » (optionnelle)
│ │ Panier 5 000 DA · -30% │ │
│ └────────────────────────┘ │
│ [5 000 DA] [10 Go] [-30%]  │  ←    Chips de lots (1 à 4, optionnels)
│                            │
│ [     LANCER LE JEU     ]  │  ← 7. Un seul bouton principal
│ Privacy · Terms · Support  │  ← 8. Liens légaux : toujours présents
└────────────────────────────┘
```

_Les zones 2 (petit visuel) et 6 (encouragement) sont vides sur cet exemple._

Deux blocs optionnels mettent les lots en valeur sur l'accueil :

| Bloc                   | Réglages                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Carte « jackpot »**  | Activer ou non ; petit titre (« OFFRE RENTRÉE »), texte principal, badge (« Gagnant »), icône |
| **Étiquettes de lots** | De 1 à 4 étiquettes : icône, valeur (« 5 000 DA »), légende (« Cash immédiat »), couleur      |

### 4.5 Le formulaire d'inscription (Form)

```
┌────────────────────────────────────────────────────────────────┐
│ Form                                                           │
├────────────────────────────────────────────────────────────────┤
│ Field         Shown   Required   Label                         │
│ Full name      [x]      [x]      Nom complet                   │
│ Phone          [x]      [x]      Numéro de téléphone   locked  │
│ Email          [ ]      [ ]      Adresse email                 │
│ Wilaya         [x]      [ ]      Wilaya (liste des 58)         │
├────────────────────────────────────────────────────────────────┤
│ Consent text  (required, never pre-checked)                    │
│   [ J'accepte la politique de confidentialité et le    ]       │
│   [ règlement de l'offre.                              ]       │
│ Policy version  [ 2026-09-01 ]                                 │
└────────────────────────────────────────────────────────────────┘
```

- **Champs disponibles :** nom complet, téléphone, email, wilaya (liste des 58 wilayas). Chacun peut être affiché ou non, obligatoire ou non, et son libellé traduit.
- **Le téléphone est verrouillé : toujours affiché, toujours obligatoire.** C'est lui qui empêche une même personne de jouer plusieurs fois. Tous les formats sont acceptés (`0555…`, `+213 555…`, avec ou sans espaces).
- **Le consentement est obligatoire :**
  - son texte ne peut pas être vide ;
  - la case n'est **jamais cochée d'avance** ;
  - le joueur ne peut pas continuer sans la cocher (loi 18-07).
- **La version de la politique** est enregistrée avec chaque accord, pour savoir à quel texte le joueur a consenti.

### 4.6 Le jeu (Game)

Le panneau Game a **deux parties**, et c'est un point important à valider :

| Partie                               | Contenu                                                                                                         | Modifiable ici ?                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Règles de la campagne** (en haut)  | Type de jeu, chances de gain, lots avec leur stock, questions du quiz avec la bonne réponse, seuils de réussite | **Non.** Affichées pour information, avec un bouton **« Edit in campaign settings »** qui ouvre directement la bonne étape des réglages de campagne. Au retour, l'aperçu est à jour |
| **Présentation du jeu** (en dessous) | Comment les lots s'affichent, l'apparence du jeu, l'animation d'accueil                                         | **Oui**                                                                                                                                                                             |

**Pourquoi cette séparation ?** Tout ce qui décide **qui gagne** (lots, chances, bonnes réponses, seuils) est géré à un seul endroit, vérifié par le serveur. Le Studio gère **ce qui se voit**. Ainsi, l'aperçu ne peut jamais dire « gagné » quand la vraie campagne dirait « perdu ».

#### Exemple : la roue de la fortune

```
┌────────────────────────────────────────────────────────────────────┐
│ Game · Lucky Wheel                                                 │
├────────────────────────────────────────────────────────────────────┤
│ CAMPAIGN RULES  (read only)      [ Edit in campaign settings ]     │
│ Win chance 60 %  ·  1 entry per phone number                       │
│ Prize                     Stock left      Weight                   │
│ Panier 5 000 DA            38 / 50          10                     │
│ Bon -30 %                 120 / 200         40                     │
│ 10 Go                      70 / 100         30                     │
│ Sac Zeta                   15 / 20          20                     │
├────────────────────────────────────────────────────────────────────┤
│ PRIZE DISPLAY                                                      │
│ Panier 5 000 DA   Label       FR [Panier 5000 DA]  AR  EN          │
│                   Win message [Bravo, votre panier ...]            │
│                   Icon [gift ▼]   Image [ Upload ]                 │
├────────────────────────────────────────────────────────────────────┤
│ WHEEL SEGMENTS  (8)                  [ Generate from prizes ]      │
│ #  Prize              Label        Color   Icon                    │
│ 1  Panier 5 000 DA    5000 DA       [■]    coins      ▲ ▼ x        │
│ 2  Lose segment       Presque !     [■]    -          ▲ ▼ x        │
│ 3  Bon -30 %          -30 %         [■]    percent    ▲ ▼ x        │
│ 4  10 Go              10 Go         [■]    zap        ▲ ▼ x        │
│ 5  Sac Zeta           Sac Zeta      [■]    gift       ▲ ▼ x        │
│ 6  Lose segment       Rejouez       [■]    -          ▲ ▼ x        │
│ ...                                          [ + Add segment ]     │
│ Hub label [ JOUER ]    Segment size does not reflect odds          │
├────────────────────────────────────────────────────────────────────┤
│ WELCOME ANIMATION   (•) Animated   ( ) Still                       │
│ Caption  [ automatic: « 4 lots à gagner »            ]             │
└────────────────────────────────────────────────────────────────────┘
```

- **Affichage des lots :** nom et message de gain de chaque lot, en fr / ar / en, avec une icône ou une image. Par exemple, « Panier 5 000 DA » devient « Panier 5000 DA » sur la roue et « Bravo, votre panier vous attend ! » sur l'écran de gain.
- **Segments de la roue :**
  - « Generate from prizes » crée un segment par lot, plus un segment perdant ;
  - de **4 à 12 segments**, que l'on peut réordonner ;
  - **un même lot peut apparaître plusieurs fois**, et on peut ajouter plusieurs segments perdants aux libellés différents (« Rejouez », « Presque ! ») ;
  - pour chaque segment : libellé, couleur, icône.
- **La taille des segments ne reflète pas les chances**, qui se règlent dans les réglages de campagne. Le Studio l'indique clairement.
- **Le centre de la roue** porte un texte au choix (« JOUER »).

#### Exemple : le quiz

```
┌────────────────────────────────────────────────────────────────────┐
│ Game · Quiz                                                        │
├────────────────────────────────────────────────────────────────────┤
│ CAMPAIGN RULES (read only)       [ Edit in campaign settings ]     │
│ 3 questions  ·  pass with 50 %  ·  no timer                        │
├────────────────────────────────────────────────────────────────────┤
│ QUESTIONS & TRANSLATIONS                                           │
│ Q1  Quel est l'indicatif téléphonique de l'Algérie ?               │
│     a) +213  OK      b) +212        c) +216                        │
│     FR  OK     AR  OK     EN  missing          [ Translate ]       │
│                                                                    │
│ Q2  En quelle année Zeta a ouvert son premier magasin ?            │
│     a) 2008          b) 2012  OK    c) 2015                        │
│     FR  OK     AR  OUTDATED                    [ Review ]          │
│                                                                    │
│ Q3  Quel rayon propose -30 % cette semaine ?                       │
│     a) Épicerie      b) Boissons    c) Hygiène  OK                 │
│     FR  OK     AR  missing                     [ Translate ]       │
├────────────────────────────────────────────────────────────────────┤
│ Arabic: 1 / 3 translated    English: 0 / 3 translated              │
└────────────────────────────────────────────────────────────────────┘
```

- **Les questions, leurs réponses et la bonne réponse** se saisissent dans les réglages de campagne (« Challenge Builder »). Le Studio les affiche en lecture seule, la bonne réponse marquée « OK ».
- **Le Studio permet de les traduire** en français, en arabe et en anglais : le joueur arabophone lit le quiz en arabe.
- **Si une question est modifiée** ensuite dans les réglages de campagne, sa traduction est marquée **« OUTDATED »** et le joueur voit la version d'origine jusqu'à ce que la traduction soit relue.
- **Traduire ne change jamais la bonne réponse.**

#### Les autres jeux

| Jeu                | Ce que la marque personnalise dans le Studio                           | Ce qui reste dans les réglages de campagne |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------ |
| **Grattage**       | Image et texte du ticket à gratter, part à gratter avant la révélation | Lots et chances                            |
| **Boîtes mystère** | Icône et couleur des 3 boîtes                                          | Lots et chances                            |
| **Hit It**         | Icône ou image de la cible                                             | Nombre de touches à réussir ; durée (10 s) |
| **Tous les jeux**  | Affichage des lots, animation d'accueil                                | Type de jeu                                |

### 4.7 L'animation d'accueil de chaque jeu

Sur l'écran d'accueil, le joueur voit **son jeu en train de « se jouer tout seul »**, comme le mode démo d'une borne d'arcade. L'animation change automatiquement selon le jeu de la campagne.

```
┌────────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐
│ ROUE                   │   │ GRATTAGE               │   │ BOÎTES MYSTÈRE         │
├────────────────────────┤   ├────────────────────────┤   ├────────────────────────┤
│         ▼              │   │                        │   │                        │
│      .  5000  .        │   │ ┌────────────────────┐ │   │   ┌───┐  ┌───┐  ┌───┐  │
│   Presque    -30 %     │   │ │ ░░░░░▒▒▒ (o) ░░░░░ │ │   │   │ ? │  │ ? │  │ ? │  │
│  .    ( JOUER )    .   │   │ │ ░░ GRATTEZ ICI ░░░ │ │   │   └───┘  └───┘  └───┘  │
│   Sac         10 Go    │   │ │ ░░░░░░░░░░░░░░░░░░ │ │   │     ^                  │
│      '  Rejouez '      │   │ └────────────────────┘ │   │                        │
├────────────────────────┤   ├────────────────────────┤   ├────────────────────────┤
│ tourne doucement,      │   │ une pièce gratte,      │   │ flottent à tour de     │
│ ne s'arrête jamais     │   │ aucun lot n'apparaît   │   │ rôle, restent fermées  │
└────────────────────────┘   └────────────────────────┘   └────────────────────────┘

┌────────────────────────┐   ┌────────────────────────┐
│ QUIZ                   │   │ HIT IT            DÉMO │
├────────────────────────┤   ├────────────────────────┤
│                        │   │                        │
│ ┌────────────────────┐ │   │    (o)          7 / 8  │
│ │ Question 1 / 3     │ │   │                        │
│ │ (  ?  )  (  ?  )   │ │   │            (o)         │
│ │ (  ?  )  (  ?  )   │ │   │                        │
│ └────────────────────┘ │   │  [■■■■■■□□□□]  6 s     │
├────────────────────────┤   ├────────────────────────┤
│ « 3 questions »        │   │ « 8 touches en 10 s »  │
│ texte jamais dévoilé   │   │ compteur de démo       │
└────────────────────────┘   └────────────────────────┘
```

**Quatre règles :**

1. **Elle montre le jeu, jamais un gain.** La roue tourne sans s'arrêter sur un lot, le ticket ne révèle rien, les boîtes restent fermées. Montrer un gain serait une promesse trompeuse.
2. **Elle n'est pas jouable.** La toucher mène à l'inscription, comme le bouton « Lancer le jeu ». On ne joue qu'après avoir donné son consentement.
3. **C'est le vrai jeu de la campagne :** mêmes segments, mêmes couleurs, même ticket, vrai nombre de questions. Modifier la roue dans le Studio modifie aussi l'animation.
4. **Elle économise le téléphone :** elle s'arrête quand elle n'est pas visible, et devient une image fixe pour les personnes qui ont réduit les animations sur leur appareil.

**Réglages :** animée ou fixe ; une légende automatique (« 4 lots à gagner », « 3 questions », « 8 touches en 10 s »), que la marque peut remplacer. Une légende qui promettrait un gain (« 100 % gagnant ») déclenche un avertissement.

### 4.8 Les mentions légales (Legal)

- **Organisateur :** nom de la société qui organise le jeu.
- **Liens du pied de page** (conditions, confidentialité, support, autre) : chacun avec son libellé et sa cible. Seuls les liens sûrs sont acceptés : site web sécurisé, email ou téléphone.
- **Mention courte** en bas de chaque écran, et un **bandeau défilant** optionnel.
- **Texte complet des mentions légales**, en trois langues, ouvert dans une fenêtre par-dessus le jeu.
- **Le pied de page légal est présent sur tous les écrans** et ne peut pas être supprimé.

### 4.9 Sauvegarder, annuler, transmettre (Share)

| Fonction                              | Ce qu'elle fait                                                                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sauvegarde automatique**            | Environ une seconde après chaque modification. La barre du haut affiche « Saving… » puis « Saved », ou « Error » avec un bouton « Retry ». Le Studio prévient si l'on ferme la page alors qu'une sauvegarde a échoué |
| **Annuler / rétablir**                | Jusqu'à 50 retours en arrière. Changer d'appareil dans l'aperçu ne compte pas comme une modification                                                                                                                 |
| **Exporter**                          | Télécharge un fichier de configuration, pour transmettre le design ou le garder en sécurité                                                                                                                          |
| **Importer**                          | Recharge un fichier exporté. Un fichier abîmé est refusé avec un message clair, sans rien casser                                                                                                                     |
| **Réinitialiser les données de test** | Efface les participations de test, pour pouvoir rejouer avec le même numéro                                                                                                                                          |

### 4.10 L'aperçu en direct

L'aperçu est **le vrai écran du joueur**, affiché à sa vraie taille, pas une image.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Welcome]  Register  Play  Win  Lose  Status        FR  AR  EN               │
│ Mode:  (•) Full flow (demo)   ( ) Scripted ▼   ( ) Still screen              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Responsive ▼   [ 390 ] × [ 844 ]   Zoom Fit ▼   Rotate  Frame  Window        │
│ ├ petit ┼─── téléphone ───┼──── tablette ────┼──── 2 volets ─────┤           │
│                                                                              │
│                  ┌────────────────┐                                          │
│                  │                │                                          │
│                  │    l'écran du  │                                          │
│                  │      joueur,   │ ◄► poignée                               │
│                  │    à sa taille │    (largeur)                             │
│                  │      réelle    │                                          │
│                  │                │                                          │
│                  └────────────────┘                                          │
│                          ▲ poignée (hauteur)     ◢ coin                      │
│                                                                              │
│   390 × 844 · une colonne · 100 %                          DEMO              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Choisir ce qu'on regarde :**

- **l'écran :** accueil, inscription, jeu, gain, perte, statut (déjà participé, campagne terminée, problème de connexion) ;
- **la langue :** français, arabe (l'écran passe de droite à gauche) ou anglais.

**Trois façons de tester :**

| Mode                 | À quoi il sert                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full flow (demo)** | Jouer la campagne comme un vrai joueur : s'inscrire, jouer, gagner ou perdre selon les vraies chances. Rejouer avec le même numéro affiche « déjà participé ». Les codes gagnés commencent par `DEMO-` : impossible de les confondre avec de vrais codes |
| **Scripted**         | **Choisir le résultat** pour vérifier chaque écran, même ceux qu'on verrait rarement (voir la liste ci-dessous)                                                                                                                                          |
| **Still screen**     | Un écran figé, pour travailler les textes sans jouer                                                                                                                                                                                                     |

```
┌──────────────────────────────┐
│ Scripted scenario ▼          │
├──────────────────────────────┤
│ Win · Panier 5 000 DA        │
│ Win · Bon -30 %              │
│ Win · 10 Go                  │
│ Win · Sac Zeta               │
│ Lose                         │
│ Already played               │
│ Campaign closed              │
│ Network error                │
└──────────────────────────────┘
```

**La barre d'appareils, comme l'outil « Inspecter » du navigateur :**

- **Des appareils prêts à l'emploi,** avec en priorité les téléphones courants en Algérie :

```
┌──────────────────────────────────┐
│ Responsive (taille libre)        │
│ ── Phones ────────────────────── │
│ Android compact        360×640   │
│ Android entrée gamme   360×800   │
│ Galaxy S8+             360×740   │
│ iPhone SE              375×667   │
│ iPhone 12-14           390×844   │
│ Redmi Note             393×873   │
│ Galaxy A5x             412×915   │
│ iPhone Pro Max         430×932   │
│ Galaxy Z Fold (fermé)  344×882   │
│ Galaxy Fold            280×653   │
│ ── Tablets ───────────────────── │
│ iPad Mini              768×1024  │
│ Android tablet         800×1280  │
│ iPad Pro 11"           834×1194  │
│ ── Laptops & desktops ────────── │
│ Laptop HD              1366×657  │
│ Laptop                 1536×753  │
│ Desktop Full HD        1920×969  │
│ ── Custom ────────────────────── │
│ Mon Samsung            384×854   │
│ Edit custom devices…             │
└──────────────────────────────────┘
```

- **Le mode Responsive :** on attrape le bord de l'écran et on le **tire à la souris**, ou on tape une largeur et une hauteur. L'écran du joueur s'adapte en direct.
- **La rotation :** passer un téléphone en paysage d'un clic.
- **Le zoom :** agrandir ou réduire l'affichage (50 % à 150 %) sans changer l'écran lui-même.
- **La règle des tailles :** une barre cliquable montre où l'écran change d'organisation (petit téléphone, téléphone, tablette, deux volets).
- **Mes appareils :** enregistrer ses propres tailles (« Mon Samsung »).
- **Le cadre d'appareil :** afficher ou masquer la coque du téléphone.
- **Ouvrir dans une fenêtre :** l'aperçu en plein onglet, mis à jour en direct, pour tester avec les vrais outils du navigateur.
- **Un indicateur** rappelle ce qu'on regarde : `390 × 844 · une colonne · 100 %`.

### 4.11 Le contrôle qualité (Validation)

```
┌────────────────────────────────────────────────────────────────────┐
│ Validation                          2 errors · 2 warnings          │
├────────────────────────────────────────────────────────────────────┤
│ ERROR    Consent text is empty                     → Form          │
│ ERROR    "Bon -30 %" has no wheel segment         → Game           │
│ WARNING  At 360×640: subtitle is truncated         → Content       │
│ WARNING  Arabic translation missing (title)        → Content       │
├────────────────────────────────────────────────────────────────────┤
│ [ Check all sizes ]    last check: 26 devices · 1 problem          │
└────────────────────────────────────────────────────────────────────┘
```

- **Erreurs :** ce qui doit être corrigé. Par exemple : consentement vide, lot absent de la roue, texte illisible sur sa couleur, lien non sécurisé, roue de moins de 4 segments.
- **Avertissements :** des conseils. Par exemple : titre trop long, traduction manquante ou périmée, image trop lourde, promesse de gain trompeuse.
- **Contrôle par taille d'écran :** le Studio vérifie en permanence l'écran affiché et prévient quand **le contenu de la marque** casse sur un appareil donné (« At 360×640: subtitle is truncated »).
- **« Check all sizes »** passe en revue tous les appareils de la liste, en portrait et en paysage, et liste les problèmes trouvés.
- **Un clic sur un problème** ouvre directement le champ à corriger.

---

## 5. Le résultat : ce que voit le joueur

### 5.1 Le parcours complet

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ 1 · ACCUEIL          │   │ 2 · INSCRIPTION      │   │ 3 · JEU              │
├──────────────────────┤   ├──────────────────────┤   ├──────────────────────┤
│ [Z] ZETA MARKET    ● │   │ Nom complet          │   │ [Z] ZETA MARKET    ● │
│ Tentez votre chance  │   │ [                  ] │   │ Tournez la roue !    │
│                      │   │ Téléphone            │   │                      │
│    (roue qui tourne) │   │ [ 05 55 12 34 56   ] │   │     >> la roue <<    │
│                      │   │ Wilaya         ▼     │   │     >> tourne  <<    │
│ OFFRE RENTRÉE        │   │ [ Oran            ]  │   │                      │
│ [5000 DA][10 Go]     │   │ [ ] J'accepte le     │   │ 1 essai              │
│                      │   │     règlement        │   │                      │
│ [  LANCER LE JEU  ]  │   │ [  PARTICIPER  ]     │   │ [ TOURNER LA ROUE ]  │
│ Privacy · Terms      │   │ (grisé sans case)    │   │ Privacy · Terms      │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘

┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ 4 · GAIN             │   │ 5 · PERTE            │   │ 6 · STATUT           │
├──────────────────────┤   ├──────────────────────┤   ├──────────────────────┤
│ Bravo !              │   │ Pas de chance        │   │ Vous avez déjà       │
│                      │   │ cette fois !         │   │ participé avec       │
│ Panier 5 000 DA      │   │                      │   │ ce numéro.           │
│ Votre panier vous    │   │ Merci d'avoir joué.  │   │                      │
│ attend en magasin.   │   │ Suivez-nous pour     │   │ ou : campagne        │
│                      │   │ les prochaines       │   │ terminée             │
│ DEMO-7K2F-9QX4       │   │ offres.              │   │                      │
│ [ Copier le code ]   │   │                      │   │ ou : problème de     │
│ [J'ai copié mon code]│   │ [ Partager ]         │   │ connexion            │
│ Partager             │   │ [ Retour ]           │   │ [ Réessayer ]        │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

| Écran               | Ce qui s'y passe                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Accueil**     | La marque, l'accroche, l'animation du jeu, les lots mis en valeur, un seul bouton                                                         |
| **2 · Inscription** | Les champs choisis par la marque ; la case de consentement, jamais cochée d'avance ; le bouton reste grisé tant que tout n'est pas valide |
| **3 · Jeu**         | Le jeu lui-même. Le résultat est décidé par le serveur, jamais par le téléphone                                                           |
| **4 · Gain**        | Le lot, son message, le code à copier, la confirmation « J'ai copié mon code », le partage                                                |
| **5 · Perte**       | Un message bienveillant, le partage, le retour à l'accueil                                                                                |
| **6 · Statut**      | « Déjà participé », « Campagne terminée » ou « Problème de connexion », avec « Réessayer »                                                |

**Aucune impasse :** chaque écran propose toujours une suite (réessayer, revenir, lire les conditions).

### 5.2 Sur tous les écrans

Sur téléphone et sur tablette tenue verticalement, l'écran est **une colonne**, comme ci-dessus.

Sur un téléphone tourné en paysage, sur tablette horizontale et sur ordinateur, les mêmes zones se répartissent automatiquement sur **deux volets** : le texte et le bouton à gauche, le jeu à droite, le légal en bas.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Z] ZETA MARKET                                                  ●   │
│                                                                      │
│  Tentez votre chance                      .  5000 DA  .              │
│  instantanément                       Presque !     -30 %            │
│  Jouez en 30 s, repartez             .     ( JOUER )     .           │
│  avec un cadeau                       Sac Zeta      10 Go            │
│                                           '  Rejouez  '              │
│  ┌───────────────────────────┐                                       │
│  │ OFFRE RENTRÉE    Gagnant  │                                       │
│  │ Panier 5 000 DA · -30 %   │                                       │
│  └───────────────────────────┘                                       │
│  [5 000 DA]  [10 Go]  [-30 %]                                        │
│                                                                      │
│  [      LANCER LE JEU      ]                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Privacy · Terms · Support                   Organisé par Zeta Market │
└──────────────────────────────────────────────────────────────────────┘
```

| Situation                                | Ce qui se passe                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Très petit téléphone ou pliable fermé    | Marges réduites, étiquettes de lots sur deux lignes                                |
| Écran peu haut (paysage, clavier ouvert) | Espacements réduits, petit visuel masqué, bouton principal toujours visible en bas |
| Grand écran d'ordinateur                 | Contenu centré, le fond occupe tout l'écran                                        |
| Téléphone tourné pendant la partie       | Le jeu continue là où il en était                                                  |

---

## 6. Les garde-fous : ce qui est volontairement impossible

| Dans le Studio, on ne peut pas…                                   | Pourquoi                                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Déplacer, redimensionner ou faire pivoter un élément              | C'est ce qui garantit un écran parfait sur tous les téléphones. L'ancien éditeur « libre » produisait des écrans cassés |
| Retirer le consentement ou le pied de page légal                  | Loi 18-07                                                                                                               |
| Cocher le consentement à l'avance                                 | Loi 18-07                                                                                                               |
| Retirer le champ téléphone                                        | Il empêche de jouer plusieurs fois                                                                                      |
| Modifier les chances, les lots, les stocks ou les bonnes réponses | Une seule source, vérifiée par le serveur, dans les réglages de campagne                                                |
| Choisir un texte illisible sur sa couleur                         | Lisibilité pour tous                                                                                                    |
| Afficher un gain dans l'animation d'accueil                       | Ce serait une promesse trompeuse                                                                                        |
| Offrir « +1 essai » en échange d'un partage                       | Impossible à vérifier pour l'instant : ce serait une porte ouverte à la triche                                          |
| Mettre un lien vers un site non sécurisé                          | Sécurité des joueurs                                                                                                    |

---

## 7. Ce que cette première version ne fait pas encore

À bien avoir en tête pour la validation : ce sont des choix pour livrer vite une première version solide.

| Limite                                                                       | Conséquence pour la marque                                                                                                                                | Quand                                         |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **La page publique des joueurs n'utilise pas encore le nouvel écran**        | On configure et on teste tout dans le Studio et dans le simulateur du tableau de bord ; les vrais joueurs voient l'ancien écran jusqu'au branchement      | Juste après cette version                     |
| **La configuration est enregistrée dans le navigateur de cet ordinateur**    | Un collègue sur un autre ordinateur ne la voit pas ; vider le navigateur l'efface. **L'export de fichier sert de sauvegarde et de moyen de transmission** | Enregistrement sur le serveur juste après     |
| Pas de brouillon / version publiée, pas de travail à plusieurs               | Une seule version à la fois                                                                                                                               | Plus tard                                     |
| **5 jeux** : roue, grattage, boîtes mystère, quiz, Hit It                    | Les 8 autres jeux du prototype (duel, swipe…) viendront ensuite                                                                                           | Plus tard                                     |
| Images limitées (~400 Ko chacune après compression automatique)              | Le Studio prévient si une image est trop lourde                                                                                                           | Stockage d'images sur le serveur plus tard    |
| Lots et questions modifiés dans les réglages de campagne, pas dans le Studio | Un clic de plus (« Edit in campaign settings »), mais une seule vérité                                                                                    | Édition dans le Studio envisageable plus tard |
| Durée de Hit It (10 s) et quiz sans chrono : fixes                           | Pas de réglage de difficulté pour l'instant                                                                                                               | Ajout dans les réglages de campagne plus tard |
| Pas de test direct sur un vrai téléphone par QR code                         | On teste avec la barre d'appareils et « Ouvrir dans une fenêtre »                                                                                         | Optionnel, un jour de travail                 |

---

## 8. À valider avant de commencer

Pour chaque point : « oui », ou votre correction.

| #   | Question                                                                                                                                       | Proposition                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Accueil et inscription sur **deux écrans séparés** ?                                                                                           | Oui                                        |
| 2   | Enregistrement **dans le navigateur** pour cette première version (avec l'export comme sauvegarde) ?                                           | Oui, le serveur juste après                |
| 3   | Les **5 styles** de départ (Midnight Gold, Obsidian Violet, Clean Light, Telecom Red, Retail Blue) ?                                           | Oui                                        |
| 4   | Les **5 jeux** au lancement ?                                                                                                                  | Oui                                        |
| 5   | Langues **FR / AR / EN**, avec le français par défaut ?                                                                                        | Oui                                        |
| 6   | Formulaire limité à **nom, téléphone, email, wilaya** ?                                                                                        | Oui (voir l'idée 9.4 pour aller plus loin) |
| 7   | Lots, chances et questions modifiés **dans les réglages de campagne**, avec un lien depuis le Studio ?                                         | Oui                                        |
| 8   | Animation d'accueil **non jouable** ?                                                                                                          | Oui                                        |
| 9   | Sur ordinateur et en paysage : **deux volets** plutôt qu'une colonne de téléphone centrée ?                                                    | Deux volets                                |
| 10  | Pas de **« +1 essai contre un partage »** pour l'instant ?                                                                                     | Oui                                        |
| 11  | Libellés de l'éditeur **en anglais** ?                                                                                                         | Oui (règle actuelle du projet)             |
| 12  | Où placer les interrupteurs **« Sons » et « Animations »** du jeu ? Ils sont prévus, mais aucune rubrique ne les accueille encore dans le plan | Dans la rubrique Game                      |

---

## 9. Idées d'amélioration, à décider

Ces idées **ne sont pas prévues** dans le plan actuel. Elles sont proposées pour que vous puissiez en ajouter certaines avant de commencer.

| #   | Idée                                                                                                           | Intérêt pour la marque                                                        | Effort estimé                   |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| 9.1 | **Copier le design d'une autre campagne**                                                                      | Une marque qui lance une nouvelle campagne repart de la précédente en un clic | Petit                           |
| 9.2 | **Kit de marque enregistré** : logo, couleurs et polices mémorisés pour toutes les campagnes de l'organisation | Plus besoin de ressaisir l'identité à chaque campagne                         | Moyen                           |
| 9.3 | **Tester sur un vrai téléphone par QR code**                                                                   | Voir le rendu réel en scannant l'écran du Studio                              | Petit (≈ 1 jour, déjà envisagé) |
| 9.4 | **Questions marketing dans le formulaire** (« Quel produit préférez-vous ? »)                                  | Collecter des préférences clients, au-delà des coordonnées                    | Moyen                           |
| 9.5 | **Réordonner ou masquer les blocs de l'accueil** (jackpot avant ou après les étiquettes)                       | Un peu plus de liberté, sans risque de casser l'écran                         | Petit                           |
| 9.6 | **Voir 3 appareils côte à côte** (téléphone, tablette, ordinateur)                                             | Contrôler tous les formats d'un coup d'œil                                    | Petit                           |
