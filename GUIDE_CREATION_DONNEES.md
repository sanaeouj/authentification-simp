# Guide de Création des Données de Test

Ce guide vous explique comment créer des données de test pour votre application.

## 📋 Méthode Recommandée : Interface Supabase + Script SQL

### Étape 1 : Créer les Utilisateurs via l'Interface Supabase

1. **Ouvrez votre projet Supabase**
2. **Allez dans "Authentication"** dans le menu de gauche
3. **Cliquez sur "Users"**
4. **Cliquez sur "Add User"** ou "Invite User"

5. **Créez les 3 utilisateurs suivants** :

#### Utilisateur Admin
- **Email** : `admin@simplicom.com`
- **Password** : `Admin123!`
- **Auto Confirm User** : ✅ (cochez cette case)
- Cliquez sur "Create User"

#### Agent 1
- **Email** : `agent1@simplicom.com`
- **Password** : `Agent123!`
- **Auto Confirm User** : ✅
- Cliquez sur "Create User"

#### Agent 2
- **Email** : `agent2@simplicom.com`
- **Password** : `Agent123!`
- **Auto Confirm User** : ✅
- Cliquez sur "Create User"

### Étape 2 : Exécuter le Script SQL

1. **Ouvrez l'éditeur SQL** dans Supabase
2. **Copiez tout le contenu** du fichier `scripts/seed-data.sql`
3. **Collez-le** dans l'éditeur SQL
4. **Cliquez sur "Run"**

Le script va automatiquement :
- ✅ Créer les profils pour les utilisateurs
- ✅ Créer les enregistrements agents
- ✅ Créer 3 clients
- ✅ Créer 4 magic links

### Étape 3 : Vérifier les Données

Le script affiche automatiquement un résumé :
- Nombre de profils créés
- Nombre d'agents créés
- Nombre de clients créés
- Nombre de magic links créés

## 🔧 Alternative : Script TypeScript

Si vous préférez utiliser le script TypeScript :

### Prérequis
1. Créez un fichier `.env.local` à la racine du projet `my-app/` :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

2. Installez les dépendances :
```bash
npm install tsx --save-dev
```

3. Exécutez le script :
```bash
npx tsx scripts/seed-data.ts
```

⚠️ **Important** : La `SUPABASE_SERVICE_ROLE_KEY` est très sensible. Ne la partagez jamais et ne la commitez pas dans Git.

## 📊 Données Créées

### Utilisateurs
- **admin@simplicom.com** (support) - Accès au dashboard admin
- **agent1@simplicom.com** (agent) - 2 clients assignés
- **agent2@simplicom.com** (agent) - 1 client assigné

### Clients
- **Entreprise ABC** (client1@entreprise.com) - Agent 1
- **Startup XYZ** (client2@startup.io) - Agent 1
- **Business Solutions** (client3@business.fr) - Agent 2

### Magic Links
- 2 liens pour Entreprise ABC (expiration 7 et 14 jours)
- 1 lien pour Startup XYZ (expiration 30 jours)
- 1 lien pour Business Solutions (expiration 5 jours)

## 🔐 Identifiants de Connexion

| Email | Mot de passe | Rôle | Dashboard |
|-------|-------------|------|-----------|
| admin@simplicom.com | Admin123! | support | /admin/dashboard |
| agent1@simplicom.com | Agent123! | agent | /agent/dashboard |
| agent2@simplicom.com | Agent123! | agent | /agent/dashboard |

## ⚠️ Notes Importantes

1. **Sécurité** : Les mots de passe sont simples pour les tests. Changez-les en production !

2. **Doublons** : Le script utilise `ON CONFLICT DO NOTHING` pour éviter les doublons. Vous pouvez l'exécuter plusieurs fois sans problème.

3. **Suppression** : Pour supprimer toutes les données de test :
   ```sql
   TRUNCATE TABLE form_submissions CASCADE;
   TRUNCATE TABLE magic_links CASCADE;
   TRUNCATE TABLE clients CASCADE;
   TRUNCATE TABLE agents CASCADE;
   DELETE FROM profiles WHERE email LIKE '%@simplicom.com';
   DELETE FROM auth.users WHERE email LIKE '%@simplicom.com';
   ```

4. **Fonction generate_nanoid** : Assurez-vous que la fonction `generate_nanoid()` existe dans votre base de données. Si ce n'est pas le cas, créez-la avec le script fourni dans `supabase_migrations.sql`.

## ✅ Vérification Post-Création

Après avoir exécuté le script, testez :

1. **Connexion** : Connectez-vous avec `admin@simplicom.com` / `Admin123!`
2. **Dashboard** : Vous devriez voir le dashboard admin avec les statistiques
3. **Clients** : Vérifiez que les clients sont visibles dans le tableau
4. **Magic Links** : Vérifiez que les magic links sont créés

## 🐛 Résolution de Problèmes

### Erreur : "function generate_nanoid does not exist"
→ Exécutez d'abord la fonction de création dans `supabase_migrations.sql`

### Erreur : "user does not exist"
→ Créez d'abord les utilisateurs via l'interface Supabase (Étape 1)

### Aucune donnée créée
→ Vérifiez que les utilisateurs existent dans `auth.users` avec les emails corrects

### Les profils ne sont pas créés
→ Vérifiez que les IDs des utilisateurs correspondent dans `auth.users` et `profiles`










