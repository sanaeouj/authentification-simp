import { randomBytes, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AuthApiError, createClient } from '@supabase/supabase-js'
import type { Database, MagicLink } from '@/lib/types/database.types'
import { Resend } from 'resend'

interface ClientPayload {
  id?: string
  full_name: string
  email: string
  phone?: string
  company?: string
}

interface RequestBody {
  client_id?: string
  client?: ClientPayload
  expires_in_days?: number
  voip_provider?: string
  voip_number?: string
  price_config?: string
  notes?: string
}

/** simple non-empty string guard */
const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const bodyRaw = (await request.json()) as Partial<RequestBody>

    const normalizedClient: ClientPayload | undefined = bodyRaw.client
      ? (() => {
          const fullName = sanitizeString(bodyRaw.client?.full_name)
          const email = sanitizeString(bodyRaw.client?.email)

          if (!fullName || !email) return undefined

          return {
            id: sanitizeString(bodyRaw.client?.id),
            full_name: fullName,
            email,
            phone: sanitizeString(bodyRaw.client?.phone),
            company: sanitizeString(bodyRaw.client?.company),
          }
        })()
      : undefined

    const body: RequestBody = {
      client_id: sanitizeString(bodyRaw.client_id),
      client: normalizedClient,
      expires_in_days:
        typeof bodyRaw.expires_in_days === 'number' && Number.isFinite(bodyRaw.expires_in_days)
          ? bodyRaw.expires_in_days
          : 7,
      voip_provider: sanitizeString(bodyRaw.voip_provider),
      voip_number: sanitizeString(bodyRaw.voip_number),
      price_config: sanitizeString(bodyRaw.price_config),
      notes: sanitizeString(bodyRaw.notes),
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
            // not used in this route
            return
          },
          remove() {
            // not used in this route
            return
          },
        },
      }
    )

    // Ensure requester is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Retrieve role
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil utilisateur introuvable' }, { status: 403 })
    }

    const isAdmin = profile.role === 'admin'
    const isAgent = profile.role === 'agent'
    if (!isAdmin && !isAgent) {
      return NextResponse.json({ error: 'Seuls les agents ou administrateurs peuvent créer un lien magique' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      )
    }

    // Create a separate Supabase client with service role key for admin operations
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

    const requestedClientId = body.client_id && body.client_id !== 'new' ? body.client_id : undefined
    let clientId = requestedClientId ?? body.client?.id

    let client =
      clientId && clientId !== 'new'
        ? await supabase.from('clients').select('*').eq('id', clientId).maybeSingle()
        : { data: null, error: null }

    if (client.error) {
      return NextResponse.json(
        { error: 'Failed to retrieve client', details: client.error.message },
        { status: 500 }
      )
    }

    if (!client.data) {
      return NextResponse.json(
        { error: 'Client introuvable. Seuls les clients existants peuvent recevoir un lien.' },
        { status: 404 }
      )
    }

    if (!client.data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const agentFormSnapshot = {
      generated_at: new Date().toISOString(),
      voip_provider: body.voip_provider ?? null,
      voip_number: body.voip_number ?? null,
      price_configuration: body.price_config ?? null,
      additional_notes: body.notes ?? null,
      expires_in_days: body.expires_in_days ?? 7,
    }

    let existingNotes: unknown = null
    if (client.data.notes) {
      try {
        existingNotes = JSON.parse(client.data.notes)
      } catch {
        existingNotes = { legacy: client.data.notes }
      }
    }

    const updatePayload: Database['public']['Tables']['clients']['Update'] = {}

    if (body.client && isAdmin) {
      updatePayload.full_name = body.client.full_name
      updatePayload.email = body.client.email
      updatePayload.phone = body.client.phone ?? null
      updatePayload.company = body.client.company ?? null
    }

    const notesPayload = {
      ...(existingNotes && typeof existingNotes === 'object' && !Array.isArray(existingNotes)
        ? existingNotes
        : {}),
      agentForm: agentFormSnapshot,
      rawNotes:
        (typeof body.notes === 'string' && body.notes.trim().length > 0
          ? body.notes
          : typeof existingNotes === 'object' && existingNotes && 'rawNotes' in existingNotes
            ? (existingNotes as Record<string, unknown>).rawNotes ?? null
            : null),
    }

    updatePayload.notes = JSON.stringify(notesPayload)

    const {
      data: updatedClient,
      error: updateClientError,
    } = await supabaseAdmin
      .from('clients')
      .update(updatePayload)
      .eq('id', client.data.id)
      .select('*')
      .single()

    if (updateClientError || !updatedClient) {
      return NextResponse.json(
        {
          error: 'Failed to update client record',
          details: updateClientError?.message ?? updateClientError ?? null,
        },
        { status: 500 }
      )
    }

    client = { data: updatedClient, error: null }

    clientId = client.data.id

    if (!client.data.agent_id) {
      return NextResponse.json(
        { error: 'Le client n’est associé à aucun agent. Veuillez assigner un agent avant de générer un lien.' },
        { status: 400 }
      )
    }

    // Ensure no existing link already exists for this client and agent
    const {
      data: existingLink,
      error: existingLinkError,
    } = await supabase
      .from('magic_links')
      .select('id, status, created_at')
      .eq('client_id', clientId)
      .eq('agent_id', client.data.agent_id)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (existingLinkError) {
      return NextResponse.json(
        { error: 'Failed to verify existing magic links', details: existingLinkError },
        { status: 500 }
      )
    }

    if (existingLink) {
      return NextResponse.json(
        { error: 'Ce client possède déjà un lien magique', existing_link: existingLink },
        { status: 409 }
      )
    }

    // Check if user account exists, if not create one
    const temporaryPassword = 'MotDePasse123'
    let userId: string | null = null
    let userEmailConfirmed = false

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: client.data.email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: client.data.full_name,
        role: 'user'
      }
    })

    if (createUserError || !createdUser.user) {
      const isAlreadyRegistered =
        createUserError instanceof AuthApiError &&
        createUserError.status === 422 &&
        typeof createUserError.message === 'string' &&
        createUserError.message.toLowerCase().includes('already')

      if (!isAlreadyRegistered) {
        console.error('createUserError (generate magic link)', createUserError)
        return NextResponse.json(
          {
            error: 'Failed to create user account',
            details:
              createUserError instanceof Error
                ? createUserError.message
                : (createUserError as { message?: string })?.message ?? createUserError ?? null,
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

      const existingUser = existingUsers.users.find(user => user.email === client.data.email)

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
            email: client.data.email,
            full_name: client.data.full_name,
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

    // Generate token and expiry
    const token: string = randomBytes(32).toString('base64url')
    const expiresAt: Date = new Date()
    expiresAt.setDate(expiresAt.getDate() + (body.expires_in_days ?? 7))

    const newMagicLink: Database['public']['Tables']['magic_links']['Insert'] = {
      id: randomUUID(),
      token,
      client_id: clientId,
      agent_id: client.data.agent_id,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      used_at: null,
      revoked_at: null,
      revoked_by: null,
      temporary_password: temporaryPassword,
    }

    const { data: inserted, error: insertError }: { data: MagicLink | null; error: unknown } =
      await supabase
        .from('magic_links')
        .insert(newMagicLink)
        .select()
        .single()

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: 'Failed to create magic link', details: insertError ?? null },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const urlObj = new URL('/auth/login', appUrl)
    urlObj.searchParams.set('email', client.data.email)
    urlObj.searchParams.set('password', temporaryPassword)
    const url = urlObj.toString()

    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const resend = new Resend(resendApiKey)
      const fromEmail =
        process.env.MAGIC_LINK_EMAIL_SENDER ?? 'SimplicomSimplypay <no-reply@simplicomsimplypay.com>'

      const expiryLabel =
        body.expires_in_days && Number.isFinite(body.expires_in_days)
          ? `Ce lien expirera dans ${body.expires_in_days} jour(s), le ${expiresAt.toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}.`
          : 'Ce lien expirera prochainement.'

      const serviceSummary = [
        body.voip_provider ? `<li><strong>Fournisseur VOIP :</strong> ${body.voip_provider}</li>` : '',
        body.voip_number ? `<li><strong>Numéro / Offre :</strong> ${body.voip_number}</li>` : '',
        body.price_config ? `<li><strong>Configuration / Détails :</strong> ${body.price_config}</li>` : '',
        body.notes ? `<li><strong>Remarques :</strong> ${body.notes}</li>` : '',
      ]
        .filter(Boolean)
        .join('')

      const emailHtml = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-family: Arial, sans-serif; background-color:#f5fbfd; padding:0; margin:0;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border:1px solid #e0f4f7;">
                <tr>
                  <td style="background: linear-gradient(135deg, #00C3D9 0%, #1D3B4E 100%); padding: 32px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 26px;">Bienvenue sur SimplicomSimplypay</h1>
                    <p style="margin: 8px 0 0; font-size: 15px; opacity: 0.9;">Accédez à votre espace sécurisé et remplissez votre formulaire.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 32px; color: #1D3B4E;">
                    <p style="margin-top: 0; font-size: 16px;">Bonjour ${client.data.full_name ?? ''},</p>
                    <p style="font-size: 15px; line-height: 1.65;">
                      Votre agent vient de générer un lien magique pour accéder à votre espace client. Cliquez sur le bouton ci-dessous pour vous connecter avec les identifiants fournis.
                    </p>
                    <p style="text-align: center; margin: 32px 0;">
                      <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #00C3D9; color: #ffffff; text-decoration: none; border-radius: 9999px; font-weight: 600;">
                        Accéder à mon espace client
                      </a>
                    </p>
                    <p style="font-size: 14px; line-height: 1.6;">
                      Si le bouton ne fonctionne pas, copiez le lien suivant dans votre navigateur :
                    </p>
                    <p style="word-break: break-all; font-size: 13px; background-color: #f5fbfd; border: 1px solid #e0f4f7; border-radius: 10px; padding: 12px 16px; color: #0b4c5f;">
                      ${url}
                    </p>
                    <h3 style="font-size: 16px; margin: 28px 0 12px;">Vos identifiants de connexion</h3>
                    <ul style="list-style: none; padding: 0; margin: 0 0 20px;">
                      <li style="font-size: 14px;"><strong>Email :</strong> ${client.data.email}</li>
                      <li style="font-size: 14px;"><strong>Mot de passe provisoire :</strong> ${temporaryPassword}</li>
                    </ul>
                    <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                      ${expiryLabel}
                    </p>
                    ${
                      serviceSummary
                        ? `<div style="margin: 24px 0;">
                            <h3 style="font-size: 16px; margin-bottom: 12px;">Informations transmises par votre agent</h3>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #1D3B4E;">
                              ${serviceSummary}
                            </ul>
                          </div>`
                        : ''
                    }
                    <p style="font-size: 13px; line-height: 1.6; color: #507988;">
                      Pour des raisons de sécurité, nous vous invitons à changer votre mot de passe après connexion.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9; border-top: 1px solid #e0f4f7; padding: 20px 32px; text-align: center; font-size: 12px; color: #7a99a6;">
                    SimplicomSimplypay • Plateforme d’authentification clients<br />
                    Besoin d’aide ? Contactez votre agent ou répondez directement à cet e-mail.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `

      const emailText = [
        `Bonjour ${client.data.full_name ?? ''},`,
        '',
        'Votre agent vient de générer un lien magique pour accéder à votre espace client.',
        `Lien : ${url}`,
        `Email : ${client.data.email}`,
        `Mot de passe provisoire : ${temporaryPassword}`,
        expiryLabel.replace(/<[^>]*>/g, ''),
        '',
        serviceSummary
          ? `Informations transmises :\n${serviceSummary.replace(/<li>|<\/li>/g, '').replace(/<[^>]*>/g, '')}`
          : '',
        '',
        'Nous vous recommandons de changer votre mot de passe après connexion.',
        '',
        "Bonne journée,\nL’équipe SimplicomSimplypay",
      ]
        .filter(Boolean)
        .join('\n')

      try {
        await resend.emails.send({
          from: fromEmail,
          to: client.data.email,
          subject: 'Votre accès à l’espace client',
          html: emailHtml,
          text: emailText,
        })
      } catch (emailError) {
        console.error('Failed to send magic link email', emailError)
      }
    } else {
      console.warn('RESEND_API_KEY not set; magic link email not sent.')
    }

    return NextResponse.json({ magic_link: inserted, url, client_id: clientId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}