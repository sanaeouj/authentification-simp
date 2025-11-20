import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Agent, UserRole } from '@/lib/types/database.types'

/**
 * Récupère l'utilisateur actuellement connecté
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    
    // Si erreur de refresh token invalide ou session expirée, retourner null
    if (error) {
      // Les erreurs de refresh token invalide sont courantes quand la session a expiré
      // On les traite comme une session invalide et retournons null
      // Cela permettra à requireAuth() de rediriger vers la page de connexion
      const isRefreshTokenError = 
        (error.message && typeof error.message === 'string' && error.message.includes('Refresh Token')) || 
        (error.message && typeof error.message === 'string' && error.message.includes('Invalid Refresh Token')) ||
        (error.message && typeof error.message === 'string' && error.message.includes('Refresh Token Not Found'))
      
      if (isRefreshTokenError) {
        // Session expirée ou invalide, retourner null sans logger (c'est attendu)
        return null
      }
      
      // Pour les autres erreurs, logger mais retourner null
      console.warn('Erreur lors de la récupération de l\'utilisateur:', error.message)
      return null
    }
    
    return data.user ?? null
  } catch (err) {
    // En cas d'exception, retourner null
    // Cela permettra une redirection automatique vers la page de connexion
    console.warn('Exception lors de la récupération de l\'utilisateur:', err)
    return null
  }
}

/**
 * Récupère le rôle de l'utilisateur connecté (si présent)
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null
  return profile.role as UserRole
}

/**
 * Récupère le profil complet de l'agent connecté
 */
export async function getAgentProfile(): Promise<Agent | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !agent) return null
  return agent as Agent
}

/**
 * Exige qu'un utilisateur soit authentifié, sinon throw
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

/**
 * Exige que l'utilisateur ait un rôle autorisé, sinon throw
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserRole> {
  const role = await getUserRole()
  if (!role || !allowedRoles.includes(role)) {
    redirect('/unauthorized')
  }
  return role
}