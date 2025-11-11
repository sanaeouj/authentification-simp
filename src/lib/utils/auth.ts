import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Agent, UserRole } from '@/lib/types/database.types'

/**
 * Récupère l'utilisateur actuellement connecté
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
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