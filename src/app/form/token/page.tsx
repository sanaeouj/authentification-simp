import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  Database,
  MagicLink,
  Client,
  Agent,
} from '@/lib/types/database.types'
import ClientForm from '@/components/forms/client-form'

interface PageProps {
  params: {
    token: string
  }
}

/**
 * Page server-side pour afficher le formulaire lié à un magic link.
 * Renvoie des pages d'erreur typées pour chaque cas, ou le composant ClientForm.
 */
export default async function MagicLinkFormPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const token: string = params?.token ?? ''

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Lien invalide</h1>
          <p className="mt-2 text-sm text-gray-600">Aucun token fourni.</p>
        </div>
      </div>
    )
  }

  // cookies() peut être async selon l'API -> await pour éviter l'erreur TS "get does not exist on Promise..."
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
          /* not used in this server page */
        },
        remove() {
          /* not used in this server page */
        },
      },
    }
  )

  const {
    data: link,
    error,
  }: {
    data: (MagicLink & { clients: Client & { agents: Agent } }) | null
    error: unknown
  } = await supabase
    .from('magic_links')
    .select('*, clients:clients(*, agents:agents(*))')
    .eq('token', token)
    .single()

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Lien introuvable</h1>
          <p className="mt-2 text-sm text-gray-600">
            Le lien fourni est invalide ou n'existe pas.
          </p>
        </div>
      </div>
    )
  }

  // Statut invalide
  if (link.status !== 'pending' && link.status !== 'issued') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Lien non valide</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ce lien a déjà été utilisé ou n'est pas dans un état valide ({link.status}).
          </p>
        </div>
      </div>
    )
  }

  // Vérifier la date d'expiration
  if (!link.expires_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Lien invalide</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ce lien n'a pas de date d'expiration.
          </p>
        </div>
      </div>
    )
  }
  const expiresAt: Date = new Date(link.expires_at)
  if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full text-center bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Lien expiré</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ce lien a expiré le {expiresAt.toLocaleString()}.
          </p>
        </div>
      </div>
    )
  }

  const isDisabled = link.status !== 'pending'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Formulaire client</h1>
          <p className="mt-2 text-sm text-gray-600">
            Remplissez le formulaire pour {link.clients.full_name}.
          </p>
          {isDisabled && (
            <p className="mt-4 text-sm text-red-600">
              Ce formulaire a déjà été soumis. Les informations sont désormais en lecture seule.
            </p>
          )}
        </header>

        <section className="bg-white shadow sm:rounded-lg p-6">
          <ClientForm link={link} disabled={isDisabled} />
        </section>
      </div>
    </div>
  )
}