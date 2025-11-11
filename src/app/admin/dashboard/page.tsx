import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Agent, Client, MagicLink } from '@/lib/types/database.types'
import AdminMagicLinkActions from '@/components/AdminMagicLinkActions'

type AgentWithDetails = Agent & {
  profile?: {
    full_name: string | null
    email: string
  }
  clients: ClientWithLinks[]
}

type ClientWithLinks = Client & {
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
}

export default async function AdminDashboard(): Promise<React.JSX.Element> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: roleError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (roleError || !profile || (profile.role !== 'admin' && profile.role !== 'support')) {
    redirect('/unauthorized')
  }

  const [{ count: totalClients }, { count: totalAgents }, magicLinksResult, submissionsResult, agentsResult, clientsResult] =
    await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase
        .from('magic_links')
        .select('id, client_id, agent_id, token, status, created_at, expires_at, used_at'),
      supabase
        .from('form_submissions')
        .select('id, submitted_at, magic_links(client_id)')
        .order('submitted_at', { ascending: false }),
      supabase.from('agents').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
    ])

  const magicLinks = magicLinksResult.data ?? []
  const submissions = submissionsResult.data ?? []
  const agents = agentsResult.data ?? []
  const clients = clientsResult.data ?? []

  const latestSubmissionByClient = submissions.reduce<Record<string, { id: string; submitted_at: string | null }>>(
    (acc, submission) => {
      const clientId = submission.magic_links?.client_id ?? null
      if (!clientId) return acc

      const existing = acc[clientId]
      const currentSubmittedAt = submission.submitted_at ?? null
      const currentTimestamp = currentSubmittedAt ? new Date(currentSubmittedAt).getTime() : 0

      if (!existing) {
        acc[clientId] = { id: submission.id, submitted_at: currentSubmittedAt }
        return acc
      }

      const existingTimestamp = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0
      if (currentTimestamp >= existingTimestamp) {
        acc[clientId] = { id: submission.id, submitted_at: currentSubmittedAt }
      }

      return acc
    },
    {}
  )

  const activeLinks = magicLinks.filter(link => link.status === 'pending').length
  const completedForms = submissions.length

  const agentIds = agents.map(agent => agent.id)
  let profilesByAgent: Record<string, { full_name: string | null; email: string }> = {}

  if (agentIds.length > 0) {
    const { data: agentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', agentIds)

    profilesByAgent =
      agentProfiles?.reduce<Record<string, { full_name: string | null; email: string }>>((acc, current) => {
        acc[current.id] = {
          full_name: current.full_name,
          email: current.email,
        }
        return acc
      }, {}) ?? {}
  }

  const clientsByAgent = clients.reduce<Record<string, Client[]>>((acc, client) => {
    if (!acc[client.agent_id]) {
      acc[client.agent_id] = []
    }
    acc[client.agent_id]?.push(client)
    return acc
  }, {})

  const magicLinksByClient = magicLinks.reduce<Record<string, MagicLink[]>>((acc, link) => {
    if (!acc[link.client_id]) acc[link.client_id] = []
    acc[link.client_id].push(link)
    return acc
  }, {})

  const agentsWithDetails: AgentWithDetails[] = agents.map(agent => ({
    ...agent,
    profile: profilesByAgent[agent.id],
    clients: (clientsByAgent[agent.id] ?? []).map((client) => {
      const submissionMeta = latestSubmissionByClient[client.id]

      return {
        ...client,
        latest_submission_id: submissionMeta?.id ?? null,
        latest_submission_at: submissionMeta?.submitted_at ?? null,
        magic_links: magicLinksByClient[client.id] ?? [],
      }
    }),
  }))

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5">
      <header className="glass shadow-lg border-b border-[#00C3D9]/20">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1D3B4E]">Dashboard Administrateur</h1>
              <p className="text-sm text-[#1D3B4E]/60">Bienvenue {profile.full_name ?? 'Administrateur'}</p>
            </div>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-[#00C3D9] text-white">
              Accès {profile.role === 'admin' ? 'Administrateur' : 'Support'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Clients" value={totalClients ?? 0} icon="👥" />
          <StatsCard title="Total Agents" value={totalAgents ?? 0} icon="👤" />
          <StatsCard title="Liens actifs" value={activeLinks} icon="🔗" />
          <StatsCard title="Formulaires soumis" value={completedForms} icon="📝" />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-[#1D3B4E] mb-4">Agents & Clients associés</h2>

          <div className="space-y-6">
            {agentsWithDetails.length === 0 && (
              <div className="glass p-6 rounded-xl shadow text-center text-[#1D3B4E]/70">
                Aucun agent enregistré pour le moment.
              </div>
            )}

            {agentsWithDetails.map(agent => (
              <div key={agent.id} className="glass rounded-xl shadow-lg border border-[#00C3D9]/10">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1D3B4E]">
                        {agent.profile?.full_name ?? 'Agent sans profil'}
                      </h3>
                      <p className="text-sm text-[#1D3B4E]/70">{agent.profile?.email ?? 'Email non renseigné'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={agent.status} />
                      {agent.phone && <span className="text-sm text-[#1D3B4E]/70">📞 {agent.phone}</span>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#00C3D9]/10 divide-y divide-[#00C3D9]/10">
                    {agent.clients.length === 0 ? (
                      <div className="p-4 text-sm text-[#1D3B4E]/60">Aucun client associé pour le moment.</div>
                    ) : (
                      agent.clients.map(client => (
                        <div key={client.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium text-[#1D3B4E]">{client.full_name}</p>
                            <p className="text-sm text-[#1D3B4E]/70">{client.email}</p>
                            {client.company && <p className="text-sm text-[#1D3B4E]/60">Société : {client.company}</p>}
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <span className="text-xs text-[#1D3B4E]/50">
                              Inscrit le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                            </span>
                            <ClientStatusBadge status={client.status} />
                            <AdminMagicLinkActions client={client} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

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
            <dt className="text-sm font-medium text-[#1D3B4E]/70 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-[#1D3B4E]">{value}</dd>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Agent['status'] }) {
  const label: Record<Agent['status'], string> = {
    active: 'Actif',
    inactive: 'Inactif',
    suspended: 'Suspendu',
  }

  const colors: Record<Agent['status'], string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {label[status]}
    </span>
  )
}

function ClientStatusBadge({ status }: { status: Client['status'] }) {
  const label: Record<Client['status'], string> = {
    active: 'Actif',
    inactive: 'Inactif',
    archived: 'Archivé',
  }

  const colors: Record<Client['status'], string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-amber-100 text-amber-800',
    archived: 'bg-gray-200 text-gray-700',
  }

  return (
    <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {label[status]}
    </span>
  )
}
