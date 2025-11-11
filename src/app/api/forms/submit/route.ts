import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import type { Database, MagicLink, Client, FormSubmission } from '@/lib/types/database.types'

interface RequestBody {
  token: string
  form_data: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/** Type guards */
const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

const isRecord = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const bodyRaw = (await request.json()) as Partial<RequestBody>

    if (!isString(bodyRaw.token) || !isRecord(bodyRaw.form_data)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }

    const body: RequestBody = {
      token: bodyRaw.token,
      form_data: bodyRaw.form_data,
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: missing service role key' },
        { status: 500 }
      )
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
            // not used in this public route
            return
          },
          remove() {
            // not used in this public route
            return
          },
        },
      }
    )

    const supabaseAdmin = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Find magic link and include client
    const {
      data: link,
      error: fetchError,
    }: {
      data: (MagicLink & { clients: Client }) | null
      error: unknown
    } = await supabase
      .from('magic_links')
      .select('*, clients:clients(*)')
      .eq('token', body.token)
      .single()

    if (fetchError || !link) {
      return NextResponse.json({ success: false, error: 'Magic link not found' }, { status: 404 })
    }

    // Validate status and expiry
    if (link.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Magic link not valid' }, { status: 400 })
    }

    if (!link.expires_at) {
      return NextResponse.json({ success: false, error: 'Magic link has no expiry date' }, { status: 400 })
    }

    const expiresAt = new Date(link.expires_at)
    const now = new Date()
    if (isNaN(expiresAt.getTime()) || expiresAt < now) {
      return NextResponse.json({ success: false, error: 'Magic link expired' }, { status: 410 })
    }

    // Insert form submission
    const submission: Omit<FormSubmission, 'submitted_at'> & { submitted_at: string } = {
      id: crypto.randomUUID(),
      magic_link_id: link.id,
      data: body.form_data,
      status: 'pending',
      ip_address: body.ip_address ?? null,
      user_agent: body.user_agent ?? null,
      submitted_at: new Date().toISOString(),
      processed_at: null,
    }

    const {
      data: insertedSubmission,
      error: insertError,
    }: { data: FormSubmission | null; error: unknown } = await supabaseAdmin
      .from('form_submissions')
      .insert(submission)
      .select()
      .single()

    if (insertError || !insertedSubmission) {
      return NextResponse.json({ success: false, error: 'Failed to save submission', details: insertError ?? null }, { status: 500 })
    }

    // Mark magic link as used
    const usedAtIso = new Date().toISOString()
    const {
      data: updatedLink,
      error: updateError,
    }: { data: MagicLink | null; error: unknown } = await supabaseAdmin
      .from('magic_links')
      .update({
        status: 'used',
        used_at: usedAtIso,
      })
      .eq('id', link.id)
      .select()
      .single()

    if (updateError) {
      // log or ignore update error but still return success for submission
      return NextResponse.json(
        { success: true, submission: insertedSubmission, warning: 'Submission saved but failed to update link', details: updateError ?? null },
        { status: 201 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)

        const [adminProfilesResult, agentProfileResult] = await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('email, full_name, role')
            .in('role', ['admin', 'support']),
          supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', link.agent_id)
            .single(),
        ])

        const recipients = new Set<string>()
        adminProfilesResult.data
          ?.filter(profile => typeof profile?.email === 'string' && profile.email.trim().length > 0)
          .forEach(profile => {
            recipients.add(profile.email.trim())
          })

        if (body.form_data.notify_admin === 'yes') {
          const adminEmailFromForm =
            typeof body.form_data.admin_notification_email === 'string'
              ? body.form_data.admin_notification_email.trim()
              : ''
          if (adminEmailFromForm) {
            recipients.add(adminEmailFromForm)
          }
        }

        if (recipients.size > 0) {
          const agentProfile = agentProfileResult.data
          const submissionDate = new Date(insertedSubmission.submitted_at).toLocaleString('fr-FR', {
            timeZone: 'Europe/Paris',
          })

          const formDataJson = JSON.stringify(body.form_data, null, 2)

          const html = `
            <p>Bonjour,</p>
            <p>Un nouveau formulaire a été soumis par <strong>${link.clients.full_name}</strong> (${link.clients.email}).</p>
            <p>
              <strong>Agent référent :</strong> ${agentProfile?.full_name ?? 'Non renseigné'} (${agentProfile?.email ?? 'n/a'})<br/>
              <strong>Date de soumission :</strong> ${submissionDate}
            </p>
            <p><strong>Détails du formulaire :</strong></p>
            <pre style="background-color:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-family:Consolas,Menlo,Monaco,'Courier New',monospace;">${formDataJson}</pre>
            <p style="margin-top:24px;">— Plateforme SimplicomSimplypay</p>
          `

          const text = [
            'Bonjour,',
            '',
            `Un nouveau formulaire a été soumis par ${link.clients.full_name} (${link.clients.email}).`,
            `Agent référent : ${agentProfile?.full_name ?? 'Non renseigné'} (${agentProfile?.email ?? 'n/a'})`,
            `Date de soumission : ${submissionDate}`,
            '',
            'Détails du formulaire :',
            formDataJson,
            '',
            '— Plateforme SimplicomSimplypay',
          ].join('\n')

          const fromEmail =
            process.env.FORM_SUBMISSION_EMAIL_SENDER ??
            process.env.MAGIC_LINK_EMAIL_SENDER ??
            'SimplicomSimplypay <no-reply@simplicomsimplypay.com>'

          await resend.emails.send({
            from: fromEmail,
            to: Array.from(recipients),
            subject: `Nouvelle soumission de formulaire - ${link.clients.full_name}`,
            html,
            text,
          })
        }
      } catch (notificationError) {
        console.error('Failed to send form submission notification', notificationError)
      }
    } else {
      console.warn('RESEND_API_KEY not set; form submission notification email not sent.')
    }

    return NextResponse.json({ success: true, submission: insertedSubmission, link: updatedLink }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}