import Link from 'next/link'

export default function UnauthorizedPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1D3B4E] mb-4">Accès non autorisé</h1>
          <p className="text-[#1D3B4E]/70 mb-6">
            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00A8BA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

