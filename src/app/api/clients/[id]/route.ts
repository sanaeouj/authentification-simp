import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          /* not needed */
        },
        remove() {
          /* not needed */
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
  }

  const { id: clientId } = await context.params

  if (!clientId || clientId === 'new') {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  let clientQuery = supabase.from('clients').select('*').eq('id', clientId).maybeSingle()

  if (profile.role !== 'admin') {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 403 })
    }

    clientQuery = supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('agent_id', agent.id)
      .maybeSingle()
  }

  const { data: client, error: clientError } = await clientQuery

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({ client })
}

