# Analyse d'architecture — Personnalisation des écrans joueur

**Date :** 2026-09-17
**Branche :** `Fix/PlayerScreenEditor` (dernier commit `f22ff58`)
**Statut :** discussion, aucune modification de code

---

## 1. Question posée

L'éditeur actuel (`src/components/player-ui-maker/`) permet de tout contrôler, comme un fichier Figma : position exacte, taille, rotation, calques, animations, etc.

Est-ce la bonne approche pour OCTOREACH ? Ou vaut-il mieux proposer des **templates prêts à l'emploi**, avec une personnalisation limitée à l'essentiel : image de fond, couleurs, textes et libellés, champs du formulaire ?

## 2. Verdict

**Oui, l'architecture actuelle est sur-dimensionnée et, en pratique, inutile en production.** Une approche **templates + thème + contenu + formulaire** correspond mieux au produit, aux utilisateurs et aux contraintes légales.

---

## 3. Constats dans le code

### 3.1 L'éditeur n'a aucun effet sur ce que voient les joueurs

- La page publique `/play/:slug` (`src/pages/play/PlayerFlowPage.tsx`) charge bien `player_screen_config` (ligne 178), mais **ne l'utilise nulle part**.
- Elle affiche ses propres composants codés en dur : `PlayerLanding`, `PlayerGame`, `PlayerQuiz`, `PlayerScratch`, `PlayerMysteryBox`, `PlayerHitIt`, `PlayerResult`.
- `PlayerUIRuntime` (le moteur de rendu de l'éditeur) n'est utilisé que dans l'aperçu de l'éditeur.
- Le projet conçu (`uiProject`) est enregistré en base (`App.tsx:838`, `CampaignWizard.tsx:262`), mais aucun joueur ne le voit.

### 3.2 Trois systèmes de rendu en parallèle

| Système                                               | Dossier                                             | Taille approx. | Utilisé en production  |
| ----------------------------------------------------- | --------------------------------------------------- | -------------- | ---------------------- |
| Player UI Maker (canvas libre)                        | `src/components/player-ui-maker/`                   | ~9 400 lignes  | Non                    |
| Player Editor / simulateur Aktera (8 zones + presets) | `src/components/player-editor/`                     | ~5 900 lignes  | Non (aperçu seulement) |
| Composants joueur de production                       | `src/components/Player*.tsx` + `PlayerFlowPage.tsx` | ~3 000 lignes  | **Oui**                |

Environ 15 000 lignes d'outillage d'édition, pour aucun impact sur l'expérience réelle des joueurs.

### 3.3 Le modèle « template » est déjà prévu dans les types

`PlayerScreenConfig` (`src/types.ts:156`) contient déjà :

- `theme` : logo, couleurs primaire, secondaire et accent, fond (couleur, dégradé, image…), police, arrondis, mode sombre/clair ;
- `content` : titre, sous-titre et règles du pregame, `formFields`, textes de victoire et de défaite, paramètres du jeu ;
- `gameAssets` : segments de la roue, image de grattage, sons.

C'est exactement l'approche proposée, mais ce schéma n'est rempli ni lu par personne.

### 3.4 On passe notre temps à combattre le modèle

Pour rendre **un seul** écran pregame responsive, il a fallu ajouter successivement :

- une roue forcée en carré (`squareifyWheelRect`) ;
- des unités de conteneur CSS (`cqw`/`cqh`) sur chaque élément ;
- un ratio largeur/hauteur maximal pour éviter l'étirement sur desktop ;
- des champs verrouillés (`lockedFields`, `softLocked`, `locked`) ;
- des migrations pour réinjecter le footer légal s'il a été supprimé ;
- une validation de « slots » pour vérifier que les éléments obligatoires existent.

Quand il faut autant de code pour **limiter** la liberté offerte, c'est que cette liberté n'était pas le bon choix de départ.

---

## 4. Pourquoi le canvas libre ne convient pas à OCTOREACH

1. **Utilisateurs cibles** : des marketeurs de marques algériennes, pas des designers. Ils veulent une campagne en ligne en quelques minutes, aux couleurs de la marque, qui fonctionne sur tous les téléphones.
2. **Responsive** : un positionnement absolu en % ne se réorganise jamais. Chaque format (mobile, tablette, desktop, paysage) devient un cas particulier à corriger.
3. **Conformité (loi 18-07)** : le consentement et le footer légal peuvent être déplacés, masqués ou supprimés dans un canvas libre. Or ces règles sont non négociables (voir `CLAUDE.md`).
4. **Qualité garantie** : l'utilisateur peut produire un écran cassé (bouton hors écran, texte illisible, éléments qui se chevauchent, contraste insuffisant).
5. **Coût de maintenance** : timeline GSAP, Lottie, export de code React, outils d'alignement et de distribution, rotation, ancres, modes d'échelle, historique d'annulation par élément… Beaucoup de code pour des besoins non exprimés.
6. **Double travail** : chaque amélioration visuelle doit être faite dans l'éditeur **et** dans les composants de production, qui ne partagent rien.

---

## 5. Architecture recommandée

### 5.1 Principe

- Les **templates sont du code** : composants React en flex/grid, responsive par construction, testés.
- La **personnalisation est de la donnée** : une configuration remplie via des formulaires.
- La mise en page n'est **pas** de la donnée.

### 5.2 Modèle de configuration (esquisse)

```ts
interface CampaignDesign {
  schemaVersion: number;
  templateId: string; // ex. "midnight-gold"

  theme: {
    mode: "dark" | "light";
    primaryColor: string;
    accentColor: string;
    background: { type: "color" | "gradient" | "image"; value: string };
    fontFamily: string;
    radius: "sharp" | "rounded" | "pill";
  };

  brand: {
    name: string;
    logoUrl?: string;
  };

  // Un bloc de contenu par langue (fr / ar / en), dir="auto" pour l'arabe
  content: Record<
    "fr" | "ar" | "en",
    {
      headline: string;
      subtitle: string;
      ctaLabel: string;
      winTitle: string;
      loseTitle: string;
      footerLinks: { label: string; url?: string }[];
      legalText: string;
    }
  >;

  form: {
    fields: {
      key: "name" | "phone" | "email" | "wilaya" | "custom";
      label: string;
      required: boolean;
      enabled: boolean;
    }[];
    consentText: string; // toujours affiché, jamais désactivable
  };

  sections: {
    jackpotCard?: {
      enabled: boolean;
      eyebrow: string;
      title: string;
      badge: string;
    };
    prizeChips?: {
      enabled: boolean;
      items: { icon: string; value: string; caption: string }[];
    };
  };

  game: {
    wheel?: { segments: { label: string; color: string }[] };
    scratch?: { surfaceImageUrl?: string };
  };
}
```

Point de départ conseillé : faire évoluer `PlayerScreenConfig` existant plutôt que repartir de zéro.

### 5.3 Règles structurantes

- **Un seul moteur de rendu** : l'aperçu de l'éditeur et `/play/:slug` utilisent **les mêmes composants**. Ce que la marque voit est ce que le joueur voit.
- **Obligations intégrées au cadre du template**, sans option pour les retirer :
  - consentement avant participation (loi 18-07) ;
  - footer et mentions légales ;
  - tirage du lot uniquement côté serveur (`select-prize`) ;
  - protection anti-doublon.
- **Garde-fous** : longueur maximale des textes, contraste minimum entre texte et fond, champ téléphone toujours présent et normalisé (format algérien).
- **Moteurs de jeu** (roue, quiz, grattage…) : composants qui reçoivent les tokens du thème et la configuration du jeu.

### 5.4 Interface de l'éditeur

- **À gauche**, des panneaux de formulaires : Marque · Thème · Textes (par langue) · Formulaire · Sections · Jeu · Légal.
- **À droite**, un aperçu en direct, avec onglets par écran (pregame, jeu, victoire, défaite) et par format (mobile, tablette, desktop).
- **Choix du template** en haut, avec vignettes.

---

## 6. Ce qu'on garde et ce qu'on abandonne

### À réutiliser

- Les blocs conçus pendant le redesign (header, footer avec bandeau légal, carte jackpot, chips de lots, badge héro, roue premium). Ce sont déjà des « sections avec props ».
- Les formulaires d'édition de ces blocs, proches des futurs panneaux de réglages.
- Les tokens de thème sombre « Midnight Gold ».
- Les presets de marque et l'i18n du simulateur Aktera (`player-editor/aktera-presets.ts`, `aktera-i18n.ts`).
- Les moteurs de jeu existants (`player-editor/engines/`).

### À abandonner

- Le canvas libre : `react-moveable`, sélection multiple, transforms, ancres, modes d'échelle, rotation, z-index.
- Le système de verrous et la validation de slots.
- La timeline GSAP, Lottie et l'export de code React.
- Les outils d'alignement et de distribution, ainsi que les raccourcis de déplacement.
- `uiProject` dans `PlayerScreenConfig`.

---

## 7. Nuances et contre-arguments

- **Différenciation visuelle** : les campagnes risquent de se ressembler. On compense avec :
  - plusieurs templates de styles différents ;
  - des sections activables (et éventuellement réordonnables dans une pile verticale, qui reste responsive) ;
  - des images de fond et d'illustration propres à chaque marque.
- **Clients premium / agences** : le design sur-mesure reste possible, sous forme d'**outil interne** avec lequel l'équipe OCTOREACH crée de nouveaux templates. Ce n'est pas une fonction à exposer aux clients.
- **Migration** : le risque est faible, puisque `uiProject` n'est pas rendu en production. On peut l'ignorer, ou n'en extraire que les couleurs et les textes.

---

## 8. Plan de migration proposé

| Étape | Objectif                                                                     | Résultat                                        |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| 1     | Figer le schéma `CampaignDesign` à partir de `PlayerScreenConfig`            | Types + valeurs par défaut + versionnement      |
| 2     | Implémenter un premier template (« Midnight Gold ») qui lit la configuration | `/play/:slug` affiche enfin le design configuré |
| 3     | Construire l'éditeur en formulaires avec aperçu utilisant ce même rendu      | Personnalisation réelle, visible en production  |
| 4     | Ajouter 1 à 2 templates supplémentaires                                      | Choix de styles pour les marques                |
| 5     | Supprimer `player-ui-maker` et fusionner le simulateur Aktera                | Environ 15 000 lignes en moins à maintenir      |

---

## 9. Questions ouvertes

1. **Nombre de templates au lancement** : un par type de jeu, ou deux ou trois styles communs à tous les jeux ?
2. **Sections** : faut-il pouvoir les **réordonner**, ou seulement les activer et les désactiver ?
3. **Langues** : le contenu doit-il être saisi dans les trois langues (fr / ar / en), ou une langue principale avec traductions optionnelles ?
4. **Champs du formulaire** : liste fermée (nom, téléphone, email, wilaya…), ou champs personnalisés autorisés ?
5. **Designs existants** : faut-il récupérer les `uiProject` déjà enregistrés, ou repartir des valeurs par défaut du template ?
