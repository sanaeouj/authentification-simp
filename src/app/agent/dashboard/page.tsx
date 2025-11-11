import { createClient } from '@/lib/supabase/server'
import { requireAuth, getAgentProfile } from '@/lib/utils/auth'
import type { Agent, Client, MagicLink } from '@/lib/types/database.types'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const isActiveMagicLink = (status: MagicLink['status']): boolean => status === 'pending'

type ClientWithMeta = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

export default async function AgentDashboard(): Promise<React.JSX.Element> {
  // Vérification de l'authentification
  const user = await requireAuth()
  const agent = await getAgentProfile()

  if (!agent) redirect('/unauthorized')

  // Récupération des clients avec leurs magic links et du profil agent
  const supabase = await createClient()

  const [agentProfileResult, clientsResult, submissionsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', agent.id)
      .single(),
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
      .order('submitted_at', { ascending: false }),
  ])

  const agentProfile = agentProfileResult.data as { full_name: string | null; email: string | null } | null
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

  const agentDisplayName = agentProfile?.full_name ?? user.email ?? 'Agent'
  const agentEmail = agentProfile?.email ?? user.email ?? ''

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5">
      {/* Header */}
      <header className="glass shadow-lg border-b border-[#00C3D9]/20">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1D3B4E]">
              Bienvenue, {agentDisplayName}
            </h1>
            {agentEmail && (
              <p className="text-sm text-[#1D3B4E]/70">
                {agentEmail}
              </p>
            )}
          </div>
          <Link
            href="/agent/clients/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
          >
            Créer un Client
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total Clients"
            value={totalClients}
            icon="👥"
          />
          <StatsCard
            title="Liens Actifs"
            value={activeLinks}
            icon="🔗"
          />
          <StatsCard
            title="Formulaires Complétés"
            value={completedForms}
            icon="📝"
          />
        </div>

        {/* Clients Table */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="glass shadow-lg overflow-hidden border border-[#00C3D9]/20 sm:rounded-xl">
                <table className="min-w-full divide-y divide-[#00C3D9]/10">
                  <thead className="bg-[#1D3B4E]/5">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1D3B4E] uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1D3B4E] uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1D3B4E] uppercase tracking-wider">
                        Liens Actifs
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1D3B4E] uppercase tracking-wider">
                        Formulaires Complétés
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#1D3B4E] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="glass divide-y divide-[#00C3D9]/10">
                    {clients?.map((client) => (
                      <tr key={client.id} className="hover:bg-[#00C3D9]/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#1D3B4E]">
                            {client.full_name}
                          </div>
                          <div className="text-sm text-[#1D3B4E]/70">
                            {client.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={client.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1D3B4E]/70">
                          {client.magic_links.filter(link => isActiveMagicLink(link.status)).length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1D3B4E]/70">
                          {client.magic_links.filter(link => link.status === 'used').length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1D3B4E]/70">
                          <AgentMagicLinkActions client={client} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Composants utilitaires typés
type StatsCardProps = {
  title: string
  value: number
  icon: string
}

function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="glass overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="shrink-0 text-3xl">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-[#1D3B4E]/70 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-bold text-[#1D3B4E]">
              {value}
            </dd>
          </div>
        </div>
      </div>
    </div>
  )
}

type StatusBadgeProps = {
  status: Client['status']
}

function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<Client['status'], string> = {
    active: 'bg-[#00C3D9]/20 text-[#00C3D9] border border-[#00C3D9]/30',
    inactive: 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30',
    archived: 'bg-[#1D3B4E]/20 text-[#1D3B4E] border border-[#1D3B4E]/30',
  }

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

import AgentMagicLinkActions from '@/components/AgentMagicLinkActions'
