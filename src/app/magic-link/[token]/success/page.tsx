import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SuccessPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Vérifier l'authentification (utilisateur authentifié)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/magic-link/${token}`)
  }

  // Récupérer les informations du lien et de la soumission
  const { data: magicLink } = await supabase
    .from('magic_links')
    .select(`
      *,
      clients (
        id,
        email,
        full_name,
        company
      ),
      agents (
        id,
        phone
      )
    `)
    .eq('token', token)
    .single()

  const { data: submission } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('magic_link_id', magicLink?.id || '')
    .single()

  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Formulaire soumis avec succès !</h2>
          <p className="text-[#1D3B4E]/70 mb-6">
            Votre configuration VOIP a été enregistrée. Votre agent sera notifié et vous contactera bientôt.
          </p>

          <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#1D3B4E] mb-4">Récapitulatif de votre soumission</h3>
            <div className="space-y-2 text-sm text-[#1D3B4E]/70">
              <p><span className="font-medium">Client:</span> {magicLink?.clients.full_name}</p>
              <p><span className="font-medium">Entreprise:</span> {magicLink?.clients.company}</p>
              <p><span className="font-medium">Soumis le:</span> {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString('fr-FR') : 'N/A'}</p>
            </div>
          </div>

          <div className="flex space-x-4 justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-[#00C3D9]/30 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-[#00C3D9]/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Se connecter à nouveau
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
