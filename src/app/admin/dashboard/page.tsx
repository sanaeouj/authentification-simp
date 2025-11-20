import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Agent, Client, MagicLink } from '@/lib/types/database.types'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { KPICard } from '@/components/admin/KPICard'
import { AgentsTable } from '@/components/admin/AgentsTable'
import { GlobalClientsTable } from '@/components/admin/GlobalClientsTable'

type AgentWithStats = Agent & {
  profile?: {
    full_name: string | null
    email: string
  }
  clientsCount: number
  activeLinks: number
  formsCompleted: number
}

type ClientWithMeta = Client & {
  agent_name?: string
  agent_email?: string
  agent_id?: string
  magic_links: MagicLink[]
  latest_submission_id?: string | null
  latest_submission_at?: string | null
  latest_submission_data?: any
  formsCompleted?: number
  lastActivity?: string
  todosCount?: number
  todosPendingCount?: number
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

  try {
    const [
      clientsCountResult,
      agentsCountResult,
      magicLinksResult,
      submissionsResult,
      agentsResult,
      clientsResult,
      todosResult,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase
        .from('magic_links')
        .select('id, client_id, agent_id, token, status, created_at, expires_at, used_at, revoked_at, revoked_by, temporary_password'),
      supabase
        .from('form_submissions')
        .select(`
          id,
          submitted_at,
          data,
          magic_links (
            id,
            client_id
          )
        `)
        .order('submitted_at', { ascending: false }),
      supabase.from('agents').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
      supabase.from('client_todos').select('id, client_id, completed'),
    ])

    // Vérifier les erreurs
    if (clientsCountResult.error) {
      console.error('Error fetching clients count:', clientsCountResult.error)
    }
    if (agentsCountResult.error) {
      console.error('Error fetching agents count:', agentsCountResult.error)
    }
    if (magicLinksResult.error) {
      console.error('Error fetching magic links:', magicLinksResult.error)
    }
    if (submissionsResult.error) {
      console.error('Error fetching submissions:', submissionsResult.error)
    }
    if (agentsResult.error) {
      console.error('Error fetching agents:', agentsResult.error)
    }
    if (clientsResult.error) {
      console.error('Error fetching clients:', clientsResult.error)
    }

    const totalClients = clientsCountResult.count ?? 0
    const totalAgents = agentsCountResult.count ?? 0
    const magicLinks = magicLinksResult.data ?? []
    const submissions = (submissionsResult.data ?? []) as Array<{
      id: string
      submitted_at: string | null
      data?: any
      magic_links: { id: string; client_id: string | null } | null
    }>
    const agents = agentsResult.data ?? []
    const clients = clientsResult.data ?? []
    const todos = todosResult.data ?? []

    // Compter les todos par client
    const todosByClient = todos.reduce<Record<string, { total: number; pending: number }>>((acc, todo) => {
      if (!acc[todo.client_id]) {
        acc[todo.client_id] = { total: 0, pending: 0 }
      }
      acc[todo.client_id].total++
      if (!todo.completed) {
        acc[todo.client_id].pending++
      }
      return acc
    }, {})

    const activeLinks = magicLinks.filter(link => link.status === 'pending').length
    const completedForms = submissions.length

    // Calculer les statistiques par agent
    const agentIds = agents.map(agent => agent.id)
    let profilesByAgent: Record<string, { full_name: string | null; email: string }> = {}

    if (agentIds.length > 0) {
      // Récupérer les profils depuis la table profiles (pas agents)
      const { data: agentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', agentIds)

      if (profilesError) {
        console.error('Error fetching agent profiles from profiles table:', profilesError)
      }

      if (!agentProfiles || agentProfiles.length === 0) {
        console.warn('Aucun profil trouvé dans la table profiles pour les agents:', agentIds)
      }

      profilesByAgent =
        agentProfiles?.reduce<Record<string, { full_name: string | null; email: string }>>((acc, current) => {
          // Le full_name vient de la table profiles, pas de agents
          acc[current.id] = {
            full_name: current.full_name ? current.full_name.trim() : null, // Nettoyer les espaces et gérer null
            email: current.email,
          }
          return acc
        }, {}) ?? {}
      
      // Debug: vérifier que les profils sont bien récupérés depuis la table profiles avec full_name
      if (agentProfiles && agentProfiles.length > 0) {
        console.log('Profils récupérés depuis la table profiles pour les agents:', agentProfiles.map(p => ({
          id: p.id,
          full_name: p.full_name, // full_name depuis profiles.full_name
          email: p.email
        })))
        console.log('Nombre de profils récupérés:', agentProfiles.length, 'sur', agentIds.length, 'agents')
      }
    }

    // Pour les agents sans profil, récupérer l'email depuis auth.users et créer le profil
    const agentsWithoutProfile = agents.filter(agent => !profilesByAgent[agent.id])
    if (agentsWithoutProfile.length > 0) {
      // Utiliser le service role pour accéder à auth.users
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
          serviceRoleKey
        )

        for (const agent of agentsWithoutProfile) {
          try {
            // Récupérer l'utilisateur depuis auth
            const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(agent.id)
            
            if (authError) {
              console.warn(`Failed to get auth user for agent ${agent.id}:`, authError.message)
              continue
            }
            
            if (authUser?.user?.email) {
              // Créer le profil manquant
              const { error: createError } = await adminClient
                .from('profiles')
                .upsert({
                  id: agent.id,
                  email: authUser.user.email,
                  full_name: null,
                  role: 'agent', // Par défaut
                }, {
                  onConflict: 'id',
                })

              if (!createError) {
                profilesByAgent[agent.id] = {
                  full_name: null,
                  email: authUser.user.email,
                }
              } else {
                console.warn(`Failed to create profile for agent ${agent.id}:`, createError.message)
              }
            } else {
              // Si pas d'email dans auth, créer quand même un profil avec l'ID
              const { error: createError } = await adminClient
                .from('profiles')
                .upsert({
                  id: agent.id,
                  email: `agent-${agent.id}@unknown.com`,
                  full_name: null,
                  role: 'agent',
                }, {
                  onConflict: 'id',
                })

              if (!createError) {
                profilesByAgent[agent.id] = {
                  full_name: null,
                  email: `agent-${agent.id}@unknown.com`,
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to create profile for agent ${agent.id}:`, err)
          }
        }
      }
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

    const submissionsByClient = submissions.reduce<Record<string, number>>((acc, submission) => {
      const clientId = submission.magic_links?.client_id ?? null
      if (clientId && typeof clientId === 'string') {
        acc[clientId] = (acc[clientId] ?? 0) + 1
      }
      return acc
    }, {})

    const activeLinksByAgent = magicLinks.reduce<Record<string, number>>((acc, link) => {
      if (link.status === 'pending' && link.agent_id) {
        acc[link.agent_id] = (acc[link.agent_id] ?? 0) + 1
      }
      return acc
    }, {})

    const formsByAgent = submissions.reduce<Record<string, number>>((acc, submission) => {
      const clientId = submission.magic_links?.client_id ?? null
      if (clientId && typeof clientId === 'string') {
        const client = clients.find(c => c.id === clientId)
        if (client?.agent_id && typeof client.agent_id === 'string') {
          acc[client.agent_id] = (acc[client.agent_id] ?? 0) + 1
        }
      }
      return acc
    }, {})

    // Préparer les agents avec leurs statistiques
    const agentsWithStats: AgentWithStats[] = agents.map(agent => {
      const profile = profilesByAgent[agent.id]
      // Debug: log si le profil est manquant
      if (!profile) {
        console.warn(`Agent ${agent.id} has no profile in profilesByAgent. Available profiles:`, Object.keys(profilesByAgent))
      } else {
        console.log(`Agent ${agent.id} profile:`, {
          full_name: profile.full_name,
          email: profile.email
        })
      }
      return {
        ...agent,
        profile: profile || undefined, // S'assurer que profile est undefined si null
        clientsCount: clientsByAgent[agent.id]?.length ?? 0,
        activeLinks: activeLinksByAgent[agent.id] ?? 0,
        formsCompleted: formsByAgent[agent.id] ?? 0,
      }
    })
    
    // Debug: vérifier les agents avec leurs profils
    console.log('Agents avec profils:', agentsWithStats.map(a => ({
      id: a.id,
      hasProfile: !!a.profile,
      full_name: a.profile?.full_name,
      email: a.profile?.email
    })))

    // Préparer les clients récents avec leurs métadonnées
    const latestSubmissionByClient = submissions.reduce<
      Record<string, { id: string; submitted_at: string | null; data: any }>
    >((acc, submission) => {
      const clientId = submission.magic_links?.client_id ?? null
      if (!clientId || typeof clientId !== 'string') return acc

      const existing = acc[clientId]
      const currentSubmittedAt = submission.submitted_at ?? null
      const currentTimestamp = currentSubmittedAt ? new Date(currentSubmittedAt).getTime() : 0

      if (!existing) {
        acc[clientId] = {
          id: submission.id,
          submitted_at: currentSubmittedAt,
          data: (submission as { data?: any }).data ?? null,
        }
        return acc
      }

      const existingTimestamp = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0
      if (currentTimestamp >= existingTimestamp) {
        acc[clientId] = {
          id: submission.id,
          submitted_at: currentSubmittedAt,
          data: (submission as { data?: any }).data ?? null,
        }
      }

      return acc
    }, {})

    // Récupérer tous les agent_ids uniques des clients
    const clientAgentIds = Array.from(new Set(clients.map(client => client.agent_id).filter(Boolean)))
    
    // Récupérer les profils des agents des clients directement depuis la table profiles
    let clientAgentProfiles: Record<string, { full_name: string | null; email: string }> = {}
    if (clientAgentIds.length > 0) {
      const { data: clientAgentProfilesData, error: clientAgentProfilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', clientAgentIds)

      if (clientAgentProfilesError) {
        console.error('Error fetching client agent profiles:', clientAgentProfilesError)
      }

      clientAgentProfiles =
        clientAgentProfilesData?.reduce<Record<string, { full_name: string | null; email: string }>>((acc, current) => {
          acc[current.id] = {
            full_name: current.full_name ? current.full_name.trim() : null, // Nettoyer les espaces et gérer null
            email: current.email,
          }
          return acc
        }, {}) ?? {}
      
      // Debug: vérifier que les profils sont bien récupérés
      if (clientAgentProfilesData && clientAgentProfilesData.length > 0) {
        console.log('Profils récupérés pour les agents des clients:', clientAgentProfilesData.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email
        })))
      }
    }

    // Créer le mapping des noms d'agents pour les clients
    const agentNamesByAgentId = clientAgentIds.reduce<Record<string, string>>((acc, agentId) => {
      const profile = clientAgentProfiles[agentId] || profilesByAgent[agentId]
      // Prioriser le full_name depuis la table profiles (qui peut être null selon le schéma)
      // Si full_name est null ou vide, utiliser l'email comme fallback
      if (profile?.full_name && profile.full_name.trim().length > 0) {
        acc[agentId] = profile.full_name.trim()
      } else if (profile?.email) {
        acc[agentId] = profile.email
      } else {
        // Si ni full_name ni email, utiliser un placeholder
        acc[agentId] = 'Agent sans nom'
      }
      return acc
    }, {})
    
    // Debug: vérifier le mapping créé
    console.log('Mapping agentNamesByAgentId:', agentNamesByAgentId)

    const agentEmailsByAgentId = agents.reduce<Record<string, string>>((acc, agent) => {
      const profile = profilesByAgent[agent.id]
      if (profile?.email) {
        acc[agent.id] = profile.email
      }
      return acc
    }, {})

    const recentClients: ClientWithMeta[] = clients
      .map(client => {
        const submissionMeta = latestSubmissionByClient[client.id]
        const formsCompleted = submissionsByClient[client.id] ?? 0

        let lastActivity = 'Aucune activité'
        if (submissionMeta?.submitted_at) {
          const submittedAt = new Date(submissionMeta.submitted_at)
          const now = new Date()
          const diffMs = now.getTime() - submittedAt.getTime()
          const diffHours = Math.floor(diffMs / 3600000)
          const diffDays = Math.floor(diffMs / 86400000)

          if (diffHours < 1) {
            lastActivity = `Il y a ${Math.floor(diffMs / 60000)} min`
          } else if (diffHours < 24) {
            lastActivity = `Il y a ${diffHours}h`
          } else if (diffDays === 1) {
            lastActivity = 'Il y a 1 jour'
          } else {
            lastActivity = `Il y a ${diffDays} jours`
          }
        }

        const clientTodos = todosByClient[client.id] || { total: 0, pending: 0 }
        return {
          ...client,
          agent_name: agentNamesByAgentId[client.agent_id] ?? 'Agent non assigné',
          agent_email: agentEmailsByAgentId[client.agent_id] ?? undefined,
          agent_id: client.agent_id,
          magic_links: magicLinksByClient[client.id] ?? [],
          latest_submission_id: submissionMeta?.id ?? null,
          latest_submission_at: submissionMeta?.submitted_at ?? null,
          latest_submission_data: submissionMeta?.data ?? null,
          formsCompleted,
          lastActivity,
          todosCount: clientTodos.total,
          todosPendingCount: clientTodos.pending,
        }
      })
      .sort((a, b) => {
        const dateA = a.latest_submission_at ? new Date(a.latest_submission_at).getTime() : 0
        const dateB = b.latest_submission_at ? new Date(b.latest_submission_at).getTime() : 0
        return dateB - dateA
      })

    return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">
                Dashboard Administrateur
              </h1>
              <p className="text-muted-foreground mt-1">
                Vue d&apos;ensemble et gestion globale de la plateforme
              </p>
            </div>
            <Button className="gap-2" asChild>
              <Link href="/admin/agents/new">
                <Plus className="h-4 w-4" />
                Nouvel agent
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Global KPI Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Statistiques globales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Agents"
              value={totalAgents ?? 0}
              icon="UserCog"
              color="blue"
            />
            <KPICard
              title="Total Clients"
              value={totalClients ?? 0}
              icon="Users"
              color="cyan"
            />
            <KPICard
              title="Liens Actifs"
              value={activeLinks}
              icon="Link2"
              color="green"
            />
            <KPICard
              title="Formulaires Complétés"
              value={completedForms}
              icon="FileCheck"
              color="orange"
            />
          </div>
        </section>

        {/* Agents Management */}
        <section>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Gestion des agents</h2>
            <AgentsTable agents={agentsWithStats} />
          </Card>
        </section>

        {/* Clients Table */}
        <section>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Clients</h2>
            <GlobalClientsTable
              clients={recentClients}
              agents={agentsWithStats.map(agent => ({
                id: agent.id,
                name: agent.profile?.full_name || agent.profile?.email || 'Agent sans nom',
              }))}
            />
          </Card>
        </section>
      </main>
    </div>
    )
  } catch (error) {
    console.error('Error in AdminDashboard:', error)
    // Logger l'erreur complète pour le débogage
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    // Rediriger vers une page d'erreur ou afficher un message d'erreur
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/10 via-white to-[#FF8A00]/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1D3B4E] mb-2">Erreur de chargement</h2>
          <p className="text-[#1D3B4E]/70 mb-6">
            Une erreur s'est produite lors du chargement du dashboard. Veuillez réessayer.
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-[#00C3D9] hover:bg-[#00A8BA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
          >
            Réessayer
          </Link>
          <p className="text-xs text-gray-500 mt-4">
            Consultez la console du serveur pour plus de détails.
          </p>
        </div>
      </div>
    )
  }
}
