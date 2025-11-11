import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function MagicLinkPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Vérifier le lien magique
  const { data: magicLink, error } = await supabase
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

  if (error || !magicLink) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Lien invalide</h2>
            <p className="text-[#1D3B4E]/70 mb-6">
              Ce lien magique n'existe pas ou a expiré.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Vérifier le statut
  if (magicLink.status === 'used') {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Lien déjà utilisé</h2>
            <p className="text-[#1D3B4E]/70 mb-6">
              Ce lien magique a déjà été utilisé pour soumettre un formulaire.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (magicLink.status === 'expired' || magicLink.status === 'revoked') {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Lien expiré</h2>
            <p className="text-[#1D3B4E]/70 mb-6">
              Ce lien magique a expiré ou a été révoqué.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Vérifier l'expiration
  if (magicLink.expires_at) {
    const expiresAt = new Date(magicLink.expires_at)
    const now = new Date()
    if (expiresAt < now) {
      return (
        <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Lien expiré</h2>
              <p className="text-[#1D3B4E]/70 mb-6">
                Ce lien magique a expiré le {expiresAt.toLocaleDateString('fr-FR')}.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>
        </div>
      )
    }
  }

  // Si tout est valide, connecter l'utilisateur avec email et mot de passe temporaire
  if (magicLink.temporary_password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: magicLink.clients.email,
      password: magicLink.temporary_password
    })

    if (authError) {
      console.error('Erreur authentification:', authError)
      return (
        <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Erreur d'authentification</h2>
              <p className="text-[#1D3B4E]/70 mb-6">
                Impossible de vous connecter. Veuillez contacter votre agent.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>
        </div>
      )
    }

    // Rediriger vers la page de changement de mot de passe
    redirect(`/magic-link/${token}/password`)
  } else {
    // Fallback pour les anciens liens sans mot de passe temporaire
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

    if (authError) {
      console.error('Erreur authentification anonyme:', authError)
      return (
        <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Erreur d'authentification</h2>
              <p className="text-[#1D3B4E]/70 mb-6">
                Impossible de vous authentifier temporairement. Veuillez réessayer.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>
        </div>
      )
    }

    // Rediriger vers le formulaire
    redirect(`/magic-link/${token}/form`)
  }
}
