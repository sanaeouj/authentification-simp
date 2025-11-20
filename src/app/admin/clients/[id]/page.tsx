import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail, Phone, Calendar, Building2, FileCheck, Link2, User } from 'lucide-react'
import ClientDetailClient from '@/components/ClientDetailClient'
import type { Client, MagicLink } from '@/lib/types/database.types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: PageProps): Promise<React.JSX.Element> {
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

  // Récupérer les liens magiques
  const { data: magicLinks } = await supabase
    .from('magic_links')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Récupérer la dernière soumission avec données
  const magicLinkIds = magicLinks?.map(link => link.id) || []
  let latestSubmission = null
  if (magicLinkIds.length > 0) {
    const { data } = await supabase
      .from('form_submissions')
      .select('id, submitted_at, data')
      .in('magic_link_id', magicLinkIds)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    latestSubmission = data
  }

  // Récupérer les informations de l'agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, full_name')
    .eq('id', client.agent_id)
    .single()

  const { data: agentProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', client.agent_id)
    .single()

  const agentName = agent?.full_name || agentProfile?.full_name || agentProfile?.email || 'Agent non assigné'
  const agentEmail = agentProfile?.email || ''

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
                <h1 className="text-2xl font-bold gradient-text">Détails du client</h1>
                <p className="text-muted-foreground mt-1">
                  Informations complètes et historique
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ClientDetailClient
          client={client as Client & { 
            magic_links?: MagicLink[]
            latest_submission_id?: string | null
            latest_submission_at?: string | null
            latest_submission_data?: any
          }}
          magicLinks={(magicLinks || []) as MagicLink[]}
          latestSubmission={latestSubmission ? {
            id: latestSubmission.id,
            submitted_at: latestSubmission.submitted_at,
            data: latestSubmission.data
          } : null}
        />
      </main>
    </div>
  )
}

