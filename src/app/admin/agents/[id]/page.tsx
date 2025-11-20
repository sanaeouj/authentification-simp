import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Mail, Phone, Calendar, Users, Link2, FileCheck, TrendingUp } from 'lucide-react'
import type { Agent, Client, MagicLink } from '@/lib/types/database.types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AgentDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
  // Vérifier les permissions
  try {
    await requireRole(['admin', 'support'])
  } catch {
    redirect('/unauthorized')
  }

  const supabase = await createClient()
  const { id: agentId } = await params

  // Récupérer les informations de l'agent et du profil
  const [agentResult, profileResult] = await Promise.all([
    supabase.from('agents').select('*').eq('id', agentId).single(),
    supabase.from('profiles').select('*').eq('id', agentId).single(),
  ])

  const agent = agentResult.data
  const profile = profileResult.data

  if (!agent) {
    notFound()
  }

  // Récupérer les statistiques
  const [
    clientsResult,
    magicLinksResult,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('magic_links')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false }),
  ])

  const clients = (clientsResult.data || []) as Client[]
  const magicLinks = (magicLinksResult.data || []) as MagicLink[]

  // Récupérer les soumissions via les magic links
  const magicLinkIds = magicLinks.map(link => link.id)
  let submissions: any[] = []
  if (magicLinkIds.length > 0) {
    const submissionsResult = await supabase
      .from('form_submissions')
      .select('id, submitted_at, magic_link_id')
      .in('magic_link_id', magicLinkIds)
      .order('submitted_at', { ascending: false })
    
    submissions = submissionsResult.data || []
  }

  // Calculer les statistiques
  const totalClients = clients.length
  const activeLinks = magicLinks.filter(link => link.status === 'pending').length
  const completedForms = submissions.length
  const usedLinks = magicLinks.filter(link => link.status === 'used').length
  const revokedLinks = magicLinks.filter(link => link.status === 'revoked').length

  // Calculer les clients par statut
  const activeClients = clients.filter(c => c.status === 'active').length
  const inactiveClients = clients.filter(c => c.status === 'inactive').length
  const archivedClients = clients.filter(c => c.status === 'archived').length

  // Récupérer les dernières activités
  const recentSubmissions = submissions.slice(0, 5).map((sub: any) => {
    const magicLink = magicLinks.find(link => link.id === sub.magic_link_id)
    const clientId = magicLink?.client_id
    const client = clients.find(c => c.id === clientId)
    return {
      id: sub.id,
      submitted_at: sub.submitted_at,
      client_name: client?.full_name || 'Client inconnu',
      client_id: clientId,
    }
  })

  const getStatusBadge = (status: Agent['status']) => {
    const config: Record<Agent['status'], { color: 'green' | 'yellow' | 'gray', label: string }> = {
      active: {
        color: 'green',
        label: 'Actif'
      },
      inactive: {
        color: 'yellow',
        label: 'Inactif'
      },
      suspended: {
        color: 'gray',
        label: 'Suspendu'
      },
    }

    const { color, label } = config[status]
    return <Badge color={color} variant="status">{label}</Badge>
  }

  const displayName = agent.full_name || profile?.full_name || profile?.email || 'Agent sans nom'
  const displayEmail = profile?.email || 'Email non disponible'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Détails de l&apos;agent</h1>
                <p className="text-muted-foreground mt-1">
                  Informations complètes et statistiques
                </p>
              </div>
            </div>
            <Button asChild className="gap-2">
              <Link href={`/admin/agents/${agentId}/edit`}>
                <Edit className="h-4 w-4" />
                Modifier
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Informations principales */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-[#1D3B4E] mb-2">
                    {displayName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {displayEmail}
                    </span>
                    {agent.phone && (
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {agent.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Créé le {new Date(agent.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(agent.status)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistiques */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-[#1D3B4E]">{totalClients}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>Actifs: {activeClients}</span>
                <span>Inactifs: {inactiveClients}</span>
                <span>Archivés: {archivedClients}</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Liens Actifs</p>
                  <p className="text-3xl font-bold text-[#1D3B4E]">{activeLinks}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Link2 className="h-6 w-6 text-cyan-600" />
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>Utilisés: {usedLinks}</span>
                <span>Révoqués: {revokedLinks}</span>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Formulaires Complétés</p>
                  <p className="text-3xl font-bold text-[#1D3B4E]">{completedForms}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Taux de Réussite</p>
                  <p className="text-3xl font-bold text-[#1D3B4E]">
                    {totalClients > 0 ? Math.round((completedForms / totalClients) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Clients récents */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Clients ({totalClients})</h2>
            {totalClients > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/dashboard?agent=${agentId}`}>
                  Voir tous les clients
                </Link>
              </Button>
            )}
          </div>
          {clients.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Aucun client assigné à cet agent</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.slice(0, 6).map((client) => (
                <Card key={client.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-[#1D3B4E]">{client.full_name}</h3>
                    <Badge
                      color={
                        client.status === 'active' ? 'green' :
                        client.status === 'inactive' ? 'yellow' : 'gray'
                      }
                      variant="status"
                    >
                      {client.status === 'active' ? 'Actif' :
                       client.status === 'inactive' ? 'Inactif' : 'Archivé'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{client.email}</p>
                  {client.company && (
                    <p className="text-sm text-muted-foreground mb-3">{client.company}</p>
                  )}
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href={`/admin/clients/${client.id}`}>
                      Voir détails
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Activités récentes */}
        {recentSubmissions.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Activités récentes</h2>
            <Card className="p-6">
              <div className="space-y-4">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-[#1D3B4E]">{submission.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Formulaire soumis le{' '}
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Date inconnue'}
                      </p>
                    </div>
                    {submission.client_id && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/clients/${submission.client_id}`}>
                          Voir
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}

