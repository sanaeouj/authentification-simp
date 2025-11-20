import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'
import { getUserRole } from '@/lib/utils/auth'

interface RouteParams {
  params: Promise<{
    id: string
    todoId: string
  }>
}

// PUT - Mettre à jour un todo
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId, todoId } = await params
    const { title, description, completed, priority, due_date } = await request.json()

    if (!clientId || !todoId) {
      return NextResponse.json({ success: false, error: 'Client ID et Todo ID requis' }, { status: 400 })
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

    const updateData: {
      title?: string
      description?: string | null
      completed?: boolean
      priority?: 'low' | 'medium' | 'high' | null
      due_date?: string | null
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Le titre ne peut pas être vide' }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (completed !== undefined) {
      updateData.completed = Boolean(completed)
    }

    if (priority !== undefined) {
      if (priority === null || ['low', 'medium', 'high'].includes(priority)) {
        updateData.priority = priority
      }
    }

    if (due_date !== undefined) {
      if (due_date === null) {
        updateData.due_date = null
      } else {
        try {
          const date = new Date(due_date)
          if (!isNaN(date.getTime())) {
            updateData.due_date = date.toISOString()
          }
        } catch {
          // Ignorer les dates invalides
        }
      }
    }

    const { data: todo, error } = await supabase
      .from('client_todos')
      .update(updateData)
      .eq('id', todoId)
      .eq('client_id', clientId)
      .select()
      .single()

    if (error) {
      console.error('Error updating todo:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update todo' },
        { status: 500 }
      )
    }

    if (!todo) {
      return NextResponse.json({ success: false, error: 'Todo non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ success: true, todo }, { status: 200 })
  } catch (error) {
    console.error('Unhandled error in PUT /api/admin/clients/[id]/todos/[todoId]:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE - Supprimer un todo
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: clientId, todoId } = await params

    if (!clientId || !todoId) {
      return NextResponse.json({ success: false, error: 'Client ID et Todo ID requis' }, { status: 400 })
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

    const { error } = await supabase
      .from('client_todos')
      .delete()
      .eq('id', todoId)
      .eq('client_id', clientId)

    if (error) {
      console.error('Error deleting todo:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete todo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unhandled error in DELETE /api/admin/clients/[id]/todos/[todoId]:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

