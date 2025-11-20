import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import type { Agent } from '@/lib/types/database.types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, error: 'Agent ID requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est admin
    try {
      await requireRole(['admin', 'support'])
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()

    // Archiver l'agent en changeant son statut en "suspended"
    const { data, error } = await supabase
      .from('agents')
      .update({ status: 'suspended' as Agent['status'] })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Erreur lors de l\'archivage' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error archiving agent:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

