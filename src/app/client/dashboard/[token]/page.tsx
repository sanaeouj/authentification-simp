import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Database, MagicLink, Client, Agent } from '@/lib/types/database.types'
import ClientForm from '@/components/forms/client-form'

type FullMagicLink = MagicLink & { clients: Client & { agents: Agent } }

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function ClientDashboardWithToken({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { token } = await params

  if (!token) {
    redirect('/client/dashboard')
  }

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
          /* not used */
        },
        remove() {
          /* not used */
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
    redirect('/client/dashboard')
  }

  if (!profile || profile.role !== 'user') {
    redirect('/unauthorized')
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()

  if (clientError || !client) {
    console.error('clients query error', clientError)
    redirect('/client/dashboard')
  }

  const {
    data: link,
    error: linkError,
  } = await supabase
    .from('magic_links')
    .select('*, clients:clients(*, agents:agents(*))')
    .eq('token', token)
    .maybeSingle()

  if (linkError || !link) {
    redirect('/client/dashboard')
  }

  if (link.client_id !== client.id) {
    redirect('/client/dashboard')
  }

  const fullLink = link as FullMagicLink
  const isDisabled = fullLink.status !== 'pending'

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/10 via-white to-[#FF8A00]/10 py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#1D3B4E]">Espace Client</h1>
          <p className="mt-2 text-[#1D3B4E]/70">
            Bonjour {profile.full_name ?? client.full_name}, complétez le formulaire ci-dessous.
          </p>
          <p className="mt-1 text-xs text-[#1D3B4E]/50">Lien de configuration : {token}</p>
          {isDisabled && (
            <p className="mt-4 text-sm text-red-600">
              Ce formulaire a déjà été soumis. Les informations sont affichées en lecture seule.
            </p>
          )}
        </header>

        <section className="glass rounded-2xl shadow-xl p-8 sm:p-10">
          <ClientForm link={fullLink} disabled={isDisabled} />
        </section>
      </div>
    </div>
  )
}

