# Règles de la refactorisation Player Experience

**Date :** 2026-09-21
**Portée :** toute la refactorisation de l'éditeur d'écrans joueur (tâches T0.1 → T7.4 de [`tasks.md`](./plan&tasks/tasks.md)), ainsi que toute autre tâche demandée pendant cette phase.
**Statut :** en vigueur. Ces règles s'appliquent **à chaque tâche, sans exception**.

> **Règle de langue ([R0](#r0--langue--documentation-en-français-implémentation-en-anglais-règle-prioritaire)) : la documentation est en français, toute l'implémentation est en anglais.**

---

## Sommaire

0. [Ordre de priorité et lecture obligatoire](#0-ordre-de-priorité-et-lecture-obligatoire)
1. [Règles de travail](#1-règles-de-travail)
2. [Règles non négociables du projet](#2-règles-non-négociables-du-projet)
3. [Règles d'architecture](#3-règles-darchitecture)
4. [Règles métier](#4-règles-métier)
5. [Règles responsive](#5-règles-responsive)
6. [Règles de design et d'expérience (UI/UX)](#6-règles-de-design-et-dexpérience-uiux)
7. [Règles de code](#7-règles-de-code)
8. [Règles de commit](#8-règles-de-commit)
9. [Modèle : documentation d'une tâche](#9-modèle--documentation-dune-tâche)
10. [Modèle : résumé de fin de tâche](#10-modèle--résumé-de-fin-de-tâche)
11. [Check-list avant de déclarer une tâche terminée](#11-check-list-avant-de-déclarer-une-tâche-terminée)

---

## 0. Ordre de priorité et lecture obligatoire

### Ordre de priorité en cas de conflit

1. **`CLAUDE.md`** (règles non négociables du projet) ;
2. **ce fichier `rules.md`** ;
3. **`tasks.md`** (détail de chaque tâche) ;
4. **`plan.md`** (architecture cible).

En cas de contradiction entre deux documents, **je m'arrête et je te la signale** avant d'écrire du code. Je ne tranche jamais seul.

> Exemple déjà réglé : `tasks.md` §0.1 dit que « chaque tâche se termine par un commit ». La règle R3 ci-dessous l'emporte : **je propose le message de commit, je ne commite pas**.

### À relire au début de chaque tâche

| Document                                                                                                                     | Ce que j'y relis                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`rules.md`](./rules.md)                                                                                                     | Tout le fichier                                                                  |
| [`plan&tasks/tasks.md`](./plan&tasks/tasks.md)                                                                               | La fiche de la tâche, ses dépendances, et §0.3 (décisions)                       |
| [`plan&tasks/plan.md`](./plan&tasks/plan.md)                                                                                 | Les sections citées par la fiche                                                 |
| [`playerEditorFeaturesExplain/playerEditorFeaturesExplain.md`](./playerEditorFeaturesExplain/playerEditorFeaturesExplain.md) | Le résultat attendu, validé ensemble, pour les tâches visibles (runtime, Studio) |
| [`tasks_docs/`](./tasks_docs/)                                                                                               | Les documentations des tâches dont la tâche courante dépend                      |

Documents de contexte : [`analyse_des_approches/approche_actuel.md`](./analyse_des_approches/approche_actuel.md) (pourquoi abandonner le canvas libre) et [`analyse_des_approches/approche_inspiration.md`](./analyse_des_approches/approche_inspiration.md) (analyse du prototype Aktera).

---

## 1. Règles de travail

### R0 — Langue : documentation en français, implémentation en anglais _(règle prioritaire)_

| En **français**                                                                            | En **anglais**                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| La documentation des tâches (`tasks_docs/`)                                                | **Toute l'implémentation, sans exception :**                              |
| Les documents du dossier `ai-assistance-prompts-reports/` (plan, tâches, règles, analyses) | noms des fichiers et des dossiers de code                                 |
| Les résumés de fin de tâche                                                                | identifiants : variables, fonctions, types, composants, hooks, constantes |
| Nos échanges                                                                               | commentaires dans le code                                                 |
|                                                                                            | noms et descriptions des tests (`describe`, `it`)                         |
|                                                                                            | messages d'erreur, de log et de console                                   |
|                                                                                            | messages de validation du Studio (`DesignIssue.message`)                  |
|                                                                                            | libellés de l'interface du Studio                                         |
|                                                                                            | clés de configuration, noms de scripts npm, variables CSS                 |
|                                                                                            | messages de commit                                                        |

**Une seule exception : le contenu vu par le joueur.** Les textes par défaut des écrans, du formulaire et des mentions légales existent en **fr / ar / en**, parce que ce sont des traductions de contenu, pas du code. Ils n'apparaissent que comme **valeurs** dans les fichiers de contenu (`presets/contentDefaults.ts`, fixtures de démonstration). Leurs clés et tout le code qui les entoure restent en anglais.

```ts
// Correct: English identifiers and comments; translated player content as values only.
export const DEFAULT_WELCOME_TITLE: LocalizedText = {
  fr: "Tentez votre chance instantanément",
  ar: "جرب حظك الآن واربح فوراً",
  en: "Test your luck & win instantly",
};

// Incorrect: French identifier and French comment.
// const titreAccueilParDefaut = …; // titre affiché sur l'accueil
```

**Dans la documentation**, les extraits de code restent en anglais, tels qu'ils sont dans le code ; seules les explications autour sont en français.

### R1 — Une tâche à la fois, sur ton feu vert

- Je n'exécute **qu'une tâche par échange**.
- Je ne démarre **jamais** la tâche suivante sans ton accord explicite.
- Je respecte l'ordre et les dépendances de `tasks.md`. Si une dépendance n'est pas terminée, je te le signale au lieu de commencer.

### R2 — Une documentation détaillée par tâche _(nouvelle règle)_

Pour **chaque tâche de `tasks.md`** (T0.1, T0.2, … T7.4) :

1. **Au démarrage**, je crée le fichier `tasks_docs/<ID>-<titre-court>.md` à partir du modèle du [§9](#9-modèle--documentation-dune-tâche). Je le crée **avant d'écrire du code**, avec le statut `En cours`, l'objectif et le plan de travail.
   - Nommage : identifiant de la tâche, puis titre court en minuscules, sans accents, mots séparés par des tirets.
   - Exemples : `tasks_docs/T0.1-branche-et-garde-fous.md`, `tasks_docs/T1.10-machine-d-etats-du-parcours.md`.
2. **Pendant la tâche**, je mets le fichier à jour **après chaque étape significative** : fichier créé, décision prise, test écrit, imprévu, vérification lancée. Chaque mise à jour ajoute une entrée datée au journal.
3. **À la fin**, je complète toutes les sections, avec les résultats **réels** des vérifications, et je passe le statut à `Terminée`. Si la tâche est interrompue, le statut passe à `Bloquée`, avec la raison.
4. **Niveau de détail attendu** : la documentation doit te permettre de **comprendre l'implémentation et le code sans ouvrir l'éditeur**. Concrètement :
   - pourquoi chaque fichier existe ;
   - les extraits de code importants, expliqués ;
   - les choix faits et les alternatives écartées ;
   - ce que vérifie chaque test ;
   - comment la tâche s'articule avec les autres ;
   - pour une tâche d'interface, ce qui est repris du prototype et ce qui est amélioré (D24).
5. **Langue** : la documentation est en **français** ; les extraits de code restent en anglais (R0).
6. **Index** : je tiens à jour [`tasks_docs/README.md`](./tasks_docs/README.md), qui liste chaque tâche avec son statut et le lien vers sa documentation. Je le crée à la première tâche.
7. **Correction ultérieure** : si une tâche suivante modifie du code livré par une tâche précédente, j'ajoute une entrée « Modifié par Tx.y » dans la documentation de la tâche d'origine.

### R3 — Résumé de fin de tâche et message de commit, sans commit _(nouvelle règle)_

À la fin de **chaque tâche que tu me donnes** (une tâche de `tasks.md`, mais aussi toute autre demande pendant cette phase) :

1. **Je résume ce que j'ai implémenté**, au format du [§10](#10-modèle--résumé-de-fin-de-tâche).
2. **Je donne le message de commit** à utiliser, au format du [§8](#8-règles-de-commit), avec la liste des fichiers concernés.
3. **Je ne commite rien.** C'est toi qui commites.

Pour une demande hors `tasks.md` (une correction, une question, un ajustement), le résumé et le message de commit suffisent : pas de fichier dans `tasks_docs/`, sauf si tu le demandes.

### R4 — Git en lecture seule

- **Autorisé** : les commandes qui ne modifient pas l'historique ni les branches (`git status`, `git diff`, `git log`, `git show`, `git branch --list`).
- **Interdit** : `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `stash`, `checkout`/`switch`/`branch` qui créent ou changent une branche, `tag`, `clean`.
- **Quand une tâche demande une opération Git** (par exemple T0.1 : créer la branche `feat/player-experience`), je te donne la commande exacte et j'attends ta confirmation avant de continuer.

### R5 — Périmètre strict

- Je fais **ce que la fiche de la tâche décrit**, ni moins ni plus.
- **Un imprévu** (fichier absent, comportement différent de ce que dit le plan, dépendance qui casse) : je m'arrête, je te l'explique, je propose une solution, et j'attends ta décision (règle 3 de `tasks.md` §0.1).
- **Un problème hors tâche** découvert en chemin : je le note dans la documentation et dans le résumé, **sans le corriger**.
- Je ne supprime ni ne réécris aucun fichier sans l'avoir lu d'abord.

### R6 — Vérifier, et rapporter fidèlement

- Chaque tâche se termine par **ses commandes de vérification** (champ « Vérification » de la fiche), au minimum `npm run lint` et `npm run typecheck`, et `npm test` dès que Vitest est installé (T0.2).
- **Je rapporte les résultats tels qu'ils sont.** Un test qui échoue est signalé avec sa sortie ; une étape non faite est dite comme telle.
- **Une tâche dont la vérification échoue n'est pas terminée.**
- Pour les contrôles visuels que je ne peux pas faire moi-même, je te donne la marche à suivre exacte (URL, appareil, ce qu'il faut regarder), et je l'indique dans la documentation comme « à vérifier par toi ».

### R7 — Ce qu'on ne touche pas

- **L'ancien code reste en place jusqu'à la phase 7** : `src/components/player-ui-maker/`, `src/components/player-editor/`, `src/components/PlayerScreenConfig.tsx`.
- **Jamais modifiés** pendant cette refactorisation :
  - la page publique `/play/:slug` (`src/pages/play/PlayerFlowPage.tsx`) ;
  - tout le dossier `supabase/` (migrations, fonctions, RLS) ;
  - le prototype `aktera---gamified-marketing-experience/`, qui sert uniquement de source de lecture.
- **Fichiers de l'application hors module** : seuls ceux que la fiche cite (par exemple `src/types.ts` en T1.12, `src/AppRouter.tsx` en T3.3, `App.tsx` en phase 7).

### R8 — Suivi à jour

- `tasks_docs/README.md` : le statut de chaque tâche (R2).
- `tasks.md` §0.5 : le statut de chaque phase (`⬜` à faire, `🟡` en cours, `✅` terminée), mis à jour au début et à la fin de chaque phase.

### R9 — Décisions figées

- Les 15 décisions de `tasks.md` §0.3 s'appliquent.
- En changer une demande **ton accord explicite**, puis la mise à jour de `plan.md` et de `tasks.md` **avant** tout code.

---

## 2. Règles non négociables du projet

Issues de `CLAUDE.md` ; elles priment sur tout le reste.

| #   | Règle                                                                                  | Comment elle s'applique ici                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | **Le tirage du lot se fait côté serveur uniquement**                                   | Aucun moteur de jeu ne calcule un résultat : il le **reçoit**. Le seul tirage client est la passerelle de démonstration, confinée dans `services/local/`, et **refusée** sur la page publique (`allowedGatewayModes`) |
| N2  | **La RLS reste activée**                                                               | Aucun changement backend pendant la refactorisation                                                                                                                                                                   |
| N3  | **Consentement strict (loi 18-07)**                                                    | Jamais pré-coché, demandé **avant** la partie, bloquant, enregistré avec horodatage, version de la politique et langue                                                                                                |
| N4  | **Protection anti-doublon**                                                            | Clé campagne + téléphone normalisé ; `RESTART` ne la contourne jamais ; pas de « +1 essai » contre un partage                                                                                                         |
| N5  | **Libellés de l'interface en anglais ; arabe en `dir="auto"` avec _Noto Sans Arabic_** | Studio en anglais ; contenu joueur en fr/ar/en ; police arabe toujours présente                                                                                                                                       |
| N6  | **Serveur Vite en `0.0.0.0`**                                                          | `vite.config.ts` n'est pas modifié sur ce point                                                                                                                                                                       |

---

## 3. Règles d'architecture

Issues de `plan.md` §3 et §4.3.

| #   | Règle                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Tout le nouveau code vit dans `src/features/player-experience/`.** Le reste de l'application n'importe que son `index.ts`                                                                                                 |
| A2  | **La configuration est une donnée** : `ExperienceConfig` est un JSON sérialisable, sans fonction, sans `ReactNode`, sans callback                                                                                           |
| A3  | **La mise en page est du code** : l'utilisateur choisit et remplit, il ne positionne jamais rien                                                                                                                            |
| A4  | **Ports et adaptateurs** : le domaine ne dépend ni de React ni du stockage ; tout accès externe passe par un port (`ExperienceRepository`, `ParticipationGateway`, `AssetStorage`, `AnalyticsTracker`, `HumanVerification`) |
| A5  | **Tous les ports sont asynchrones**, même en local, et l'interface gère chargement, erreur et nouvel essai                                                                                                                  |
| A6  | **Validation aux frontières** : toute configuration chargée ou importée passe par le schéma `zod` et la chaîne de migrations                                                                                                |
| A7  | **Conventions alignées sur le backend** : camelCase dans le module, snake_case seulement dans les adaptateurs ; identifiants UUID ; dates ISO 8601 ; codes d'erreur identiques à `select-prize`                             |
| A8  | **Un seul moteur de rendu** pour l'aperçu du Studio, le simulateur de l'application et, plus tard, `/play/:slug`                                                                                                            |
| A9  | **Le runtime possède son viewport** : il est toujours rendu dans un document à lui (la page, ou l'iframe `/xp-frame`), jamais directement dans une `div` d'une autre page                                                   |

**Dépendances autorisées entre couches** (`plan.md` §4.3) :

| Couche                 | Peut importer                                                    | Ne doit jamais importer                          |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| `domain/`              | rien (sauf `zod`)                                                | React, `services`, `runtime`, `studio`, Supabase |
| `services/`            | `domain`                                                         | `runtime`, `studio`                              |
| `theme/`, `presets/`   | `domain`                                                         | `services`, `studio`                             |
| `runtime/`             | `domain`, `theme`, `presets`, `services/ports` (via le contexte) | `studio`, adaptateurs concrets                   |
| `studio/`              | tout le module                                                   | adaptateurs concrets (injectés par le provider)  |
| Reste de l'application | `index.ts` du module uniquement                                  | fichiers internes                                |

---

## 4. Règles métier

Issues de `plan.md` §5, §6, §7 et §8.7.

| #   | Règle                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **Règles ≠ présentation** (`plan.md` §6.6). Ce qui décide du gain (lots, poids, stock, probabilité, questions, bonnes réponses, seuils, durées) vit dans la campagne et s'édite dans le Wizard. `ExperienceConfig` ne contient **que** de la présentation |
| B2  | **Aucune donnée sensible dans la configuration ni dans le runtime** : ni probabilité, ni stock, ni code promo, ni bonne réponse. Ces données ne vont qu'à la passerelle de démo                                                                           |
| B3  | **Ordre du parcours imposé** : accueil → inscription + consentement → jeu → résultat                                                                                                                                                                      |
| B4  | **Le bouton principal émet un événement de la machine d'états** ; le moteur de jeu réagit à l'état. Un bouton ne pilote jamais une animation directement                                                                                                  |
| B5  | **Téléphone** : `normalizeDzPhone` est la copie exacte de la fonction serveur ; validation `/^0[567]\d{8}$/` après normalisation ; champ toujours affiché et obligatoire                                                                                  |
| B6  | **Codes de démonstration** au format `DEMO-XXXX-XXXX`, jamais confondables avec de vrais codes. Un badge DEMO est visible tant que la passerelle n'est pas `live`                                                                                         |
| B7  | **La passerelle de démo applique les mêmes règles que `resolve_game_outcome`** (seuils du quiz et de Hit It, lus dans la campagne)                                                                                                                        |
| B8  | **L'accroche de pregame** montre le jeu, jamais un gain ; elle n'est pas jouable ; elle vient de la configuration ; elle se met en pause hors écran                                                                                                       |
| B9  | **Aucune impasse** : chaque écran propose une sortie (réessayer, revenir, lire les conditions)                                                                                                                                                            |
| B10 | **Traduire une question ne change jamais la réponse envoyée** : les `answers` utilisent l'identifiant de question et l'index d'option en base                                                                                                             |

---

## 5. Règles responsive

Issues de `plan.md` §8.3, §8.6 et §9.3.

| #    | Règle                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RWD1 | **Enveloppe supportée** : de 280 à 2560 px de large et de 320 à 1600 px de haut, en portrait comme en paysage. Aucun défilement horizontal, aucun chevauchement, aucun bouton inaccessible             |
| RWD2 | **Interdits dans `runtime/`** : les variantes `sm:`/`md:`/`lg:`/`xl:`, les tailles fixes en pixels (hors bordures et minimums tactiles de 44 à 56 px), et `100vh`. Le test `noFixedSizes` échoue sinon |
| RWD3 | **Points de rupture en source unique** : `runtime/layout/breakpoints.ts` ; aucun nombre magique ailleurs                                                                                               |
| RWD4 | **Les moteurs de jeu se dimensionnent sur leur conteneur**, jamais sur l'écran ; ils supportent un redimensionnement en cours de partie                                                                |
| RWD5 | **Zones tactiles d'au moins 44 × 44 px** à toutes les tailles ; Pointer Events partout                                                                                                                 |
| RWD6 | **L'aperçu rend l'appareil à sa taille CSS exacte** ; le zoom ne change jamais la mise en page. Le calcul d'`EditorCanvas.tsx` n'est **pas** repris                                                    |
| RWD7 | **`prefers-reduced-motion` respecté** : animations réduites, bandeau figé, accroches en image fixe                                                                                                     |

---

## 6. Règles de design et d'expérience (UI/UX)

> **Objectif : un rendu très beau et une expérience de haut niveau, partout** — écrans joueur, jeux et Studio.
>
> **Le prototype Aktera est le plancher, pas le plafond.** On ne fait jamais moins bien que lui ; dès qu'on peut faire mieux, on fait mieux.

### 6.1 Le principe du plancher

| #   | Règle                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Référence minimale = le meilleur de l'existant.** Pour chaque écran et chaque jeu, la référence est le prototype `aktera---gamified-marketing-experience/`, ou le portage `src/components/player-editor/` quand il est plus abouti. La nouvelle version doit être **au moins aussi belle et aussi vivante** : mêmes finitions, mêmes animations, mêmes retours sonores et visuels |
| D2  | **Faire mieux est encouragé, faire moins bien est interdit.** Une amélioration est bienvenue si elle respecte les autres règles (responsive, performance, accessibilité, conformité). Retirer ou simplifier un élément de la référence doit être justifié dans la documentation de la tâche et **validé par toi**                                                                   |
| D3  | **Jeux : parité visuelle obligatoire.** Pour chacun des 5 jeux, **tous** les éléments de signature du prototype (§6.2) sont conservés, en plus des améliorations visées                                                                                                                                                                                                             |
| D4  | **Étalon : l'accueil « Midnight Gold ».** L'écran d'accueil de la capture de référence est reproduit fidèlement avec le preset `midnight-gold`, puis sert d'étalon de finition pour tous les autres écrans                                                                                                                                                                          |

> **Ce qui n'est pas repris**, même si le prototype l'affiche : le faux captcha, le consentement pré-coché, le « +1 essai contre un partage », les contenus codés en dur, les marques réelles, la police arabe _Alexandria_ (remplacée par _Noto Sans Arabic_, N5). Les règles N1 à N6 et B1 à B10 priment sur le visuel.

### 6.2 Jeux : le minimum à garder et les améliorations visées

| Jeu                      | Signature du prototype à conserver (minimum)                                                                                                                                                                                                                                                                                                      | Améliorations visées                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roue**                 | Jante épaisse et ombre profonde teintée de la couleur de marque ; pointeur ombré ; segments aux couleurs de marque alternées ; séparateurs blancs translucides ; libellés avec ombre portée ; moyeu central cliquable portant le nom de la marque ; décélération réaliste image par image ; tic sonore à chaque segment ; son de gain ou de perte | Jante métallique en dégradé ; halo lumineux animé ; pointeur qui « rebondit » à chaque segment ; léger dépassement puis retour à l'arrêt ; surbrillance du segment d'arrivée |
| **Grattage**             | Feuille « holographique » en dégradé argenté ; texte « Grattez ici » ; grattage fluide au doigt ; révélation automatique au seuil ; son de gain                                                                                                                                                                                                   | Reflet holographique qui suit le doigt ; poussière qui s'échappe au grattage ; éclat lumineux à la révélation                                                                |
| **Boîtes mystère**       | Boîtes qui flottent en décalé ; boîte choisie mise en avant (anneau, halo) ; boîte qui s'enfonce à la pression ; ouverture animée ; sons de clic et de gain                                                                                                                                                                                       | Tremblement d'anticipation avant l'ouverture ; couvercle qui s'ouvre en relief ; lumière qui jaillit de la boîte                                                             |
| **Quiz**                 | Carte question animée ; anneau de chrono ; barre de progression en dégradé ; options qui réagissent au toucher ; entrée animée de chaque question ; son de fin                                                                                                                                                                                    | Chrono qui passe à l'orange puis au rouge ; pastilles de progression ; transition fluide d'une question à l'autre ; sélection d'option animée                                |
| **Hit It**               | Pas de référence dans le prototype : même niveau de finition que les autres jeux (halo, ombres teintées, typographie), à partir de `PlayerHitIt`                                                                                                                                                                                                  | Cible qui « éclate » au toucher ; compteur qui pulse ; barre de temps qui change de couleur à la fin                                                                         |
| **Accroches de pregame** | Halo d'ambiance ; mouvement continu et doux ; mini-jeu reconnaissable au premier coup d'œil (`WelcomeTeaser.tsx`)                                                                                                                                                                                                                                 | Dessinées avec le même composant que le jeu : l'accroche est aussi belle que le jeu lui-même                                                                                 |

### 6.3 Écrans : la signature à conserver

| Écran                       | Minimum (prototype)                                                                                                                                                                                                        | Améliorations visées                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Accueil**                 | Capture Midnight Gold : en-tête à fond flouté et point « live » pulsant ; titre en graisse forte ; carte jackpot et étiquettes de lots ; animation du jeu avec halo ; bouton principal en dégradé ; bandeau légal défilant | Apparition échelonnée des éléments à l'ouverture                                                                         |
| **Inscription**             | Champs avec icône ; anneau de focus coloré ; entrée animée des champs ; case de consentement animée au cochage ; erreurs claires sous le champ                                                                             | Validation rassurante en direct (coche verte) ; clavier numérique pour le téléphone ; format affiché au fil de la saisie |
| **Gain**                    | « Ticket » avec séparateur en pointillés ; badge ; nom du lot en très grand ; code bien lisible ; bouton « Copier » ; boutons de partage aux couleurs des réseaux ; confettis                                              | Encoches de ticket ; reflet qui balaie le ticket ; confettis aux couleurs de la marque ; code en police à chasse fixe    |
| **Perte**                   | Carte bienveillante ; animation d'apparition ; partage                                                                                                                                                                     | Message chaleureux et illustration légère                                                                                |
| **Attente, statut, erreur** | Pas de référence riche                                                                                                                                                                                                     | Même niveau de finition que les autres écrans : jamais un simple texte sur un fond vide                                  |

### 6.4 Système visuel

| #   | Règle                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D5  | **Profondeur et lumière** : ombres superposées teintées de la couleur de marque ; halos d'ambiance derrière le jeu ; surfaces vitrées (flou d'arrière-plan), avec un repli opaque quand le flou n'est pas disponible                                                                                |
| D6  | **Typographie** : titres en graisse forte à l'approche serrée ; micro-libellés en capitales espacées ; tailles fluides. **Jamais d'espacement de lettres ni de capitales sur l'arabe**, qui casseraient la liaison des lettres : l'arabe a sa propre échelle et une hauteur de ligne plus généreuse |
| D7  | **Cohérence** : une seule échelle d'arrondis, d'espacements (multiples de 4 px) et d'ombres, issue des tokens ; une seule famille d'icônes (lucide), avec la même épaisseur de trait                                                                                                                |
| D8  | **Couleurs dérivées** : dégradés et états (survol, pression, désactivé) calculés à partir des tokens de la marque, pour que chaque preset et chaque marque restent beaux sans retouche                                                                                                              |

### 6.5 Mouvement et retours

| #   | Règle                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D9  | **Chaque élément interactif réagit** : léger enfoncement à la pression, survol sur ordinateur, focus visible et stylé                                                                                                     |
| D10 | **Animations fluides** : uniquement `transform` et `opacity` (60 images/s) ; 150 à 300 ms pour l'interface ; courbes naturelles (ressort, décélération) ; entrées échelonnées ; une animation ne bloque jamais une action |
| D11 | **Retours multisensoriels** : sons (clic, tic, gain, perte), muets jusqu'au premier geste et désactivables ; confettis au gain ; vibration courte si l'appareil le permet                                                 |
| D12 | **États soignés** : chargement (le bouton passe en attente, jamais d'écran figé), erreur (message humain et « Réessayer »), vide, désactivé : tous dessinés avec le même soin que l'état normal                           |
| D13 | **Mouvement réduit** : avec `prefers-reduced-motion`, les animations deviennent des fondus courts ou des images fixes, sans perte d'information                                                                           |

### 6.6 Expérience de haut niveau

| #   | Règle                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D14 | **Une action évidente par écran** : le joueur sait toujours quoi faire et où il en est                                                                                                                                                                    |
| D15 | **Réactivité perçue** : retour visuel en moins de 100 ms après chaque geste ; transitions d'écran fluides ; le moteur du jeu est préchargé pendant l'inscription                                                                                          |
| D16 | **Formulaires bienveillants** : validation au bon moment (à la sortie du champ, puis en direct) ; messages qui disent comment corriger ; saisie jamais perdue ; clavier adapté (numérique pour le téléphone)                                              |
| D17 | **Beau sur tous les écrans** : la finition se vérifie sur toute l'enveloppe (RWD1), pas seulement sur le téléphone de référence. En paysage et sur ordinateur, la disposition en deux volets est une vraie mise en page, pas un téléphone perdu au milieu |
| D18 | **Performant sur l'entrée de gamme** : effets coûteux (flou, grands halos, particules) limités en nombre et coupés en mouvement réduit ; test avec le bridage CPU des DevTools                                                                            |
| D19 | **Accessible et beau à la fois** : contraste AA, cibles de 44 px, états jamais signalés par la seule couleur. L'accessibilité fait partie de la finition, ce n'est pas un compromis                                                                       |

### 6.7 Le Studio

| #   | Règle                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D20 | **Identité du tableau de bord** : le Studio fait partie du tableau de bord et en suit le design (thème clair « Soft UI », `CLAUDE.md`), pour ne jamais donner l'impression d'une autre application                                                                                                                                         |
| D21 | **UX du prototype au minimum** : l'UX de `StudioControls.tsx` est le plancher (galerie de presets avec pastilles, couleurs à effet immédiat, choix de l'écran, du jeu et de la langue). Les maquettes validées dans [`playerEditorFeaturesExplain.md`](./playerEditorFeaturesExplain/playerEditorFeaturesExplain.md) fixent le niveau visé |
| D22 | **Effet immédiat** : chaque réglage se voit dans l'aperçu sans délai perceptible ; pas de bouton « Appliquer » pour une modification simple                                                                                                                                                                                                |
| D23 | **Guidage** : valeurs par défaut qui donnent toujours un bel écran (jamais de page blanche) ; aides courtes au survol ; chaque message de validation mène au bon champ                                                                                                                                                                     |

### 6.8 Vérifier la qualité visuelle

| #   | Règle                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D24 | **Chaque tâche d'interface** (phases 3 à 6) comporte une section « Qualité visuelle » dans sa documentation : éléments de référence repris (§6.2 et §6.3), améliorations apportées, captures d'écran (générées par le script de balayage à partir de T3.8 ; avant, la marche à suivre pour que tu regardes)                                     |
| D25 | **Comparaison côte à côte avec le prototype**, à taille égale : pour les 5 jeux et les écrans du parcours au point de validation 2 (T5.7), et pour le Studio au point de validation 3 (T7.4). Pour comparer, on lance le prototype à part, dans son dossier, sans modifier ses fichiers source. C'est toi qui le lances, ou moi avec ton accord |
| D26 | **Une tâche d'interface visuellement en dessous de la référence n'est pas terminée**, au même titre qu'une vérification qui échoue (R6)                                                                                                                                                                                                         |

---

## 7. Règles de code

| #   | Règle                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **TypeScript strict** dans le module ; **aucun `any`** dans `domain/` ni `services/`                                                                                                         |
| C2  | **Composants de moins de 250 lignes** ; la logique va dans des hooks ou dans le domaine                                                                                                      |
| C3  | **Tout le code est en anglais** (R0) : fichiers, identifiants, commentaires, tests, messages, libellés du Studio. Seules les **valeurs** de contenu joueur sont en fr / ar / en              |
| C4  | **Commentaires uniquement pour les invariants non évidents** (autorité du résultat, copie de `normalizeDzPhone`, etc.)                                                                       |
| C5  | **Aucune couleur en dur dans le runtime** : tout passe par les variables `--xp-*` ; transparences avec `color-mix()`                                                                         |
| C6  | **Textes saisis par la marque en `dir="auto"`** ; `dir` et `lang` posés sur la racine du runtime                                                                                             |
| C7  | **Chaque accès à `localStorage` est protégé** (`try/catch`), avec un repli propre                                                                                                            |
| C8  | **Tests Vitest** pour le domaine (couverture ≥ 90 %), les services locaux, le hook de parcours et les règles de mise en page, comme indiqué dans chaque fiche                                |
| C9  | **Style du code environnant** : même densité de commentaires, même nommage, mêmes idiomes que le code existant                                                                               |
| C10 | **Pas de dépendance nouvelle** hors de celles prévues par le plan (`zod`, `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`) sans ton accord |

---

## 8. Règles de commit

- **Je ne commite pas** (R3, R4). Je propose un message, tu commites.
- **Format :**
  ```
  <type>(Player-Experience): <résumé en anglais, à l'impératif>

  <corps facultatif : ce qui change et pourquoi, en anglais>

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```
- **Types** :
  - `feat` : nouvelle fonctionnalité ;
  - `refactor` : réorganisation sans changement de comportement ;
  - `test` : tests seuls ;
  - `chore` : outillage, configuration, dépendances ;
  - `docs` : documentation seule ;
  - `fix` : correction.
- **Résumé** : celui de la ligne « Commit » de la fiche, sauf si le contenu réel de la tâche l'a fait évoluer. Dans ce cas, je te dis pourquoi.
- **Un commit par tâche.** La documentation `tasks_docs/` de la tâche est incluse dans le même commit.
- **Rappel :** au commit, le hook `pre-commit` lance ESLint et Prettier sur les fichiers indexés ; au push, `pre-push` lance `npm run verify`.

---

## 9. Modèle : documentation d'une tâche

Fichier `tasks_docs/<ID>-<titre-court>.md`, créé au démarrage de la tâche et tenu à jour jusqu'à la fin (R2).

```markdown
# <ID> — <Titre de la tâche>

| Champ          | Valeur                                 |
| -------------- | -------------------------------------- |
| Statut         | En cours · Terminée · Bloquée (raison) |
| Phase          | <n> — <nom de la phase>                |
| Dépend de      | <IDs>                                  |
| Démarrée le    | AAAA-MM-JJ                             |
| Terminée le    | AAAA-MM-JJ                             |
| Fiche          | tasks.md, <ID> · plan.md, §<sections>  |
| Commit proposé | `<type>(Player-Experience): <résumé>`  |

## 1. Objectif

En deux ou trois phrases : ce que la tâche apporte, et pourquoi elle est nécessaire maintenant.

## 2. Où elle se situe

- Ce qui existait avant, sur quoi elle s'appuie.
- Ce que les tâches suivantes vont utiliser.
- Un petit schéma si cela aide (couches, flux).

## 3. Plan de travail

Liste des étapes prévues au démarrage, cochées au fil de l'avancement :

- [ ] Étape 1
- [ ] Étape 2

## 4. Fichiers créés et modifiés

| Fichier | Créé / modifié | Rôle | Lignes |
| ------- | -------------- | ---- | ------ |

## 5. Le code expliqué

Pour chaque fichier important :

- **Rôle** du fichier, en une phrase.
- **Extraits clés**, commentés : ce que fait chaque partie et pourquoi elle est écrite ainsi.
- **Types et fonctions exportés** : ce qu'ils promettent à leurs utilisateurs.
- **Cas limites** gérés.

## 6. Décisions et alternatives

| Décision | Alternative écartée | Raison |
| -------- | ------------------- | ------ |

## 7. Tests

| Fichier de test | Ce qu'il vérifie | Comment le lancer |
| --------------- | ---------------- | ----------------- |

## 8. Vérification

Commandes exécutées et résultat **réel** (réussite, ou sortie d'erreur résumée) :

| Commande                                                               | Résultat |
| ---------------------------------------------------------------------- | -------- |
| Contrôles à faire par toi (visuels, manuels) : marche à suivre exacte. |

## 9. Écarts, imprévus et points d'attention

Ce qui diffère de la fiche, et pourquoi. Problèmes découverts hors périmètre (notés, non corrigés).

## 10. Qualité visuelle (tâches d'interface uniquement, D24)

- Éléments de la référence repris (§6.2, §6.3 de rules.md) : …
- Améliorations apportées par rapport au prototype : …
- Éléments retirés ou simplifiés, avec la justification (à valider, D2) : … (ou « aucun »)
- Captures d'écran ou marche à suivre pour regarder : …

## 11. Comment relire cette tâche

Les fichiers dans l'ordre de lecture conseillé, et les points à vérifier en priorité.

## Journal

- AAAA-MM-JJ HH:MM — Tâche démarrée, documentation créée.
- AAAA-MM-JJ HH:MM — <étape réalisée, décision, imprévu…>
- AAAA-MM-JJ HH:MM — Vérification : <résultat>. Statut → Terminée.
```

---

## 10. Modèle : résumé de fin de tâche

Donné dans la conversation à la fin de chaque tâche (R3).

````markdown
## <ID> terminée — <Titre>

**Ce que j'ai implémenté :**

- …

**Fichiers :**

- créés : …
- modifiés : …

**Vérification :**

- `npm run lint` → …
- `npm run typecheck` → …
- `npm test` → …
- À vérifier par toi : …

**Écarts et points d'attention :** … (ou « aucun »)

**Qualité visuelle** (tâches d'interface) : repris du prototype … · amélioré … · à regarder : …

**Documentation :** `tasks_docs/<ID>-<titre-court>.md`

**Message de commit proposé (je n'ai rien commité) :**

```
<type>(Player-Experience): <résumé>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Fichiers à inclure : …

**Suite :** <ID suivant> — <titre>. J'attends ton feu vert.
````

---

## 11. Check-list avant de déclarer une tâche terminée

- [ ] La fiche de `tasks.md` est entièrement réalisée, critères d'acceptation compris.
- [ ] **Langue (R0)** : tout le code livré est en anglais (fichiers, identifiants, commentaires, tests, messages) ; seules les valeurs de contenu joueur sont en fr / ar / en ; la documentation est en français.
- [ ] **Design (§6)** pour une tâche d'interface : au moins aussi beau que la référence (D1 à D3), section « Qualité visuelle » remplie (D24), aucun élément de signature retiré sans ton accord.
- [ ] Aucune règle de ce fichier n'est enfreinte (non négociables, architecture, métier, responsive, design, code).
- [ ] Les commandes de vérification de la fiche ont été lancées, et leurs résultats sont rapportés tels quels.
- [ ] La documentation `tasks_docs/<ID>-…md` est complète, le journal à jour, le statut à `Terminée`.
- [ ] `tasks_docs/README.md` est à jour (et `tasks.md` §0.5 si la phase change de statut).
- [ ] Aucun commit, aucune opération Git d'écriture n'a été faite.
- [ ] Le résumé de fin de tâche et le message de commit sont donnés.
- [ ] Je n'ai pas démarré la tâche suivante.
