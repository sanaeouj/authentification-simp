import { createClient } from '@/lib/supabase/server'
import { requireAuth, getAgentProfile } from '@/lib/utils/auth'
import { notFound } from 'next/navigation'
import ClientDetailClient from '@/components/ClientDetailClient'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireAuth()
  const agent = await getAgentProfile()

  if (!agent) throw new Error('Profil agent non trouvé')

  const supabase = await createClient()

  // Récupérer le client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('agent_id', agent.id)
    .single()

  if (clientError || !client) {
    notFound()
  }

  // Récupérer les liens magiques existants et la dernière soumission pour ce client
  const [{ data: magicLinks }, { data: latestSubmission }] = await Promise.all([
    supabase
      .from('magic_links')
      .select('*')
      .eq('client_id', client.id)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('form_submissions')
      .select('id, submitted_at')
      .eq('magic_links.client_id', client.id)
      .eq('magic_links.agent_id', agent.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <ClientDetailClient
      client={client}
      magicLinks={magicLinks || []}
      latestSubmission={latestSubmission ?? null}
    />
  )
}
