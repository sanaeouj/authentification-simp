import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PricingForm from '@/components/forms/pricing-form'

interface MagicLinkInfo {
  url: string
  token: string
  clientId: string
}

export default function CreateMagicLinkPage() {
  const params = useParams()
  const router = useRouter()
  const routeClientId = params.id as string

  const [magicLink, setMagicLink] = useState<MagicLinkInfo | null>(null)

  const handleSuccess = (link: MagicLinkInfo) => {
    setMagicLink(link)
  }

  const navigateToClient = (targetId?: string) => {
    const effectiveId =
      targetId && targetId !== 'new'
        ? targetId
        : magicLink?.clientId && magicLink.clientId !== 'new'
          ? magicLink.clientId
          : routeClientId !== 'new'
            ? routeClientId
            : undefined

    if (effectiveId) {
      router.push(`/agent/clients/${effectiveId}`)
    } else {
      router.push('/agent/clients')
    }
  }

  const handleCancel = (targetId?: string) => {
    navigateToClient(targetId)
  }

  if (magicLink) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full glass shadow-lg rounded-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1D3B4E] mb-4">Lien Magique Créé avec Succès !</h2>
            <p className="text-[#1D3B4E]/70 mb-6">
              Le lien suivant peut être envoyé au client. Il expirera automatiquement selon la durée configurée.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 mb-2">URL du lien magique :</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={magicLink.url}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(magicLink.url)}
                  className="px-3 py-2 bg-[#00C3D9] text-white text-sm rounded-md hover:bg-[#00C3D9]/80 transition-colors"
                >
                  Copier
                </button>
              </div>
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => navigateToClient()}
                className="inline-flex items-center px-4 py-2 border border-[#00C3D9]/30 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-[#00C3D9]/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Retour au Client
              </button>
              <button
                onClick={() => router.push('/agent/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Aller au Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <PricingForm clientId={routeClientId} onSuccess={handleSuccess} onCancel={handleCancel} />
}
