/**
 * Script pour créer des données de test dans Supabase
 * 
 * Usage:
 * 1. Créez un fichier .env.local avec vos variables d'environnement Supabase
 * 2. Exécutez: npx tsx scripts/seed-data.ts
 * 
 * OU
 * 
 * Exécutez ce script directement dans l'éditeur SQL de Supabase
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// Récupérer les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes!')
  console.error('Assurez-vous d\'avoir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans votre .env.local')
  process.exit(1)
}

// Créer un client Supabase avec les droits admin
const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Crée un utilisateur avec un profil
 */
async function createUserWithProfile(
  email: string,
  password: string,
  fullName: string,
  role: 'admin' | 'agent' | 'user' | 'support'
) {
  // Créer l'utilisateur dans auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (authError) {
    console.error(`❌ Erreur création utilisateur ${email}:`, authError.message)
    return null
  }

  if (!authData.user) {
    console.error(`❌ Utilisateur ${email} non créé`)
    return null
  }

  // Créer le profil
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
    })

  if (profileError) {
    console.error(`❌ Erreur création profil ${email}:`, profileError.message)
    return null
  }

  return authData.user
}

/**
 * Crée un agent
 */
async function createAgent(userId: string, phone: string | null = null) {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      id: userId,
      status: 'active',
      phone,
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Erreur création agent ${userId}:`, error.message)
    return null
  }

  return data
}

/**
 * Crée un client
 */
async function createClientRecord(
  agentId: string,
  email: string,
  fullName: string,
  phone: string | null = null,
  company: string | null = null,
  notes: string | null = null
) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      agent_id: agentId,
      email,
      full_name: fullName,
      phone,
      company,
      status: 'active',
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Erreur création client ${email}:`, error.message)
    return null
  }

  return data
}

/**
 * Crée un magic link
 */
async function createMagicLink(
  agentId: string,
  clientId: string,
  expiresInDays: number = 7
) {
  const token = crypto.randomUUID().replace(/-/g, '').substring(0, 32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const { data, error } = await supabase
    .from('magic_links')
    .insert({
      agent_id: agentId,
      client_id: clientId,
      token,
      status: 'issued',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Erreur création magic link:`, error.message)
    return null
  }

  return data
}

/**
 * Fonction principale pour créer toutes les données de test
 */
async function seedData() {

  try {
    // 1. Créer un utilisateur admin/support
    const adminUser = await createUserWithProfile(
      'admin@simplicom.com',
      'Admin123!',
      'Administrateur Principal',
      'support'
    )
    
    if (!adminUser) {
      throw new Error('Impossible de créer l\'utilisateur admin')
    }

    // Créer l'agent pour l'admin
    await createAgent(adminUser.id, '+33 6 12 34 56 78')

    // 2. Créer des agents
    const agent1 = await createUserWithProfile(
      'agent1@simplicom.com',
      'Agent123!',
      'Jean Dupont',
      'agent'
    )
    
    if (!agent1) {
      throw new Error('Impossible de créer l\'agent 1')
    }
    
    await createAgent(agent1.id, '+33 6 98 76 54 32')

    const agent2 = await createUserWithProfile(
      'agent2@simplicom.com',
      'Agent123!',
      'Marie Martin',
      'agent'
    )
    
    if (!agent2) {
      throw new Error('Impossible de créer l\'agent 2')
    }
    
    await createAgent(agent2.id, '+33 6 11 22 33 44')


    // 3. Créer des clients pour l'agent 1
    const client1 = await createClientRecord(
      agent1.id,
      'client1@entreprise.com',
      'Entreprise ABC',
      '+33 1 23 45 67 89',
      'ABC Corp',
      'Client important depuis 2020'
    )

    const client2 = await createClientRecord(
      agent1.id,
      'client2@startup.io',
      'Startup XYZ',
      '+33 1 98 76 54 32',
      'XYZ Startup',
      'Nouveau client'
    )

    // 4. Créer des clients pour l'agent 2
    const client3 = await createClientRecord(
      agent2.id,
      'client3@business.fr',
      'Business Solutions',
      '+33 1 55 66 77 88',
      'Business Solutions SARL',
      null
    )


    // 5. Créer des magic links
    if (client1) {
      await createMagicLink(agent1.id, client1.id, 7)
      await createMagicLink(agent1.id, client1.id, 14) // Un lien actif, un lien expiré
    }

    if (client2) {
      await createMagicLink(agent2.id, client2.id, 30)
    }

    if (client3) {
      await createMagicLink(agent2.id, client3.id, 5)
    }

 

  } catch (error) {
    console.error('\n❌ Erreur lors de la création des données:', error)
    process.exit(1)
  }
}

// Exécuter le script
seedData()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error)
    process.exit(1)
  })






