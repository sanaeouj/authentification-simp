import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getUserRole } from '@/lib/utils/auth'
import type { Database } from '@/lib/types/database.types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId } = await params

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 })
    }

    // Vérifier les permissions
    const role = await getUserRole()
    if (!role || (role !== 'admin' && role !== 'support')) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, email, phone, company, status, agent_id, notes } = body

    if (!full_name || !email || !agent_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Les champs full_name, email, agent_id et status sont requis' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Configuration serveur incomplète' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Mettre à jour le client
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update({
        full_name,
        email,
        phone: phone || null,
        company: company || null,
        status,
        agent_id,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single()

    if (updateError || !updatedClient) {
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Erreur lors de la mise à jour du client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, client: updatedClient }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId } = await params

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 })
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            return
          },
          remove() {
            return
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: missing service role key or URL' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error: deleteLinksError } = await supabaseAdmin.from('magic_links').delete().eq('client_id', clientId)

    if (deleteLinksError) {
      return NextResponse.json(
        { success: false, error: deleteLinksError.message ?? 'Failed to delete related magic links' },
        { status: 500 }
      )
    }

    const {
      data: deletedClient,
      error: deleteClientError,
    } = await supabaseAdmin.from('clients').delete().eq('id', clientId).select().single()

    if (deleteClientError || !deletedClient) {
      return NextResponse.json(
        { success: false, error: deleteClientError?.message ?? 'Failed to delete client' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, client: deletedClient }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

