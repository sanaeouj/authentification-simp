-- ============================================
-- SCRIPT SQL POUR CRÉER DES DONNÉES DE TEST
-- ============================================
-- 
-- IMPORTANT: 
-- 1. Créez d'abord les utilisateurs via l'interface Supabase:
--    Authentication > Users > Add User
--    - admin@simplicom.com / Admin123!
--    - agent1@simplicom.com / Agent123!
--    - agent2@simplicom.com / Agent123!
--
-- 2. Ensuite, exécutez ce script pour créer les profils et autres données
-- ============================================

-- ============================================
-- 1. CRÉER LES PROFILS
-- ============================================

-- Créer les profils pour les utilisateurs existants
DO $$
DECLARE
  admin_user_id uuid;
  agent1_user_id uuid;
  agent2_user_id uuid;
BEGIN
  -- Récupérer les IDs des utilisateurs
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@simplicom.com' LIMIT 1;
  SELECT id INTO agent1_user_id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1;
  SELECT id INTO agent2_user_id FROM auth.users WHERE email = 'agent2@simplicom.com' LIMIT 1;

  -- Créer les profils
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (admin_user_id, 'admin@simplicom.com', 'Administrateur Principal', 'support')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
    
    RAISE NOTICE '✅ Profil admin créé pour %', admin_user_id;
  ELSE
    RAISE WARNING '⚠️ Utilisateur admin@simplicom.com non trouvé. Créez-le d''abord via l''interface Supabase.';
  END IF;

  IF agent1_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (agent1_user_id, 'agent1@simplicom.com', 'Jean Dupont', 'agent')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
    
    RAISE NOTICE '✅ Profil agent1 créé pour %', agent1_user_id;
  ELSE
    RAISE WARNING '⚠️ Utilisateur agent1@simplicom.com non trouvé. Créez-le d''abord via l''interface Supabase.';
  END IF;

  IF agent2_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (agent2_user_id, 'agent2@simplicom.com', 'Marie Martin', 'agent')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
    
    RAISE NOTICE '✅ Profil agent2 créé pour %', agent2_user_id;
  ELSE
    RAISE WARNING '⚠️ Utilisateur agent2@simplicom.com non trouvé. Créez-le d''abord via l''interface Supabase.';
  END IF;
END $$;

-- ============================================
-- 2. CRÉER LES AGENTS
-- ============================================

INSERT INTO agents (id, status, phone)
SELECT 
  id,
  'active',
  '+33 6 12 34 56 78'
FROM auth.users
WHERE email = 'admin@simplicom.com'
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  phone = EXCLUDED.phone;

INSERT INTO agents (id, status, phone)
SELECT 
  id,
  'active',
  '+33 6 98 76 54 32'
FROM auth.users
WHERE email = 'agent1@simplicom.com'
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  phone = EXCLUDED.phone;

INSERT INTO agents (id, status, phone)
SELECT 
  id,
  'active',
  '+33 6 11 22 33 44'
FROM auth.users
WHERE email = 'agent2@simplicom.com'
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  phone = EXCLUDED.phone;

-- ============================================
-- 3. CRÉER LES CLIENTS
-- ============================================

-- Clients pour l'agent 1
INSERT INTO clients (agent_id, email, full_name, phone, company, status, notes)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1),
  'client1@entreprise.com',
  'Entreprise ABC',
  '+33 1 23 45 67 89',
  'ABC Corp',
  'active',
  'Client important depuis 2020'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'agent1@simplicom.com')
ON CONFLICT DO NOTHING;

INSERT INTO clients (agent_id, email, full_name, phone, company, status, notes)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1),
  'client2@startup.io',
  'Startup XYZ',
  '+33 1 98 76 54 32',
  'XYZ Startup',
  'active',
  'Nouveau client'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'agent1@simplicom.com')
ON CONFLICT DO NOTHING;

-- Clients pour l'agent 2
INSERT INTO clients (agent_id, email, full_name, phone, company, status, notes)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent2@simplicom.com' LIMIT 1),
  'client3@business.fr',
  'Business Solutions',
  '+33 1 55 66 77 88',
  'Business Solutions SARL',
  'active',
  NULL
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'agent2@simplicom.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CRÉER LES MAGIC LINKS
-- ============================================

-- Magic links pour client1 (agent1)
INSERT INTO magic_links (agent_id, client_id, token, status, expires_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1),
  (SELECT id FROM clients WHERE email = 'client1@entreprise.com' LIMIT 1),
  generate_nanoid(32),
  'issued',
  NOW() + INTERVAL '7 days'
WHERE EXISTS (
  SELECT 1 FROM clients WHERE email = 'client1@entreprise.com'
)
ON CONFLICT DO NOTHING;

INSERT INTO magic_links (agent_id, client_id, token, status, expires_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1),
  (SELECT id FROM clients WHERE email = 'client1@entreprise.com' LIMIT 1),
  generate_nanoid(32),
  'issued',
  NOW() + INTERVAL '14 days'
WHERE EXISTS (
  SELECT 1 FROM clients WHERE email = 'client1@entreprise.com'
)
ON CONFLICT DO NOTHING;

-- Magic link pour client2 (agent1)
INSERT INTO magic_links (agent_id, client_id, token, status, expires_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent1@simplicom.com' LIMIT 1),
  (SELECT id FROM clients WHERE email = 'client2@startup.io' LIMIT 1),
  generate_nanoid(32),
  'issued',
  NOW() + INTERVAL '30 days'
WHERE EXISTS (
  SELECT 1 FROM clients WHERE email = 'client2@startup.io'
)
ON CONFLICT DO NOTHING;

-- Magic link pour client3 (agent2)
INSERT INTO magic_links (agent_id, client_id, token, status, expires_at)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'agent2@simplicom.com' LIMIT 1),
  (SELECT id FROM clients WHERE email = 'client3@business.fr' LIMIT 1),
  generate_nanoid(32),
  'issued',
  NOW() + INTERVAL '5 days'
WHERE EXISTS (
  SELECT 1 FROM clients WHERE email = 'client3@business.fr'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. VÉRIFICATION
-- ============================================

SELECT '✅ Données créées avec succès!' as message;

SELECT 
  'Profils' as type,
  COUNT(*) as count
FROM profiles
WHERE email LIKE '%@simplicom.com';

SELECT 
  'Agents' as type,
  COUNT(*) as count
FROM agents;

SELECT 
  'Clients' as type,
  COUNT(*) as count
FROM clients;

SELECT 
  'Magic links' as type,
  COUNT(*) as count
FROM magic_links;

-- ============================================
-- IDENTIFIANTS DE CONNEXION
-- ============================================
-- Admin: admin@simplicom.com / Admin123!
-- Agent 1: agent1@simplicom.com / Agent123!
-- Agent 2: agent2@simplicom.com / Agent123!
-- ============================================
