'use client'

import { useMemo, useState } from 'react'
import PricingForm from '@/components/forms/pricing-form'
import type { Client, MagicLink } from '@/lib/types/database.types'

interface AdminMagicLinkActionsProps {
  client: Client & {
    magic_links: MagicLink[]
    latest_submission_id?: string | null
    latest_submission_at?: string | null
    latest_submission_data?: any
  }
}

interface MagicLinkInfo {
  url: string
  token: string
  clientId: string
}

export default function AdminMagicLinkActions({ client }: AdminMagicLinkActionsProps) {
  const pendingLink = useMemo(
    () => client.magic_links.find(link => link.status === 'pending') ?? null,
    [client.magic_links]
  )
  const usedLink = useMemo(
    () => client.magic_links.find(link => link.status === 'used') ?? null,
    [client.magic_links]
  )
  const hasSubmission = Boolean(client.latest_submission_id)
  const creationLocked = Boolean(pendingLink || usedLink)

  const [showModal, setShowModal] = useState(false)
  const [showFilesModal, setShowFilesModal] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [successLink, setSuccessLink] = useState<MagicLinkInfo | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSuccess = (link: MagicLinkInfo): void => {
    setSuccessLink(link)
  }

  const closeModal = (): void => {
    setShowModal(false)
    setSuccessLink(null)
    setError('')
    window.location.reload()
  }

  const handleRevoke = async (): Promise<void> => {
    if (!pendingLink) return
    setError('')
    setRevokeLoading(true)
    try {
      const response = await fetch('/api/admin/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: pendingLink.id }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json.success === false) {
        setError(json.error ?? 'Impossible de supprimer le lien magique.')
      } else {
        setShowModal(false)
        setSuccessLink(null)
        window.location.reload()
      }
    } catch (err) {
      setError('Erreur réseau lors de la suppression du lien.')
    } finally {
      setRevokeLoading(false)
    }
  }

  const handleDeleteClient = async (): Promise<void> => {
    const confirmed = window.confirm(
      'Supprimer ce client supprimera aussi ses liens magiques et ses soumissions. Confirmez-vous cette action ?'
    )
    if (!confirmed) return
    setError('')
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json.success === false) {
        setError(json.error ?? 'Impossible de supprimer ce client.')
      } else {
        window.location.reload()
      }
    } catch (err) {
      setError('Erreur réseau lors de la suppression du client.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleResetSubmission = async (): Promise<void> => {
    if (!client.latest_submission_id || !usedLink) {
      setError('Aucun formulaire à réinitialiser pour ce client.')
      return
    }

    setError('')
    setResetLoading(true)
    try {
      const response = await fetch('/api/admin/forms/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: client.latest_submission_id,
          magic_link_id: usedLink.id,
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json.success === false) {
        setError(json.error ?? 'Impossible de réinitialiser le formulaire.')
      } else {
        window.location.reload()
      }
    } catch (err) {
      setError('Erreur réseau lors de la réinitialisation du formulaire.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleOpenModal = (): void => {
    setShowModal(true)
  }

  return (
    <div className="flex flex-col gap-2 items-stretch">
      <button
        type="button"
        onClick={() => setActionsOpen(previous => !previous)}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-[#1D3B4E] hover:bg-[#132838] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D3B4E]"
      >
        {actionsOpen ? 'Masquer les actions' : 'Actions'}
      </button>

      {actionsOpen && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-[#00C3D9]/20 bg-white/70 p-3 shadow-sm">
          {hasSubmission ? (
            <>
              <a
                href={`/api/forms/download?submission_id=${client.latest_submission_id}`}
                target="_blank"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                📄 Télécharger PDF formulaire
              </a>
              <button
                type="button"
                onClick={() => setShowFilesModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                📁 Voir les fichiers PDF & MP3
              </button>
            </>
          ) : (
            <span className="inline-flex items-center justify-center px-4 py-2 border border-dashed border-[#00C3D9]/40 text-xs font-medium rounded-md text-[#1D3B4E]/60">
              Aucun formulaire disponible
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenModal}
            disabled={creationLocked}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              creationLocked
                ? 'bg-gray-300 cursor-not-allowed opacity-70 text-[#1D3B4E]/60'
                : 'bg-[#00C3D9] text-white hover:bg-[#00C3D9]/80 focus:ring-[#00C3D9]'
            }`}
          >
            {creationLocked ? (pendingLink ? 'Lien en attente' : 'Lien déjà utilisé') : 'Envoyer le magicLink'}
          </button>

          <button
            type="button"
            onClick={handleResetSubmission}
            disabled={!usedLink || !client.latest_submission_id || resetLoading}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              usedLink && client.latest_submission_id && !resetLoading
                ? 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500'
                : 'bg-gray-300 cursor-not-allowed opacity-70 text-[#1D3B4E]/60'
            }`}
          >
            {resetLoading ? 'Réinitialisation...' : 'Réinitialiser le formulaire'}
          </button>

          <button
            type="button"
            onClick={handleRevoke}
            disabled={!pendingLink || revokeLoading}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              pendingLink && !revokeLoading
                ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'
                : 'bg-gray-300 cursor-not-allowed opacity-70 text-[#1D3B4E]/60'
            }`}
          >
            {revokeLoading ? 'Suppression...' : 'Supprimer le magicLink'}
          </button>

          <button
            type="button"
            onClick={handleDeleteClient}
            disabled={deleteLoading}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              deleteLoading
                ? 'bg-gray-300 cursor-not-allowed opacity-70 text-[#1D3B4E]/60'
                : 'bg-[#1D3B4E] text-white hover:bg-[#132838] focus:ring-[#1D3B4E]'
            }`}
          >
            {deleteLoading ? 'Suppression...' : 'Supprimer le client'}
          </button>

          {(creationLocked || pendingLink || usedLink) && (
            <p className="text-[11px] text-[#1D3B4E]/60">
              {pendingLink
                ? 'Un lien est actuellement en attente. Supprimez-le pour en générer un nouveau.'
                : usedLink
                  ? 'Un lien a déjà été utilisé pour ce client. Vous devez en révoquer l’accès dans Supabase avant de renvoyer un lien.'
                  : null}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
        </div>
      )}

      {showFilesModal && client.latest_submission_data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1D3B4E]">Fichiers PDF & MP3 - {client.full_name}</h2>
                <button
                  onClick={() => setShowFilesModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <ClientFilesView
                formData={client.latest_submission_data}
                submissionId={client.latest_submission_id}
                clientName={client.full_name}
              />
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {successLink ? (
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
                        value={successLink.url}
                        readOnly
                        className="flex-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(successLink.url)}
                        className="px-3 py-2 bg-[#00C3D9] text-white text-sm rounded-md hover:bg-[#00C3D9]/80 transition-colors"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
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
                        setSuccessLink(null)
                        setError('')
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
                      setSuccessLink(null)
                    }}
                    disabled={creationLocked}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ClientFilesViewProps {
  formData: any
  submissionId?: string | null
  clientName: string
}

function ClientFilesView({ formData, submissionId, clientName }: ClientFilesViewProps) {
  const fileData = formData as {
    portability_authorization_letter?: string
    portability_last_invoice?: string
    french_recording_url?: string
    english_recording_url?: string
    [key: string]: any
  }

  const hasFiles =
    fileData.portability_authorization_letter ||
    fileData.portability_last_invoice ||
    fileData.french_recording_url ||
    fileData.english_recording_url

  if (!hasFiles) {
    return (
      <div className="text-center py-8">
        <p className="text-[#1D3B4E]/70">Aucun fichier téléversé pour cette soumission.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Documents PDF */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1D3B4E] border-b border-[#00C3D9]/20 pb-2">
            Documents PDF
          </h3>
          <div className="space-y-3">
            {fileData.portability_authorization_letter && (
              <FileDownloadCard
                title="Lettre d'autorisation signée"
                url={fileData.portability_authorization_letter}
                type="pdf"
              />
            )}
            {fileData.portability_last_invoice && (
              <FileDownloadCard
                title="Dernière facture opérateur"
                url={fileData.portability_last_invoice}
                type="pdf"
              />
            )}
            {!fileData.portability_authorization_letter && !fileData.portability_last_invoice && (
              <p className="text-sm text-[#1D3B4E]/50 italic">Aucun document PDF</p>
            )}
          </div>
        </div>

        {/* Fichiers audio MP3 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#1D3B4E] border-b border-[#00C3D9]/20 pb-2">
            Enregistrements audio (MP3)
          </h3>
          <div className="space-y-3">
            {fileData.french_recording_url && (
              <FileDownloadCard
                title="Enregistrement français"
                url={fileData.french_recording_url}
                type="mp3"
              />
            )}
            {fileData.english_recording_url && (
              <FileDownloadCard
                title="Enregistrement anglais"
                url={fileData.english_recording_url}
                type="mp3"
              />
            )}
            {!fileData.french_recording_url && !fileData.english_recording_url && (
              <p className="text-sm text-[#1D3B4E]/50 italic">Aucun enregistrement audio</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FileDownloadCard({ title, url, type }: { title: string; url: string; type: 'pdf' | 'mp3' }) {
  const getIcon = () => {
    if (type === 'pdf') {
      return (
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )
    } else {
      return (
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      )
    }
  }

  const fileName = url.split('/').pop()?.split('?')[0] ?? url

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#00C3D9] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1D3B4E] truncate">{title}</p>
          <p className="text-xs text-[#1D3B4E]/50 truncate" title={fileName}>
            {fileName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-[#00C3D9] hover:bg-[#00A8BA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
          title="Ouvrir dans un nouvel onglet"
        >
          Ouvrir
        </a>
        <a
          href={url}
          download
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
          title="Télécharger le fichier"
        >
          Télécharger
        </a>
      </div>
    </div>
  )
}

