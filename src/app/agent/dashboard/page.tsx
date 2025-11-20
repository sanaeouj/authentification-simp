import { createClient } from '@/lib/supabase/server'
import { requireAuth, getAgentProfile } from '@/lib/utils/auth'
import type { Client, MagicLink } from '@/lib/types/database.types'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import KPIWidget from '@/components/dashboard/KPIWidget'
import StatusOverviewCard from '@/components/dashboard/StatusOverviewCard'
import ClientTableWrapper from '@/components/dashboard/ClientTableWrapper'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline'

const isActiveMagicLink = (status: MagicLink['status']): boolean => status === 'pending'

type ClientWithMeta = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

export default async function AgentDashboard(): Promise<React.JSX.Element> {
  // Vérification de l'authentification
  await requireAuth()
  const agent = await getAgentProfile()

  if (!agent) redirect('/unauthorized')

  // Récupération des clients avec leurs magic links et du profil agent
  const supabase = await createClient()

  const [clientsResult, submissionsResult] = await Promise.all([
    supabase
      .from('clients')
      .select(`
        *,
        magic_links (*)
      `)
      .eq('agent_id', agent.id),
    supabase
      .from('form_submissions')
      .select('id, submitted_at, magic_links(client_id)')
      .eq('magic_links.agent_id', agent.id)
      .order('submitted_at', { ascending: false })
      .limit(5),
  ])

  const clientsRaw = clientsResult.data as (Client & { magic_links: MagicLink[] })[] | null
  const submissions = submissionsResult.data as {
    id: string
    submitted_at: string | null
    magic_links: { client_id: string | null } | null
  }[] | null

  const latestSubmissionByClient = (submissions ?? []).reduce<
    Record<string, { id: string; submitted_at: string | null }>
  >((acc, submission) => {
    const clientId = submission.magic_links?.client_id ?? null
    if (!clientId) return acc

    const existing = acc[clientId]
    const currentTimestamp = submission.submitted_at ? new Date(submission.submitted_at).getTime() : 0
    const existingTimestamp = existing?.submitted_at ? new Date(existing.submitted_at).getTime() : 0

    if (!existing || currentTimestamp >= existingTimestamp) {
      acc[clientId] = { id: submission.id, submitted_at: submission.submitted_at ?? null }
    }

    return acc
  }, {})

  const clients: ClientWithMeta[] =
    clientsRaw?.map(client => {
      const submissionMeta = latestSubmissionByClient[client.id]
      return {
        ...client,
        latest_submission_id: submissionMeta?.id ?? null,
        latest_submission_at: submissionMeta?.submitted_at ?? null,
      }
    }) ?? []

  // Calcul des statistiques
  const totalClients: number = clients?.length ?? 0
  const activeLinks: number =
    clients?.reduce(
      (acc, client) => acc + client.magic_links.filter(link => isActiveMagicLink(link.status)).length,
      0
    ) ?? 0
  const completedForms: number = clients?.reduce((acc, client) =>
    acc + client.magic_links.filter(link => link.status === 'used').length, 0
  ) ?? 0

  // Organisation des clients par statut
  const activeClients = clients.filter(c => c.status === 'active')
  const inactiveClients = clients.filter(c => c.status === 'inactive')
  const archivedClients = clients.filter(c => c.status === 'archived')

  // Activités récentes
  const recentSubmissions = (submissions ?? []).slice(0, 5).map(sub => {
    const client = clients.find(c => c.id === sub.magic_links?.client_id)
    return {
      id: sub.id,
      submitted_at: sub.submitted_at,
      client_name: client?.full_name ?? 'Client inconnu',
      client_id: sub.magic_links?.client_id ?? null,
    }
  })


  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">Dashboard Agent</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos clients et vos liens magiques
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/agent/clients/new">
                <Plus className="h-4 w-4" />
                Nouveau client
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">

        {/* KPI Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Vue d&apos;ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPIWidget
              title="Total Clients"
              value={totalClients}
              color="blue"
              icon="Users"
            />
            <KPIWidget
              title="Liens Actifs"
              value={activeLinks}
              color="cyan"
              icon="Link2"
            />
            <KPIWidget
              title="Formulaires Complétés"
              value={completedForms}
              color="green"
              icon="FileCheck"
            />
          </div>
        </section>

        {/* Status Overview */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Statut des clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusOverviewCard
              title="Clients Actifs"
              count={activeClients.length}
              color="green"
            />
            <StatusOverviewCard
              title="Clients Inactifs"
              count={inactiveClients.length}
              color="yellow"
            />
            <StatusOverviewCard
              title="Clients Archivés"
              count={archivedClients.length}
              color="gray"
            />
          </div>
        </section>

        {/* Clients Table and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Clients récents</h2>
              <ClientTableWrapper clients={clients} />
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
              <ActivityTimeline
                activities={recentSubmissions}
                clients={clients}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

