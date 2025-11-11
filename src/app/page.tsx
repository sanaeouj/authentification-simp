import { redirect } from 'next/navigation'
import { getCurrentUser, getUserRole } from '@/lib/utils/auth'
import Link from 'next/link'

export default async function Home(): Promise<React.JSX.Element> {
  // Vérifier si l'utilisateur est connecté
  const user = await getCurrentUser()
  
  if (user) {
    // Si l'utilisateur est connecté, rediriger vers le dashboard approprié
    const role = await getUserRole()
    
    if (role === 'support' || role === 'admin') {
      redirect('/admin/dashboard')
    } else if (role === 'agent') {
      redirect('/agent/dashboard')
    } else {
      redirect('/auth/login')
    }
  }

  // Si l'utilisateur n'est pas connecté, afficher la page d'accueil
  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/10 via-white to-[#FF8A00]/10">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl text-center">
          {/* Logo et titre */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-[#1D3B4E] sm:text-6xl">
              Simplicom<span className="text-[#00C3D9]">Simplypay</span>
            </h1>
            <p className="mt-4 text-xl text-[#1D3B4E]/80">
              Plateforme de gestion et d&apos;authentification
            </p>
          </div>

          {/* Description avec glassmorphism */}
          <div className="mb-12 rounded-2xl glass p-8 shadow-xl">
            <p className="text-lg text-[#1D3B4E] leading-relaxed">
              Bienvenue sur votre plateforme de gestion. Connectez-vous pour accéder à votre tableau de bord
              et gérer vos clients, agents et liens magiques.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#00C3D9] px-8 py-3 text-base font-medium text-white shadow-lg hover:bg-[#00A8BA] focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:ring-offset-2 transition-all transform hover:scale-105"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-[#00C3D9] glass px-8 py-3 text-base font-medium text-[#1D3B4E] hover:bg-[#00C3D9]/10 focus:outline-none focus:ring-2 focus:ring-[#00C3D9] focus:ring-offset-2 transition-all"
            >
              Accéder au tableau de bord
            </Link>
          </div>

          {/* Fonctionnalités avec glassmorphism */}
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl glass p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 text-4xl">👥</div>
              <h3 className="mb-2 text-lg font-semibold text-[#1D3B4E]">
                Gestion des Clients
              </h3>
              <p className="text-sm text-[#1D3B4E]/70">
                Gérez vos clients et leurs informations de manière centralisée
              </p>
            </div>
            <div className="rounded-2xl glass p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 text-4xl">🔗</div>
              <h3 className="mb-2 text-lg font-semibold text-[#1D3B4E]">
                Liens Magiques
              </h3>
              <p className="text-sm text-[#1D3B4E]/70">
                Créez et gérez des liens d&apos;accès sécurisés pour vos formulaires
              </p>
            </div>
            <div className="rounded-2xl glass p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-2 text-lg font-semibold text-[#1D3B4E]">
                Tableaux de Bord
              </h3>
              <p className="text-sm text-[#1D3B4E]/70">
                Visualisez vos statistiques et suivez vos activités
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
