import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, FormSubmission, MagicLink } from '@/lib/types/database.types'
import { requireRole } from '@/lib/utils/auth'

interface RequestBody {
  submission_id: string
  magic_link_id: string
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    try {
      await requireRole(['admin'])
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const bodyRaw = (await request.json()) as Partial<RequestBody>
    if (!isNonEmptyString(bodyRaw.submission_id) || !isNonEmptyString(bodyRaw.magic_link_id)) {
      return NextResponse.json({ success: false, error: 'Identifiants requis.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Configuration serveur incomplète pour Supabase.' },
        { status: 500 }
      )
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: deletedSubmission,
      error: deleteSubmissionError,
    }: { data: FormSubmission | null; error: unknown } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', bodyRaw.submission_id)
      .select()
      .single()

    if (deleteSubmissionError) {
      const message =
        deleteSubmissionError instanceof Error
          ? deleteSubmissionError.message
          : 'Impossible de supprimer la soumission.'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    if (!deletedSubmission) {
      return NextResponse.json({ success: false, error: 'Soumission introuvable.' }, { status: 404 })
    }

    const {
      data: updatedLink,
      error: updateLinkError,
    }: { data: MagicLink | null; error: unknown } = await supabase
      .from('magic_links')
      .update({
        status: 'pending',
        used_at: null,
      })
      .eq('id', bodyRaw.magic_link_id)
      .select()
      .single()

    if (updateLinkError) {
      const message =
        updateLinkError instanceof Error
          ? updateLinkError.message
          : 'Soumission supprimée, mais échec de la réinitialisation du lien.'
      return NextResponse.json(
        { success: false, error: message, submission: deletedSubmission },
        { status: 500 }
      )
    }

    if (!updatedLink) {
      return NextResponse.json(
        {
          success: false,
          error: 'Soumission supprimée, mais le lien magique est introuvable.',
          submission: deletedSubmission,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        submission: deletedSubmission,
        link: updatedLink,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur inconnue.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}


