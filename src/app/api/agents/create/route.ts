import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { UserRole, Agent } from '@/lib/types/database.types'
import { requireRole } from '@/lib/utils/auth'

interface RequestBody {
  email: string
  password: string
  role: UserRole
  phone?: string
}

/** Type guards */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isUserRole = (v: unknown): v is UserRole => v === 'agent' || v === 'support'

/**
 * POST /api/agents/create
 * Creates a Supabase Auth user (admin) and an agents row in the DB.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Ensure the caller is a support user
    try {
      await requireRole(['support'])
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<RequestBody>

    // Validate body
    if (
      !isString(body.email) ||
      !isString(body.password) ||
      !isUserRole(body.role)
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { email, password, role, phone } = body as RequestBody

    // Ensure service role key exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Create an admin Supabase client with service role key
    const admin: SupabaseClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Create the auth user (admin endpoint)
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      // optional: email_confirm: true
    })

    if (createError || !createData?.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user', details: createError?.message ?? null },
        { status: 500 }
      )
    }

    const createdUser: User = createData.user

    // Insert agent row
    const agentRow: Omit<Agent, 'created_at' | 'updated_at'> = {
      id: createdUser.id, // Use user id as agent id
      status: 'active',
      phone: phone ?? null,
    }

    const { data: insertData, error: insertError } = await admin
      .from('agents')
      .insert(agentRow)
      .select()
      .single()

    if (insertError || !insertData) {
      // Rollback: delete the created auth user
      try {
        await admin.auth.admin.deleteUser(createdUser.id)
      } catch {
        // ignore rollback errors but report original failure
      }
      return NextResponse.json(
        { error: 'Failed to create agent record', details: insertError?.message ?? null },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        user: {
          id: createdUser.id,
          email: createdUser.email,
        },
        agent: insertData,
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}