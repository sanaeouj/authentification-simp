import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { AuthApiError, type PostgrestError } from '@supabase/supabase-js'
import type { Database, Client } from '@/lib/types/database.types'

interface RequestBody {
  full_name: string
  email: string
  phone?: string
  company?: string
}

/** Type guard simple pour string non vide */
const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

const isPostgrestError = (error: unknown): error is PostgrestError =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error &&
      typeof (error as { code: unknown }).code === 'string'
  )

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Création d'un client Supabase côté serveur en utilisant les cookies de la requête
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // pas utilisé dans cette route
            return
          },
          remove() {
            // pas utilisé dans cette route
            return
          },
        },
      }
    )

    // Vérifier l'authentification
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parser et valider le body
    const body = (await request.json()) as Partial<RequestBody>

    if (!isString(body.full_name)) {
      return NextResponse.json(
        { error: 'full_name is required' },
        { status: 400 }
      )
    }

    if (!body.email || !isString(body.email)) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const {
      data: existingAgent,
      error: agentFetchError,
    } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (agentFetchError) {
      return NextResponse.json(
        {
          error: 'Failed to retrieve agent profile',
          details: agentFetchError?.message ?? agentFetchError ?? null,
        },
        { status: 500 }
      )
    }

    let agent = existingAgent

    if (!agent) {
      const {
        data: createdAgent,
        error: createAgentError,
      } = await supabaseAdmin
        .from('agents')
        .insert({
          id: user.id,
          status: 'active',
          phone: null,
        })
        .select('id')
        .single()

      if (createAgentError || !createdAgent) {
        return NextResponse.json(
          {
            error: 'Failed to create agent profile',
            details:
              createAgentError && typeof createAgentError === 'object' && 'message' in createAgentError
                ? (createAgentError as { message: string }).message
                : createAgentError ?? null,
          },
          { status: 500 }
        )
      }

      agent = createdAgent
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent profile not found' },
        { status: 403 }
      )
    }

    const temporaryPassword = 'MotDePasse123'
    let userId: string | null = null
    let userEmailConfirmed = false

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        role: 'user',
      },
    })

    if (createUserError || !createdUser.user) {
      const isAlreadyRegistered =
        createUserError instanceof AuthApiError &&
        createUserError.status === 422 &&
        createUserError.message &&
        typeof createUserError.message === 'string' &&
        createUserError.message.toLowerCase().includes('already registered')

      if (!isAlreadyRegistered) {
        return NextResponse.json(
          {
            error: 'Failed to create user account',
            details: createUserError instanceof Error ? createUserError.message : createUserError,
          },
          { status: 500 }
        )
      }

      const {
        data: existingUsers,
        error: listError,
      } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })

      if (listError) {
        return NextResponse.json(
          { error: 'Failed to retrieve existing user', details: listError.message },
          { status: 500 }
        )
      }

      const existingUser = existingUsers.users.find(user => user.email === body.email)

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User already exists but could not be retrieved' },
          { status: 500 }
        )
      }

      userId = existingUser.id
      userEmailConfirmed = Boolean(existingUser.email_confirmed_at)

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: temporaryPassword,
        email_confirm: true,
      })

      if (updateError) {
        return NextResponse.json(
          {
            error: 'Failed to update existing user password',
            details: updateError instanceof Error ? updateError.message : updateError,
          },
          { status: 500 }
        )
      }

      userEmailConfirmed = true
    } else {
      userId = createdUser.user.id
      userEmailConfirmed = Boolean(createdUser.user.email_confirmed_at)
    }

    if (userId && !userEmailConfirmed) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })
    }

    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: body.email,
            full_name: body.full_name,
            role: 'user',
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        return NextResponse.json(
          {
            error: 'Failed to upsert client profile',
            details: profileError.message,
          },
          { status: 500 }
        )
      }
    }

    const newClient: Database['public']['Tables']['clients']['Insert'] = {
      id: randomUUID(),
      agent_id: agent.id,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone ?? null,
      company: body.company ?? null,
      status: 'active',
      notes: null,
    }

    // Insert typé dans Supabase
    const {
      data,
      error,
    }: { data: Client | null; error: PostgrestError | null } = await supabaseAdmin
      .from('clients')
      .insert(newClient)
      .select()
      .single()

    if (error || !data) {
      if (isPostgrestError(error) && error.code === '23505') {
        return NextResponse.json(
          {
            error: 'Client already exists',
            details: error.details ?? error.message,
          },
          { status: 409 }
        )
      }

      console.error('clients.insert error', error)
      return NextResponse.json(
        {
          error: 'Failed to create client',
          details: isPostgrestError(error) ? { code: error.code, message: error.message } : error ?? null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ client: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}