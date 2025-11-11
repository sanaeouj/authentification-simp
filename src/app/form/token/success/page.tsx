interface PageProps {
  params: {
    token: string
  }
}

export default function SuccessPage({ params }: PageProps): React.JSX.Element {
  const token: string = params?.token ?? ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 00-1.414-1.414L7 12.172 4.707 9.879a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l9-9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Formulaire soumis</h1>
        <p className="mt-2 text-sm text-gray-600">
          Merci — votre formulaire a bien été reçu.
        </p>

        {token && (
          <p className="mt-4 text-xs text-gray-500 break-all">
            Référence : <span className="font-mono">{token}</span>
          </p>
        )}

        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            Retour à l’accueil
          </a>
        </div>
      </div>
    </div>
  )
}