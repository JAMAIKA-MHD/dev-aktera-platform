# Analyse de la route « Organisations » : points négatifs et plan de correction

> Périmètre : la page `/account` (onglet Profile = informations de l'organisation), l'inscription
> (`RegisterPage` → Edge Function `create-organization`), la reprise d'un compte orphelin
> (`CompleteOrganizationSetupPage` → RPC `complete_current_user_onboarding`), `AuthContext`,
> `ProtectedRoute`, et les migrations SQL / RLS qui protègent `organizations` et `profiles`.
>
> Il n'existe pas de route `/organizations` à proprement parler : l'organisation est gérée dans
> `src/components/AccountSettings.tsx` (889 lignes).
>
> Méthode : lecture du code et des migrations. Les points de sécurité (section 1) sont **confirmés
> par le texte des migrations** ; le script de test de la section 6 permet de les reproduire sur la
> base locale avant de corriger.

Légende : 🔴 critique · 🟠 important · 🟡 moyen · ⚪ mineur

---

## 1. Sécurité et base de données

### 🔴 S1. Un simple membre peut se donner le rôle `owner` (escalade de rôle)

`update_org_profiles` (`20260630150507_create_dzengage_rls_policies.sql`) :

```sql
USING (id = auth.uid() OR is_org_member(organization_id))
WITH CHECK (id = auth.uid() OR is_org_member(organization_id))
```

- La politique ne regarde **aucune colonne** : un `viewer` peut faire
  `update profiles set role = 'owner' where id = auth.uid()`.
- Il peut aussi modifier le profil (rôle, nom, email) de **n'importe quel autre membre** de son organisation.
- `delete_org_profiles` : tout membre peut **supprimer le profil de n'importe quel collègue, y compris le owner**.
- Les commentaires de la migration annoncent « managers+ for writes » : ce n'est pas implémenté.

**Correction :** RPC `SECURITY DEFINER` pour tout changement de rôle / suppression de membre
(vérifie que l'appelant est `owner`/`admin`), et retirer l'`UPDATE` direct sur `role`,
`organization_id`, `id`, `email` (trigger `BEFORE UPDATE` qui refuse ces colonnes, ou
`REVOKE UPDATE` puis `GRANT UPDATE (full_name, avatar_url…)` par colonne). Restreindre `DELETE` aux `owner`/`admin`, et jamais sur le dernier `owner`.

### 🔴 S2. Rattachement à n'importe quelle organisation à l'insertion du profil

`insert_org_profiles` : `WITH CHECK (id = auth.uid())`. Ni `organization_id` ni `role` ne sont
contrôlés. Tout utilisateur authentifié **sans profil** (compte orphelin, ou compte créé par
`signUp` si l'inscription publique de Supabase Auth est ouverte) peut insérer
`{ id: <son id>, organization_id: <uuid d'une autre organisation>, role: 'owner' }` et obtenir
l'accès complet aux campagnes, lots, stocks et participants de cette organisation (il lui faut
seulement l'UUID).

**Correction :** supprimer cette politique `INSERT` pour `authenticated` (la création de profil
passe uniquement par `complete_current_user_onboarding` / `create_organization_onboarding`), et
vérifier dans le projet Supabase que `Allow new users to sign up` est **désactivé**
(`config.toml` : `enable_signup = false`) puisque l'inscription passe par l'Edge Function.

### 🔴 S3. Un membre peut modifier le plan, le slug et l'état de l'organisation

`update_own_organization` autorise `UPDATE` sur **toute la ligne** à tout membre. Depuis la console du
navigateur : `update organizations set plan = 'enterprise', is_active = true …`.
`AccountSettings` n'envoie que `name`, `contact_email`, `phone_number`, mais rien côté base ne
l'impose. De plus, la table `billing` a les mêmes grants généraux (voir S5).

**Correction :** `REVOKE UPDATE ON organizations FROM authenticated` puis
`GRANT UPDATE (name, contact_email, phone_number, address, …) ON organizations TO authenticated`
(colonnes éditables uniquement), et réserver la modification à `owner`/`admin`.

### 🟠 S4. `create_organization_onboarding` n'est pas durcie

`20260701000000_create_organization_onboarding.sql` : fonction sans `SECURITY DEFINER`, **sans
`SET search_path = public`**, sans `REVOKE`. Elle est donc exécutable par `anon` et `authenticated`
(le `GRANT EXECUTE ON ALL ROUTINES … TO anon, authenticated` de la migration de restauration).
Elle est protégée « par accident » parce que la RLS refuse l'insertion dans `organizations`, mais :

- elle contredit la règle du projet (`REVOKE ALL … FROM PUBLIC, anon, authenticated`, puis `GRANT` explicite) ;
- elle prend `p_user_id` et `p_plan` en paramètres libres (un appelant qui contourne la RLS choisirait n'importe quel plan et rôle `owner`) ;
- elle crée une ligne `billing` **`status = 'paid'`, `amount = 0`, valable 1 an** pour tout le monde, sans paiement.

**Correction :** `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`,
`GRANT EXECUTE … TO service_role`, forcer `p_plan := 'free'` dans la fonction, et supprimer la
facturation factice (ou la marquer `trial`).

### 🟠 S5. Grants généraux sur toutes les tables

`20260706091000_restore_api_grants_and_add_org_recovery.sql` :
`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES … TO anon, authenticated`, **et**
`ALTER DEFAULT PRIVILEGES … GRANT … TO anon, authenticated` pour toutes les futures tables
et `GRANT EXECUTE ON ROUTINES` pour toutes les futures fonctions. Toute nouvelle table ou
fonction est donc ouverte par défaut ; la sécurité repose uniquement sur le fait de ne jamais
oublier la RLS / le `REVOKE`. C'est l'inverse du modèle « refus par défaut ».

**Correction :** migration qui retire les `DEFAULT PRIVILEGES` pour `anon`/`authenticated`, révoque
`anon` sur les tables non publiques, et accorde les droits table par table. Ajouter le test
`npm run backend:probe` en CI.

### 🟠 S6. `is_org_member` sans `search_path`

Fonction `SECURITY DEFINER` sans `SET search_path = public` : vulnérable au détournement de
`search_path`. De plus, elle est appelée par chaque politique (coût : une sous-requête par ligne).

**Correction :** `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`, `STABLE` conservé, et index sur `profiles(id, organization_id)`.

### 🟡 S7. Pas de contrainte d'unicité sur le nom d'organisation

L'unicité est vérifiée en application (`ilike` dans l'Edge Function, `lower(name) =` dans la RPC)
sans contrainte SQL : deux inscriptions simultanées créent deux organisations de même nom
(course critique). Idem pour l'email de contact.
**Correction :** `CREATE UNIQUE INDEX … ON organizations (lower(name))` (et un index unique sur `lower(contact_email)` si c'est voulu), et traduire l'erreur `23505` en message clair.

### 🟡 S8. Rôles et plans sans contrainte

`role` (`owner/admin/manager/viewer`) et `plan` (`free/starter/pro/enterprise`) sont des listes
côté TypeScript (`DbOrganization.plan`), mais rien ne garantit les valeurs en base. Vérifier / ajouter des `CHECK` ou des types `enum`.

---

## 2. Edge Function `create-organization`

| #   | Gravité | Problème                                                                                                                                                                                                       | Correction                                                                                                      |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| E1  | 🟠      | Le test `REGISTRATION_ENABLED` est fait **avant** la réponse `OPTIONS` : le navigateur voit un échec CORS au lieu du vrai message quand l'inscription est fermée.                                              | Répondre d'abord à `OPTIONS`, puis tester le drapeau.                                                           |
| E2  | 🟠      | Vérification de l'email en JS : `select('id, contact_email').limit(200)` puis comparaison locale. Au-delà de 200 organisations, **le doublon n'est plus détecté**, et la fonction charge des données inutiles. | Requête filtrée (`.eq('contact_email', email)`) ou, mieux, laisser l'erreur `23505` d'un index unique remonter. |
| E3  | 🟠      | `ilike` sur le nom : les caractères `%` et `_` du nom sont interprétés comme jokers (faux positifs).                                                                                                           | Échapper les jokers, ou comparer `lower(name)` avec `eq` + index unique.                                        |
| E4  | 🟠      | Le `catch` générique renvoie `error.message` avec un 500 : fuite de messages internes (SQL, noms de tables).                                                                                                   | Journaliser côté serveur, renvoyer un message générique et un `code` (comme `select-prize`).                    |
| E5  | 🟡      | CORS `Access-Control-Allow-Origin: *`.                                                                                                                                                                         | Limiter aux origines connues (Firebase hosting, localhost).                                                     |
| E6  | 🟡      | `createUser({ email_confirm: true })` : l'email n'est **jamais vérifié**. N'importe qui crée un compte avec l'adresse d'un tiers (usurpation, spam).                                                           | Envoyer un email de confirmation (ou un lien d'invitation) avant d'activer l'organisation.                      |
| E7  | 🟡      | Aucune limitation de débit ni de captcha sur une fonction publique qui crée des comptes.                                                                                                                       | Rate limit par IP (table ou `pg_net`), Turnstile/hCaptcha, quota d'organisations par jour.                      |
| E8  | 🟡      | Rollback par `deleteUser` en cas d'échec de la RPC : si `deleteUser` échoue lui aussi, on laisse un utilisateur orphelin (justement le cas que `CompleteOrganizationSetupPage` doit réparer).                  | Journaliser l'échec de rollback ; tâche de nettoyage ; ou créer l'organisation d'abord dans une transaction.    |

---

## 3. Inscription et reprise de compte (front)

- 🟠 **Mot de passe : règles incohérentes.** `RegisterPage` exige 8 caractères, `AccountSettings` seulement 6 (`newPassword.length < 6`), et la politique réelle est celle de Supabase Auth. **Correction :** une seule constante partagée + même règle dans `config.toml`.
- 🟠 **`currentPassword` ignoré.** L'onglet Password demande le mot de passe actuel mais ne le vérifie jamais (`updateUser({ password })` direct) : le champ est trompeur. **Correction :** ré-authentifier (`signInWithPassword`) avant la mise à jour, ou retirer le champ.
- 🟡 **Changement d'email** (`updateUser({ email })`) : `organizations.contact_email` et `profiles.email` ne sont pas mis à jour après confirmation, ils divergent de `auth.users.email`.
- 🟡 **Page de reprise (`CompleteOrganizationSetupPage`)** : le plan `free` est codé en dur côté client (`p_plan: 'free'`) alors que la RPC accepte `p_plan` librement (voir S4) ; l'écran « Organization setup completed! » et plusieurs textes sont en dur en anglais, hors `t()`.
- ⚪ Les doublons de mise en page (panneau hero, fond, logo) sont copiés entre `LoginPage`, `RegisterPage` et `CompleteOrganizationSetupPage` (≈ 280–340 lignes chacune) : à extraire dans un `AuthLayout`.

---

## 4. `AuthContext` et `ProtectedRoute`

- 🔴 **`refreshProfile()` remet `loading = true`** → `ProtectedRoute` affiche le spinner plein écran et **démonte tout le dashboard** (perte de l'état local, de la page ouverte, des brouillons) à chaque enregistrement du profil ou de l'organisation. **Correction :** `refreshProfile` doit être un rechargement silencieux (ne pas toucher `loading`, qui ne sert qu'au premier chargement).
- 🟠 **Requêtes séquentielles et `.single()`** : `profiles` puis `organizations`, chacune avec `.single()` (erreur `PGRST116` traitée comme une erreur réseau). Une seule requête avec jointure (`profiles` + `organizations(*)`) est plus rapide, atomique, et permet de distinguer « pas de profil » (→ page de reprise) de « erreur réseau » (→ réessayer). Utiliser `.maybeSingle()`.
- 🟠 **Pas de bouton « Réessayer »** dans l'écran `authError` de `ProtectedRoute` : l'utilisateur est bloqué, sans déconnexion possible.
- 🟡 **Rôle jamais appliqué dans l'interface** : le contexte connaît `owner/admin/manager/viewer`, mais ni `ProtectedRoute` ni `AccountSettings` ne masquent quoi que ce soit selon le rôle. Un `viewer` voit et peut déclencher « Save organization ».
- 🟡 Le garde `loadedUserId` ignore les événements d'auth répétés, mais ne couvre pas le changement de session (autre onglet, jeton rafraîchi avec un utilisateur différent) ; à tester.

---

## 5. Page `/account` (`AccountSettings.tsx`)

- 🔴 **Données factices affichées comme vraies et jamais enregistrées** : `nif`, `rc`, `nis`, `ai`, `address`, `wilaya` (« 16 - Alger »), `website`, `industry` (« Telecom & Retail »), `jobTitle` (« Marketing & Growth Lead ») sont des états locaux avec des **valeurs par défaut inventées**. L'utilisateur croit les avoir saisis ; au rechargement tout disparaît ou revient aux valeurs inventées. **Correction :** ajouter les colonnes (`nif`, `rc`, `nis`, `ai`, `address`, `wilaya`, `website`, `industry`) à `organizations` (et `job_title` à `profiles`), les lire dans `AuthContext`, les enregistrer ; valeurs par défaut vides.
- 🟠 **Écritures non atomiques** : `organizations.update` puis `profiles.update`, sans transaction. Si la seconde échoue, la première est déjà enregistrée et l'écran affiche une erreur partielle. **Correction :** une RPC `update_organization_profile(...)` qui fait les deux (et vérifie le rôle).
- 🟠 **Notifications non persistées** : les interrupteurs n'écrivent nulle part (état local). **Correction :** table / colonne `notification_preferences jsonb`, ou retirer l'onglet tant qu'il n'est pas branché.
- 🟠 **Avatar** : `URL.createObjectURL` + `localStorage "user-avatar-preview"` (TODO déjà noté dans le code). L'image n'existe que dans ce navigateur, l'URL d'objet fuit (jamais `revokeObjectURL`) et le `localStorage` est partagé entre utilisateurs du même poste. **Correction :** bucket Storage avec politique par `organization_id`/`user_id`, URL enregistrée dans `profiles.avatar_url`.
- 🟡 **Validation faible** : pas de format téléphone algérien (la normalisation existe déjà dans `select-prize`, la réutiliser), pas de validation email/URL/NIF, pas de longueur max, pas de `zod` alors que le projet l'utilise ailleurs.
- 🟡 **Fichier monolithique de 889 lignes** : 4 onglets, états, appels Supabase et JSX mélangés. **Correction :** `features/account/` avec un composant par onglet, un hook `useOrganizationProfile`, un service `organizationService.ts` (conformément à la séparation hooks / services du projet).
- ⚪ Messages d'erreur / de succès et libellés en dur, hors `t()` ; pas d'état « enregistrement en cours » par onglet ; pas de confirmation en cas de quitter avec des modifications non enregistrées.

---

## 6. Vérification recommandée avant correction (base locale)

Script SQL à exécuter dans `supabase_db_mvp-octoreach` avec un JWT forgé d'un `viewer` (comme pour les tests du support client) :

```sql
-- S1 : un viewer se promeut owner
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid viewer>","role":"authenticated"}';
update profiles set role = 'owner' where id = '<uuid viewer>';          -- attendu : refusé ; actuel : 1 ligne

-- S3 : un membre change le plan
update organizations set plan = 'enterprise' where id = '<org>';        -- attendu : refusé ; actuel : 1 ligne

-- S2 : un utilisateur sans profil rejoint une autre organisation
set local request.jwt.claims = '{"sub":"<uuid sans profil>","role":"authenticated"}';
insert into profiles (id, organization_id, full_name, email, role)
values ('<uuid sans profil>', '<org d''un autre>', 'x', 'x@x', 'owner'); -- attendu : refusé ; actuel : insère
```

Puis étendre `npm run backend:probe` avec ces trois cas pour qu'ils restent verrouillés.

---

## 7. Plan de correction proposé (ordre conseillé)

| Étape | Contenu                                                                                                                                                                                                                                           | Points traités     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1     | Migration de sécurité : politiques `profiles` (insert/update/delete), `GRANT UPDATE` par colonne sur `organizations`, RPC de gestion des membres, durcissement de `create_organization_onboarding` et `is_org_member`, désactiver `signUp` public | S1, S2, S3, S4, S6 |
| 2     | Migration d'hygiène : index uniques (`lower(name)`, email), `CHECK` sur rôle / plan, retrait des `DEFAULT PRIVILEGES` larges                                                                                                                      | S5, S7, S8         |
| 3     | Edge Function : ordre `OPTIONS`/drapeau, requêtes filtrées, erreurs avec `code`, CORS restreint, confirmation d'email, rate limit                                                                                                                 | E1–E8              |
| 4     | `AuthContext` : `refreshProfile` silencieux, requête jointe + `maybeSingle`, bouton « Réessayer », rôle exposé                                                                                                                                    | Section 4          |
| 5     | `/account` : colonnes réelles + RPC atomique, avatar Storage, notifications persistées ou retirées, découpage en composants, zod                                                                                                                  | Sections 3 et 5    |
| 6     | Tests : probe SQL (section 6), tests Vitest de `AuthContext` (pas de démontage), de `AccountSettings` (champs enregistrés), de l'Edge Function                                                                                                    | Tous               |

Les étapes 1 et 2 sont à faire en premier : ce sont les seules qui concernent la sécurité des
données des autres organisations. Les étapes 4 et 5 corrigent les défauts visibles par les utilisateurs.

---

## 8. Ce qui est correct (à conserver)

- Les politiques `SELECT` des tables d'organisation passent bien par `is_org_member`.
- L'inscription est protégée par `REGISTRATION_ENABLED` et le rollback `deleteUser` existe.
- La RPC `complete_current_user_onboarding` est `SECURITY DEFINER`, avec `search_path`, utilise `auth.uid()` et l'email du JWT (pas de paramètre `user_id` falsifiable) : c'est le bon modèle à généraliser.
- `ProtectedRoute` redirige correctement vers la page de reprise quand le profil manque.
