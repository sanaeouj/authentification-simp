import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ClientForm from '@/components/forms/client-form'
import type { Database, MagicLink, Client, Agent } from '@/lib/types/database.types'

type FullMagicLink = MagicLink & { clients: Client & { agents: Agent } }

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function ConfigurationFormPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Vérifier l'authentification de l'utilisateur (compte utilisateur réel)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/magic-link/${token}`)
  }

  // Vérifier le lien magique avec toutes les relations nécessaires
  const cookieStore = await cookies()
  const supabaseWithCookies = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          /* not used */
        },
        remove() {
          /* not used */
        },
      },
    }
  )

  const { data: magicLink, error } = await supabaseWithCookies
    .from('magic_links')
    .select(`
      *,
      clients:clients(
        *,
        agents:agents(*)
      )
    `)
    .eq('token', token)
    .single()

  if (error || !magicLink) {
    redirect(`/magic-link/${token}`)
  }

  // Vérifier le statut
  if (magicLink.status !== 'pending' && magicLink.status !== 'issued') {
    redirect(`/magic-link/${token}`)
  }

  const fullLink = magicLink as FullMagicLink
  const isDisabled = fullLink.status !== 'pending'

  const daysRemaining: number = (() => {
    if (!fullLink.expires_at) return 0
    const expires = new Date(fullLink.expires_at)
    if (isNaN(expires.getTime())) return 0
    const diffMs = expires.getTime() - Date.now()
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  })()

  const formatExpirationDate = (dateString: string | null): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/10 via-white to-[#FF8A00]/10 py-8 px-6 sm:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* En-tête "Espace Client" */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#00C3D9] mb-4">Espace Client</h1>
          <p className="text-lg text-[#1D3B4E] mb-6">
            Bonjour {fullLink.clients.full_name}, complétez le formulaire ci-dessous.
          </p>

          {/* Informations de configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="space-y-2 text-sm text-[#1D3B4E]">
              <p className="font-semibold">Configuration pour {fullLink.clients.full_name}</p>
              {fullLink.clients.company ? (
                <p>
                  Entreprise associée: <span className="font-medium">{fullLink.clients.company}</span>
                </p>
              ) : null}
              {fullLink.clients.agents?.phone ? (
                <p>
                  Contact agent: <span className="font-medium">{fullLink.clients.agents.phone}</span>
                </p>
              ) : (
                <p className="text-gray-600">Contact agent à confirmer.</p>
              )}
            </div>
          </div>

          {/* Validité du lien */}
          {fullLink.expires_at && (
            <div className="flex items-center gap-2 text-sm text-orange-600 mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Lien valide encore {daysRemaining} jour(s) (expiration le {formatExpirationDate(fullLink.expires_at)}).
              </span>
            </div>
          )}

          {isDisabled && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
              Ce formulaire a déjà été soumis. Les informations sont affichées en lecture seule.
            </p>
            </div>
          )}
        </header>

        <section className="glass rounded-2xl shadow-xl p-8 sm:p-10">
          <ClientForm link={fullLink} disabled={isDisabled} />
        </section>
      </div>
    </div>
  )
}
