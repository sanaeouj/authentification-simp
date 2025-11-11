import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import ClientForm from '@/components/forms/client-form'
import type { Database, MagicLink, Client, Agent } from '@/lib/types/database.types'

type FullMagicLink = MagicLink & { clients: Client & { agents: Agent } }

export default async function ClientDashboardPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          /* non utilisé côté client */
        },
        remove() {
          /* non utilisé côté client */
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('profiles query error', profileError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Erreur</h1>
          <p className="mt-2 text-sm text-gray-600">
            Impossible de récupérer votre profil. Merci de réessayer plus tard.
          </p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'user') {
    redirect('/unauthorized')
  }

  const normalizedEmail = (user.email ?? '').trim().toLowerCase()

  const {
    data: client,
    error: clientError,
  } = await supabase
    .from('clients')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (clientError) {
    console.error('clients query error', clientError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Erreur</h1>
          <p className="mt-2 text-sm text-gray-600">
            Une erreur est survenue lors du chargement de vos informations client.
          </p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Aucun profil client</h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre compte est actif mais aucune fiche client n&apos;est associée à votre adresse email.
            Merci de contacter votre agent.
          </p>
        </div>
      </div>
    )
  }

  const {
    data: link,
    error: linkError,
  } = await supabase
    .from('magic_links')
    .select('*, clients:clients(*, agents:agents(*))')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Erreur</h1>
          <p className="mt-2 text-sm text-gray-600">
            Impossible de récupérer votre formulaire pour le moment.
          </p>
        </div>
      </div>
    )
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Aucun formulaire disponible</h1>
          <p className="mt-2 text-sm text-gray-600">
            Aucun lien de configuration n&apos;a été généré pour le moment. Contactez votre agent pour en obtenir un.
          </p>
        </div>
      </div>
    )
  }

  const fullLink = link as FullMagicLink

  redirect(`/client/dashboard/${fullLink.token}`)
}

