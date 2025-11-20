import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Agent, UserRole } from '@/lib/types/database.types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface RequestBody {
  full_name?: string
  email?: string
  phone?: string
  status?: Agent['status']
  role?: UserRole
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Vérifier les permissions
    try {
      await requireRole(['admin', 'support'])
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: agentId } = await params

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID requis' }, { status: 400 })
    }

    const body = (await request.json()) as Partial<RequestBody>

    const supabase = await createClient()

    // Vérifier que l'agent existe
    const { data: existingAgent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !existingAgent) {
      return NextResponse.json(
        { error: 'Agent non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour l'agent
    const agentUpdate: Partial<Agent> = {}
    if (body.status !== undefined) {
      agentUpdate.status = body.status
    }
    if (body.phone !== undefined) {
      agentUpdate.phone = body.phone || null
    }
    if (body.full_name !== undefined) {
      agentUpdate.full_name = body.full_name || null
    }

    const { data: updatedAgent, error: updateAgentError } = await supabase
      .from('agents')
      .update(agentUpdate)
      .eq('id', agentId)
      .select()
      .single()

    if (updateAgentError) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de l\'agent', details: updateAgentError.message },
        { status: 500 }
      )
    }

    // Mettre à jour le profil
    const profileUpdate: {
      email?: string
      full_name?: string | null
      role?: UserRole
    } = {}

    if (body.email !== undefined) {
      profileUpdate.email = body.email
    }
    if (body.full_name !== undefined) {
      profileUpdate.full_name = body.full_name || null
    }
    if (body.role !== undefined) {
      profileUpdate.role = body.role
    }

    // Si on doit mettre à jour l'email dans auth, utiliser le service role
    if (body.email && body.email !== existingAgent.id) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
        
        // Mettre à jour l'email dans auth.users
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(agentId, {
          email: body.email,
        })

        if (authUpdateError) {
          console.warn('Failed to update auth email:', authUpdateError.message)
        }
      }
    }

    // Mettre à jour le profil
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', agentId)

      if (profileUpdateError) {
        console.warn('Failed to update profile:', profileUpdateError.message)
        // Ne pas échouer la requête si le profil ne peut pas être mis à jour
      }
    }

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    })
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
