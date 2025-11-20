import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface RequestBody {
  new_password?: string
}

export async function POST(
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

    const body = (await request.json()) as Partial<RequestBody>
    const newPassword = body.new_password || 'MotDePasse123' // Mot de passe par défaut

    // Vérifier que le mot de passe respecte les critères
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Configuration serveur manquante' },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)

    // Réinitialiser le mot de passe de l'utilisateur
    const { data, error } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword,
    })

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Erreur lors de la réinitialisation du mot de passe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      temporary_password: newPassword,
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

