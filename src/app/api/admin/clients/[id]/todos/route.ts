import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'
import { getUserRole } from '@/lib/utils/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET - Récupérer tous les todos d'un client
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId } = await params

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 })
    }

    // Vérifier les permissions
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'support') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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

    const { data: todos, error } = await supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching todos:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch todos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, todos: todos ?? [] }, { status: 200 })
  } catch (error) {
    console.error('Unhandled error in GET /api/admin/clients/[id]/todos:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST - Créer un nouveau todo
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId } = await params
    const { title, description, priority, due_date } = await request.json()

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 })
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Le titre est requis' }, { status: 400 })
    }

    // Vérifier les permissions
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'support') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
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

    // Valider la priorité
    const validPriority = priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium'
    
    // Valider et formater la date d'échéance
    let dueDateValue: string | null = null
    if (due_date) {
      try {
        const date = new Date(due_date)
        if (!isNaN(date.getTime())) {
          dueDateValue = date.toISOString()
        }
      } catch {
        // Ignorer les dates invalides
      }
    }

    const { data: todo, error } = await supabase
      .from('client_todos')
      .insert({
        client_id: clientId,
        title: title.trim(),
        description: description?.trim() || null,
        completed: false,
        priority: validPriority,
        due_date: dueDateValue,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating todo:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create todo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, todo }, { status: 201 })
  } catch (error) {
    console.error('Unhandled error in POST /api/admin/clients/[id]/todos:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

