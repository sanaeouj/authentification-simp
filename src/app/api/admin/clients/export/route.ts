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

    // Récupérer tous les clients avec leurs agents
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientsError || !clients) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des clients' },
        { status: 500 }
      )
    }

    // Récupérer les agents
    const agentIds = Array.from(new Set(clients.map(c => c.agent_id).filter(Boolean)))
    const { data: agents } = await supabase
      .from('agents')
      .select('id, full_name')
      .in('id', agentIds)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', agentIds)

    const agentsMap = new Map(
      agents?.map(a => [a.id, { name: a.full_name || 'Agent sans nom', email: '' }]) || []
    )

    profiles?.forEach(p => {
      const existing = agentsMap.get(p.id)
      if (existing) {
        existing.email = p.email
        if (!existing.name || existing.name === 'Agent sans nom') {
          existing.name = p.full_name || p.email || 'Agent sans nom'
        }
      } else {
        agentsMap.set(p.id, {
          name: p.full_name || p.email || 'Agent sans nom',
          email: p.email,
        })
      }
    })

    // Récupérer les statistiques
    const { data: magicLinks } = await supabase
      .from('magic_links')
      .select('id, client_id, status')
    
    const magicLinkIds = magicLinks?.map(l => l.id) || []
    let submissions: any[] = []
    if (magicLinkIds.length > 0) {
      const submissionsResult = await supabase
        .from('form_submissions')
        .select('magic_link_id')
        .in('magic_link_id', magicLinkIds)
      
      submissions = submissionsResult.data || []
    }

    const magicLinksByClient = new Map<string, number>()
    const activeLinksByClient = new Map<string, number>()
    const formsByClient = new Map<string, number>()

    magicLinks?.forEach(link => {
      if (link.client_id) {
        magicLinksByClient.set(link.client_id, (magicLinksByClient.get(link.client_id) || 0) + 1)
        if (link.status === 'pending') {
          activeLinksByClient.set(link.client_id, (activeLinksByClient.get(link.client_id) || 0) + 1)
        }
      }
    })

    submissions.forEach(sub => {
      if (sub.magic_link_id) {
        const link = magicLinks?.find(l => l.id === sub.magic_link_id)
        if (link?.client_id) {
          formsByClient.set(link.client_id, (formsByClient.get(link.client_id) || 0) + 1)
        }
      }
    })

    // Générer le CSV
    const headers = [
      'Nom',
      'Email',
      'Téléphone',
      'Entreprise',
      'Agent',
      'Email Agent',
      'Statut',
      'Liens magiques',
      'Liens actifs',
      'Formulaires complétés',
      'Date de création',
    ]

    const rows = clients.map(client => {
      const agent = agentsMap.get(client.agent_id)
      return [
        client.full_name || '',
        client.email || '',
        client.phone || '',
        client.company || '',
        agent?.name || 'Agent non assigné',
        agent?.email || '',
        client.status,
        (magicLinksByClient.get(client.id) || 0).toString(),
        (activeLinksByClient.get(client.id) || 0).toString(),
        (formsByClient.get(client.id) || 0).toString(),
        new Date(client.created_at).toLocaleDateString('fr-FR'),
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // Ajouter le BOM pour Excel
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting clients:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

