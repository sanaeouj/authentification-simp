import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, FormSubmission, MagicLink, Client } from '@/lib/types/database.types'
import { requireRole } from '@/lib/utils/auth'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

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

    // Récupérer le magic link pour obtenir les informations du client
    const {
      data: oldLink,
      error: linkError,
    }: { data: (MagicLink & { clients: Client }) | null; error: unknown } = await supabase
      .from('magic_links')
      .select('*, clients:clients(*)')
      .eq('id', bodyRaw.magic_link_id)
      .single()

    if (linkError || !oldLink) {
      return NextResponse.json(
        { success: false, error: 'Lien magique introuvable.' },
        { status: 404 }
      )
    }

    const client = oldLink.clients as Client

    // 1. Supprimer la soumission
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

    // 2. Supprimer l'ancien magic link
    const { error: deleteLinkError } = await supabase
      .from('magic_links')
      .delete()
      .eq('id', bodyRaw.magic_link_id)

    if (deleteLinkError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Soumission supprimée, mais échec de la suppression du lien magique.',
        },
        { status: 500 }
      )
    }

    // 3. Créer un nouveau magic link
    const token = randomBytes(16).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 jours par défaut

    const temporaryPassword = randomBytes(8).toString('hex')

    const newMagicLink = {
      agent_id: oldLink.agent_id,
      client_id: client.id,
      token,
      status: 'pending' as const,
      expires_at: expiresAt.toISOString(),
      temporary_password: temporaryPassword,
    }

    const {
      data: insertedLink,
      error: insertError,
    }: { data: MagicLink | null; error: unknown } = await supabase
      .from('magic_links')
      .insert(newMagicLink)
      .select()
      .single()

    if (insertError || !insertedLink) {
      return NextResponse.json(
        { success: false, error: 'Échec de la création du nouveau lien magique.', details: insertError ?? null },
        { status: 500 }
      )
    }

    // 4. Envoyer l'email au client
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const fromEmail =
          process.env.MAGIC_LINK_EMAIL_SENDER ?? 'SimplicomSimplypay <no-reply@simplicomsimplypay.com>'

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const urlObj = new URL('/auth/login', appUrl)
        urlObj.searchParams.set('email', client.email)
        urlObj.searchParams.set('password', temporaryPassword)
        const url = urlObj.toString()

        await resend.emails.send({
          from: fromEmail,
          to: client.email,
          subject: 'Nouveau formulaire - SimplicomSimplypay',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1D3B4E;">Bonjour ${client.full_name || 'Client'},</h2>
              <p>Un nouveau formulaire vous a été envoyé. Veuillez le compléter en utilisant le lien ci-dessous.</p>
              <p>Ce lien expirera dans 7 jours, le ${expiresAt.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}.</p>
              <div style="margin: 30px 0;">
                <a href="${url}" style="background-color: #00C3D9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Accéder au formulaire
                </a>
              </div>
              <p style="color: #666; font-size: 12px;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                ${url}
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        // Ne pas échouer si l'email ne peut pas être envoyé, le lien est quand même créé
        console.error('Erreur lors de l\'envoi de l\'email:', emailError)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const urlObj = new URL('/auth/login', appUrl)
    urlObj.searchParams.set('email', client.email)
    urlObj.searchParams.set('password', temporaryPassword)
    const magicLinkUrl = urlObj.toString()

    return NextResponse.json(
      {
        success: true,
        submission: deletedSubmission,
        link: insertedLink,
        url: magicLinkUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur inconnue.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

