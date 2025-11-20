'use client'

import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
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
  const [magicLink, setMagicLink] = useState<MagicLinkInfo | null>(null)
  const [mounted, setMounted] = useState(false)
  const hasPendingLink = client.magic_links.some(link => link.status === 'pending')
  const hasUsedLink = client.magic_links.some(link => link.status === 'used')
  const isActionLocked = hasPendingLink || hasUsedLink

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSuccess = (link: MagicLinkInfo): void => {
    setMagicLink(link)
  }

  const handleClose = (): void => {
    setShowModal(false)
    setMagicLink(null)
    window.location.reload()
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:text-[#3B82F6] hover:bg-[#F5F7FA] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
        aria-label="Actions du client"
        disabled
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    )
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:text-[#3B82F6] hover:bg-[#F5F7FA] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2"
            aria-label="Actions du client"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[200px] bg-white rounded-[14px] shadow-lg border border-[#E5E7EB] p-2 z-50 animate-fade-in"
            sideOffset={5}
            align="end"
          >
            {/* Télécharger le formulaire */}
            {client.latest_submission_id ? (
              <DropdownMenu.Item asChild>
                <a
                  href={`/api/forms/download?submissionId=${client.latest_submission_id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#111827] rounded-lg hover:bg-[#F5F7FA] transition-colors duration-200 cursor-pointer focus:outline-none focus:bg-[#F5F7FA]"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger le formulaire
                </a>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                disabled
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-400 rounded-lg cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Aucun formulaire disponible
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className="h-px bg-[#E5E7EB] my-2" />

            {/* Envoyer le Magic Link */}
            <DropdownMenu.Item asChild>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={isActionLocked}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none ${
                  isActionLocked
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-[#3B82F6] hover:bg-[#3B82F6]/10 focus:bg-[#3B82F6]/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {hasPendingLink
                  ? 'Lien en attente'
                  : hasUsedLink
                    ? 'Lien déjà utilisé'
                    : 'Envoyer le Magic Link'}
              </button>
            </DropdownMenu.Item>

            {isActionLocked && (
              <>
                <DropdownMenu.Separator className="h-px bg-[#E5E7EB] my-2" />
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500">
                    {hasPendingLink
                      ? 'Un lien est déjà en attente pour ce client.'
                      : 'Un lien a été utilisé pour ce client.'}
                  </p>
                </div>
              </>
            )}

            {client.latest_submission_at && (
              <>
                <DropdownMenu.Separator className="h-px bg-[#E5E7EB] my-2" />
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500">
                    Dernière soumission :{' '}
                    {new Date(client.latest_submission_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Modal pour le formulaire de pricing */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {magicLink ? (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">Lien envoyé avec succès !</h2>
                  <p className="text-gray-600">
                    Le lien magique a été envoyé au client. Vous pouvez copier l'URL ci-dessous ou fermer cette fenêtre.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">URL du lien magique :</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={magicLink.url}
                        readOnly
                        className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(magicLink.url)
                        }}
                        className="px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#3B82F6]/90 hover:shadow-md transition-all duration-200"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="btn-primary inline-flex items-center px-6 py-3 hover:shadow-md transition-all duration-200"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">Envoyer un lien magique</h2>
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setMagicLink(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
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