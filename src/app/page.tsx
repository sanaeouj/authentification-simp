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
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#E0F2FE] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00C3D9]/20 to-[#00A8BA]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#00C3D9]/15 to-[#00A8BA]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#00C3D9]/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation */}
      <nav className="relative w-full px-6 py-4 border-b border-gray-200/50 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C3D9] to-[#00A8BA] flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">SimplicomSimplypay</span>
          </div>
        </div>
      </nav>

      {/* Hero Section - Centered */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center space-y-10">
            <div className="space-y-6">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-gray-900 leading-tight">
                Plateforme de gestion
                <span className="block bg-gradient-to-r from-[#00C3D9] via-[#00A8BA] to-[#007B8F] bg-clip-text text-transparent animate-pulse">
                  professionnelle
                </span>
              </h1>
            </div>

            <div className="flex items-center justify-center pt-12 pb-4">
              <Link
                href="/auth/login"
                className="group px-16 py-6 bg-gradient-to-r from-[#00C3D9] to-[#00A8BA] text-white text-xl font-bold rounded-2xl hover:from-[#00A8BA] hover:to-[#007B8F] transition-all duration-300 shadow-2xl hover:shadow-[#00C3D9]/50 hover:scale-105 flex items-center justify-center gap-5 transform min-w-[240px]"
              >
                <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
