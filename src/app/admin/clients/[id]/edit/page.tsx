import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import EditClientForm from '@/components/admin/EditClientForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: PageProps): Promise<React.JSX.Element> {
  // Vérifier les permissions
  try {
    await requireRole(['admin', 'support'])
  } catch {
    redirect('/unauthorized')
  }

  const supabase = await createClient()
  const { id: clientId } = await params

  // Récupérer le client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    notFound()
  }

  // Récupérer tous les agents pour le select
  const { data: agents } = await supabase
    .from('agents')
    .select('id, full_name')
    .order('created_at', { ascending: false })

  // Récupérer les profils des agents pour avoir les emails
  const agentIds = agents?.map(a => a.id) || []
  let agentProfiles: Record<string, { email: string; full_name: string | null }> = {}
  
  if (agentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', agentIds)

    agentProfiles = profiles?.reduce((acc, profile) => {
      acc[profile.id] = {
        email: profile.email,
        full_name: profile.full_name,
      }
      return acc
    }, {} as Record<string, { email: string; full_name: string | null }>) || {}
  }

  // Préparer la liste des agents avec leurs noms complets
  const agentsList = agents?.map(agent => ({
    id: agent.id,
    name: agent.full_name || agentProfiles[agent.id]?.full_name || agentProfiles[agent.id]?.email || 'Agent sans nom',
    email: agentProfiles[agent.id]?.email || '',
  })) || []

  return <EditClientForm client={client} agents={agentsList} />
}

