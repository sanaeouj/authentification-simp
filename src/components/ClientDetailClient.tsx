'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PricingForm from '@/components/forms/pricing-form'

interface Client {
  id: string
  full_name: string
  email: string
  phone: string | null
  company: string | null
  notes: string | null
}

interface MagicLink {
  id: string
  token: string
  status: 'pending' | 'used' | 'expired' | 'revoked'
  created_at: string
  expires_at: string | null
  used_at: string | null
}

interface ClientDetailClientProps {
  client: Client
  magicLinks: MagicLink[]
  latestSubmission: { id: string; submitted_at: string | null } | null
}

interface UserSession {
  role: 'admin' | 'agent' | 'support' | 'user'
}

async function fetchCurrentUserRole(): Promise<UserSession | null> {
  try {
    const response = await fetch('/api/session')
    if (!response.ok) return null
    const json = (await response.json()) as { role: UserSession['role'] }
    if (!json?.role) return null
    return { role: json.role }
  } catch (error) {
    console.error('Failed to fetch session', error)
    return null
  }
}

export default function ClientDetailClient({ client, magicLinks, latestSubmission }: ClientDetailClientProps) {
  const [showModal, setShowModal] = useState(false)
  const [userRole, setUserRole] = useState<UserSession['role'] | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  useEffect(() => {
    void (async () => {
      const session = await fetchCurrentUserRole()
      setUserRole(session?.role ?? null)
    })()
  }, [])

  const activeLink = useMemo(() => magicLinks.find(link => link.status === 'pending') ?? null, [magicLinks])
  const hasPendingLink = Boolean(activeLink)
  const hasUsedLink = useMemo(() => magicLinks.some(link => link.status === 'used'), [magicLinks])
  const isCreationLocked = hasPendingLink || hasUsedLink
  const roleLoading = userRole === null
  const isAdmin = userRole === 'admin'
  const canManageMagicLinks = userRole === 'admin' || userRole === 'agent' || userRole === 'support'
  const hasActiveLink = useMemo(
    () => magicLinks.some(link => link.status === 'pending'),
    [magicLinks]
  )
  const parsedNotes = useMemo(() => {
    if (!client.notes) return null
    try {
      const parsed = JSON.parse(client.notes)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
      return { legacy: client.notes }
    } catch {
      return { legacy: client.notes }
    }
  }, [client.notes])

  const agentFormDetails = useMemo(() => {
    if (!parsedNotes || typeof parsedNotes.agentForm !== 'object' || parsedNotes.agentForm === null) {
      return null
    }
    return parsedNotes.agentForm as {
      voip_provider?: string | null
      voip_number?: string | null
      price_configuration?: string | null
      additional_notes?: string | null
      expires_in_days?: number | null
      generated_at?: string | null
    }
  }, [parsedNotes])

  const plainNotes = useMemo(() => {
    if (!parsedNotes) return null
    if (typeof parsedNotes.rawNotes === 'string' && parsedNotes.rawNotes.trim().length > 0) {
      return parsedNotes.rawNotes
    }
    if (typeof parsedNotes.legacy === 'string') {
      return parsedNotes.legacy
    }
    return null
  }, [parsedNotes])

  const handleCreateMagicLink = () => {
    if (!canManageMagicLinks || isCreationLocked) return
    setGlobalError('')
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
  }

  const handleSuccess = (link: { url: string; token: string }) => {
    setShowModal(false)
    window.location.reload()
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  const handleRevokeMagicLink = async (): Promise<void> => {
    if (!canManageMagicLinks || !activeLink) return
    setGlobalError('')
    setRevokeLoading(true)
    try {
      const response = await fetch('/api/admin/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: activeLink.id }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json.success === false) {
        setGlobalError(json.error ?? 'Impossible de révoquer le lien magique.')
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error(error)
      setGlobalError('Erreur réseau lors de la révocation du lien.')
    } finally {
      setRevokeLoading(false)
    }
  }

  const handleDeleteClient = async (): Promise<void> => {
    if (!isAdmin) return
    setGlobalError('')
    const confirmed = window.confirm(
      'Supprimer ce client supprimera aussi ses liens magiques et ses soumissions. Confirmez-vous cette action ?'
    )
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok || json.success === false) {
        setGlobalError(json.error ?? 'Impossible de supprimer ce client.')
      } else {
        window.location.href = '/admin/dashboard'
      }
    } catch (error) {
      console.error(error)
      setGlobalError('Erreur réseau lors de la suppression du client.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00C3D9]/5 via-white to-[#FF8A00]/5">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="glass shadow-lg rounded-xl p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#1D3B4E]">
                {client.full_name}
              </h1>
              <p className="mt-2 text-[#1D3B4E]/70">
                {client.company && `${client.company} • `}{client.email}
              </p>
            </div>
            <Link
              href="/agent/dashboard"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
            >
              Retour au Dashboard
            </Link>
          </div>
        </div>

        {/* Informations client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="glass shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#1D3B4E] mb-4">Informations Client</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#1D3B4E]/70">Nom complet</label>
                <p className="text-[#1D3B4E]">{client.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#1D3B4E]/70">Email</label>
                <p className="text-[#1D3B4E]">{client.email}</p>
              </div>
              {client.phone && (
                <div>
                  <label className="text-sm font-medium text-[#1D3B4E]/70">Téléphone</label>
                  <p className="text-[#1D3B4E]">{client.phone}</p>
                </div>
              )}
              {client.company && (
                <div>
                  <label className="text-sm font-medium text-[#1D3B4E]/70">Entreprise</label>
                  <p className="text-[#1D3B4E]">{client.company}</p>
                </div>
              )}
              {agentFormDetails && (
                <div className="rounded-lg border border-[#00C3D9]/20 bg-[#00C3D9]/5 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#1D3B4E] uppercase tracking-wide">
                      Informations transmises par l’agent
                    </label>
                    {agentFormDetails.generated_at && (
                      <span className="text-xs text-[#1D3B4E]/60">
                        {new Date(agentFormDetails.generated_at).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#1D3B4E]">
                    <span className="font-medium">Fournisseur VOIP :</span>{' '}
                    {agentFormDetails.voip_provider ?? 'Non renseigné'}
                  </p>
                  <p className="text-sm text-[#1D3B4E]">
                    <span className="font-medium">Numéro / Offre :</span>{' '}
                    {agentFormDetails.voip_number ?? 'Non renseigné'}
                  </p>
                  <p className="text-sm text-[#1D3B4E] whitespace-pre-wrap">
                    <span className="font-medium">Configuration détaillée :</span>{' '}
                    {agentFormDetails.price_configuration ?? 'Non renseignée'}
                  </p>
                  {typeof agentFormDetails.expires_in_days === 'number' && (
                    <p className="text-sm text-[#1D3B4E]">
                      <span className="font-medium">Validité du lien :</span>{' '}
                      {agentFormDetails.expires_in_days} jour(s)
                    </p>
                  )}
                  {agentFormDetails.additional_notes && (
                    <p className="text-sm text-[#1D3B4E] whitespace-pre-wrap">
                      <span className="font-medium">Observations agent :</span>{' '}
                      {agentFormDetails.additional_notes}
                    </p>
                  )}
                </div>
              )}
              {plainNotes && (
                <div>
                  <label className="text-sm font-medium text-[#1D3B4E]/70">Notes complémentaires</label>
                  <p className="text-[#1D3B4E] whitespace-pre-wrap">{plainNotes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass shadow-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#1D3B4E] mb-4">Actions</h2>
            <div className="space-y-4">
              <Link
                href={`/agent/clients/${client.id}/edit`}
                className="block w-full text-center px-4 py-2 border border-[#00C3D9]/30 text-sm font-medium rounded-md text-[#1D3B4E] bg-white hover:bg-[#00C3D9]/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00C3D9] transition-colors"
              >
                Modifier le Client
              </Link>

            {latestSubmission ? (
              <a
                href={`/api/forms/download?submissionId=${latestSubmission.id}`}
                className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D3B4E] hover:bg-[#132838] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D3B4E] transition-colors"
              >
                Télécharger le formulaire
              </a>
            ) : (
              <span className="block w-full text-center px-4 py-2 border border-dashed border-[#1D3B4E]/40 text-sm font-medium rounded-md text-[#1D3B4E]/60">
                Aucun formulaire disponible
              </span>
            )}
            {latestSubmission?.submitted_at && (
              <p className="text-xs text-[#1D3B4E]/60">
                Dernière soumission : {new Date(latestSubmission.submitted_at).toLocaleString('fr-FR')}
              </p>
            )}

              <button
                onClick={handleCreateMagicLink}
                disabled={roleLoading || !canManageMagicLinks || isCreationLocked}
                className={`block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  !roleLoading && canManageMagicLinks && !isCreationLocked
                    ? 'bg-[#00C3D9] hover:bg-[#00C3D9]/80 focus:ring-[#00C3D9]'
                    : 'bg-gray-300 cursor-not-allowed opacity-70'
                }`}
              >
                {roleLoading
                  ? 'Chargement...'
                  : hasPendingLink
                    ? 'Lien magique déjà envoyé'
                    : hasUsedLink
                      ? 'Lien déjà utilisé'
                      : 'Envoyer le lien magique'}
              </button>

              <button
                onClick={handleRevokeMagicLink}
                disabled={roleLoading || !canManageMagicLinks || !activeLink || revokeLoading}
                className={`block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  !roleLoading && canManageMagicLinks && activeLink && !revokeLoading
                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                    : 'bg-gray-300 cursor-not-allowed opacity-70'
                }`}
              >
                {revokeLoading ? 'Suppression...' : 'Supprimer le lien magique'}
              </button>

              <button
                onClick={handleDeleteClient}
                disabled={roleLoading || !isAdmin || deleteLoading}
                className={`block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  !roleLoading && isAdmin && !deleteLoading
                    ? 'bg-[#1D3B4E] hover:bg-[#132838] focus:ring-[#1D3B4E]'
                    : 'bg-gray-300 cursor-not-allowed opacity-70'
                }`}
              >
                {deleteLoading ? 'Suppression du client...' : 'Supprimer le client'}
              </button>

              {(hasPendingLink || hasUsedLink) && (
                <p className="text-xs text-[#1D3B4E]/60 border border-[#00C3D9]/20 bg-[#00C3D9]/10 rounded-md px-3 py-2">
                  {hasPendingLink
                    ? 'Un lien est déjà en attente pour ce client. Révoquez-le pour en générer un nouveau.'
                    : 'Un lien a déjà été utilisé pour ce client. Veuillez réinitialiser son accès si nécessaire.'}
                </p>
              )}

              {!canManageMagicLinks && !roleLoading && (
                <p className="text-sm text-[#1D3B4E]/70">
                  Les actions d’envoi ou de révocation du lien magique sont réservées aux administrateurs ou agents autorisés.
                </p>
              )}

              {globalError && (
                <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2">{globalError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Liens magiques existants */}
        <div className="glass shadow-lg rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#1D3B4E] mb-4">Liens Magiques</h2>
          {magicLinks && magicLinks.length > 0 ? (
            <div className="space-y-4">
              {magicLinks.map((link) => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            link.status === 'pending'
                              ? 'bg-green-100 text-green-800'
                              : link.status === 'used'
                                ? 'bg-blue-100 text-blue-800'
                                : link.status === 'expired'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {link.status === 'pending'
                            ? 'Actif'
                            : link.status === 'used'
                              ? 'Utilisé'
                              : link.status === 'expired'
                                ? 'Expiré'
                                : 'Révoqué'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Créé le {new Date(link.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {link.expires_at && (
                        <p className="text-sm text-gray-600 mt-1">
                          Expire le {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {link.used_at && (
                        <p className="text-sm text-gray-600">
                          Utilisé le {new Date(link.used_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {link.status === 'pending' && (
                        <button
                          onClick={() => navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/magic/${link.token}`)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Copier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#1D3B4E]/70">Aucun lien magique créé pour ce client.</p>
          )}
        </div>
      </div>

      {/* Modal pour créer un lien magique */}
              {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1D3B4E]">
                  {hasActiveLink ? 'Lien actif existant' : 'Créer un Lien Magique'}
                </h2>
                <button
                  onClick={handleModalClose}
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
                onCancel={handleCancel}
                disabled={isCreationLocked || !canManageMagicLinks}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
