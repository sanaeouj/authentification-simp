import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier que l'utilisateur est admin
    try {
      await requireRole(['admin', 'support'])
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()

    // Récupérer tous les agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (agentsError || !agents) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des agents' },
        { status: 500 }
      )
    }

    // Récupérer les profils
    const agentIds = agents.map(agent => agent.id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', agentIds)

    const profilesMap = new Map(
      profiles?.map(p => [p.id, { email: p.email, full_name: p.full_name }]) || []
    )

    // Récupérer les statistiques
    const { data: clients } = await supabase.from('clients').select('agent_id')
    const { data: magicLinks } = await supabase
      .from('magic_links')
      .select('agent_id, status')
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('magic_links(client_id)')

    // Calculer les statistiques
    const clientsByAgent = new Map<string, number>()
    const activeLinksByAgent = new Map<string, number>()
    const formsByAgent = new Map<string, number>()

    clients?.forEach(client => {
      if (client.agent_id) {
        clientsByAgent.set(client.agent_id, (clientsByAgent.get(client.agent_id) || 0) + 1)
      }
    })

    magicLinks?.forEach(link => {
      if (link.agent_id) {
        if (link.status === 'pending') {
          activeLinksByAgent.set(link.agent_id, (activeLinksByAgent.get(link.agent_id) || 0) + 1)
        }
      }
    })

    // Pour les formulaires, on doit trouver l'agent via le client
    const { data: allClients } = await supabase.from('clients').select('id, agent_id')
    const clientToAgent = new Map(allClients?.map(c => [c.id, c.agent_id]) || [])

    submissions?.forEach(submission => {
      const clientId = (submission.magic_links as any)?.client_id
      if (clientId) {
        const agentId = clientToAgent.get(clientId)
        if (agentId) {
          formsByAgent.set(agentId, (formsByAgent.get(agentId) || 0) + 1)
        }
      }
    })

    // Générer le CSV
    const headers = [
      'Nom',
      'Email',
      'Statut',
      'Téléphone',
      'Nombre de clients',
      'Liens actifs',
      'Formulaires complétés',
      'Date de création',
    ]

    const rows = agents.map(agent => {
      const profile = profilesMap.get(agent.id)
      return [
        profile?.full_name || agent.full_name || '',
        profile?.email || '',
        agent.status,
        agent.phone || '',
        (clientsByAgent.get(agent.id) || 0).toString(),
        (activeLinksByAgent.get(agent.id) || 0).toString(),
        (formsByAgent.get(agent.id) || 0).toString(),
        new Date(agent.created_at).toLocaleDateString('fr-FR'),
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    // Ajouter le BOM pour Excel
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="agents-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting agents:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

