'use client'

import { useState } from 'react'
import PricingForm from '@/components/forms/pricing-form'
import type { Client, MagicLink } from '@/lib/types/database.types'

interface AgentMagicLinkActionsProps {
  client: Client & {
    magic_links: MagicLink[]
    latest_submission_id?: string | null
    latest_submission_at?: string | null
  }
}

interface MagicLinkInfo {
  url: string
  token: string
  clientId: string
}

export default function AgentMagicLinkActions({ client }: AgentMagicLinkActionsProps) {
  const [showModal, setShowModal] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [magicLink, setMagicLink] = useState<MagicLinkInfo | null>(null)
  const hasPendingLink = client.magic_links.some(link => link.status === 'pending')
  const hasUsedLink = client.magic_links.some(link => link.status === 'used')
  const isActionLocked = hasPendingLink || hasUsedLink

  const handleSuccess = (link: MagicLinkInfo): void => {
    setMagicLink(link)
  }

  const handleClose = (): void => {
    setShowModal(false)
    setMagicLink(null)
    window.location.reload()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setActionsOpen(previous => !previous)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9]"
      >
        {actionsOpen ? 'Masquer les actions' : 'Actions'}
      </button>

      {actionsOpen && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-[#00C3D9]/20 bg-white/70 p-3 shadow-sm">
          {client.latest_submission_id ? (
            <a
              href={`/api/forms/download?submissionId=${client.latest_submission_id}`}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-[#1D3B4E] hover:bg-[#132838] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D3B4E]"
            >
              Télécharger le formulaire
            </a>
          ) : (
            <span className="inline-flex items-center justify-center px-4 py-2 border border-dashed border-[#1D3B4E]/30 text-xs font-medium rounded-md text-[#1D3B4E]/60">
              Aucun formulaire disponible
            </span>
          )}
          {client.latest_submission_at && (
            <p className="text-[11px] text-[#1D3B4E]/60">
              Dernière soumission :{' '}
              {new Date(client.latest_submission_at).toLocaleString('fr-FR')}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={isActionLocked}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isActionLocked
                ? 'bg-gray-300 cursor-not-allowed opacity-70 text-[#1D3B4E]/60'
                : 'bg-[#00C3D9] text-white hover:bg-[#00C3D9]/80 focus:ring-[#00C3D9]'
            }`}
          >
            {hasPendingLink
              ? 'Lien en attente'
              : hasUsedLink
                ? 'Lien déjà utilisé'
                : 'Envoyer le Magic Link'}
          </button>

          {isActionLocked && (
            <p className="text-[11px] text-[#1D3B4E]/60">
              {hasPendingLink
                ? 'Un lien est déjà en attente pour ce client.'
                : 'Un lien a été utilisé pour ce client.'}
            </p>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {magicLink ? (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-[#1D3B4E]">Lien envoyé avec succès !</h2>
                  <p className="text-[#1D3B4E]/70">
                    Le lien magique a été envoyé au client. Vous pouvez copier l’URL ci-dessous ou fermer cette fenêtre.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
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
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9]"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#1D3B4E]">Envoyer un lien magique</h2>
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setMagicLink(null)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <PricingForm
                    clientId={client.id}
                    onSuccess={handleSuccess}
                    onCancel={() => {
                      setShowModal(false)
                      setMagicLink(null)
                    }}
                    disabled={isActionLocked}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}


