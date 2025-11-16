# Scripts de Gestion des Données

Ce dossier contient des scripts pour gérer les données de test dans votre base de données Supabase.

## 📋 Scripts Disponibles

### 1. `seed-data.ts` (Script TypeScript/Node.js)

Script TypeScript pour créer des données de test via l'API Supabase.

**Prérequis:**
- Node.js installé
- Variables d'environnement configurées dans `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
  SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
  ```

**Usage:**
```bash
# Installer tsx si nécessaire
npm install -g tsx

# Exécuter le script
npx tsx scripts/seed-data.ts
```

**Ce que le script crée:**
- 1 utilisateur admin/support
- 2 agents
- 3 clients
- 4 magic links

**Identifiants de connexion:**
- Admin: `admin@simplicom.com` / `Admin123!`
- Agent 1: `agent1@simplicom.com` / `Agent123!`
- Agent 2: `agent2@simplicom.com` / `Agent123!`

### 2. `seed-data.sql` (Script SQL Direct)

Script SQL à exécuter directement dans l'éditeur SQL de Supabase.

**Usage:**
1. Ouvrez votre projet Supabase
2. Allez dans "SQL Editor"
3. Copiez-collez le contenu de `seed-data.sql`
4. Cliquez sur "Run"

**Avantages:**
- Pas besoin de Node.js
- Exécution directe dans Supabase
- Plus rapide pour les tests

## ⚠️ Notes Importantes

1. **Service Role Key**: Le script TypeScript nécessite la `SUPABASE_SERVICE_ROLE_KEY` pour créer des utilisateurs. Cette clé est très sensible et ne doit JAMAIS être exposée côté client.

2. **Données existantes**: Les scripts utilisent `ON CONFLICT DO NOTHING` pour éviter les doublons, mais vous pouvez modifier cela si nécessaire.

3. **Mots de passe**: Les mots de passe par défaut sont simples pour les tests. Changez-les en production!

4. **Suppression**: Pour supprimer toutes les données de test, vous pouvez utiliser:
   ```sql
   TRUNCATE TABLE form_submissions CASCADE;
   TRUNCATE TABLE magic_links CASCADE;
   TRUNCATE TABLE clients CASCADE;
   TRUNCATE TABLE agents CASCADE;
   DELETE FROM profiles WHERE email LIKE '%@simplicom.com';
   DELETE FROM auth.users WHERE email LIKE '%@simplicom.com';
   ```

## 🔧 Personnalisation

Vous pouvez modifier les scripts pour:
- Créer plus d'utilisateurs/clients
- Changer les emails et mots de passe
- Ajouter des données spécifiques à votre cas d'usage
- Créer des magic links avec différents statuts

## 📝 Structure des Données Créées

### Utilisateurs
- **admin@simplicom.com**: Rôle support, peut accéder au dashboard admin
- **agent1@simplicom.com**: Agent avec 2 clients
- **agent2@simplicom.com**: Agent avec 1 client

### Clients
- **Entreprise ABC**: Client de l'agent1, 2 magic links
- **Startup XYZ**: Client de l'agent1, 1 magic link
- **Business Solutions**: Client de l'agent2, 1 magic link

### Magic Links
- Tous les liens sont au statut `issued`
- Dates d'expiration variées (5, 7, 14, 30 jours)












