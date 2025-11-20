import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import EditAgentForm from '@/components/admin/EditAgentForm'

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<React.JSX.Element> {
  // Vérifier les permissions
  try {
    await requireRole(['admin', 'support'])
  } catch {
    redirect('/unauthorized')
  }

  const supabase = await createClient()
  const { id: agentId } = await params

  // Récupérer les informations de l'agent
  const [agentResult, profileResult] = await Promise.all([
    supabase.from('agents').select('*').eq('id', agentId).single(),
    supabase.from('profiles').select('*').eq('id', agentId).single(),
  ])

  const agent = agentResult.data
  const profile = profileResult.data

  if (!agent) {
    redirect('/admin/dashboard')
  }

  // Si le profil n'existe pas, créer un profil par défaut
  const defaultProfile = profile || {
    id: agent.id,
    email: 'email@non-disponible.com',
    full_name: agent.full_name || null,
    role: 'agent' as const,
  }

  return <EditAgentForm agent={agent} profile={defaultProfile} />
}

