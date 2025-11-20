'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PricingForm from '@/components/forms/pricing-form'
import AdminMagicLinkActions from '@/components/AdminMagicLinkActions'
import { ClientTodoList } from '@/components/admin/ClientTodoList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Archive, CheckCircle, XCircle, Ban } from 'lucide-react'
import type { Client, MagicLink } from '@/lib/types/database.types'

interface ClientDetailClientProps {
  client: Client & {
    status?: 'active' | 'inactive' | 'archived'
    magic_links?: MagicLink[]
    latest_submission_id?: string | null
    latest_submission_at?: string | null
    latest_submission_data?: any
  }
  magicLinks: MagicLink[]
  latestSubmission: { id: string; submitted_at: string | null; data?: any } | null
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
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [userRole, setUserRole] = useState<UserSession['role'] | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [archivingClient, setArchivingClient] = useState(false)

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

  const handleStatusChange = async (newStatus: Client['status']) => {
    if (!client.status) return
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        setGlobalError(`Erreur: ${error.error || 'Impossible de mettre à jour le statut'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setGlobalError('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce client ?')) {
      return
    }

    setArchivingClient(true)
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        alert('Client archivé avec succès')
        router.refresh()
      } else {
        setGlobalError(`Erreur: ${data.error || 'Impossible d\'archiver le client'}`)
      }
    } catch (error) {
      console.error('Error archiving client:', error)
      setGlobalError('Erreur lors de l\'archivage du client')
    } finally {
      setArchivingClient(false)
    }
  }

  const getStatusBadge = (status: Client['status']) => {
    if (!status) return null
    const config: Record<Client['status'], { color: 'green' | 'yellow' | 'gray', label: string }> = {
      active: {
        color: 'green',
        label: 'Actif'
      },
      inactive: {
        color: 'yellow',
        label: 'Inactif'
      },
      archived: {
        color: 'gray',
        label: 'Archivé'
      },
    }

    const { color, label } = config[status]
    return (
      <Badge color={color} variant="status">
        {label}
      </Badge>
    )
  }

  // Préparer le client pour AdminMagicLinkActions
  const clientForActions = useMemo(() => ({
    ...client,
    magic_links: magicLinks,
    latest_submission_id: latestSubmission?.id || null,
    latest_submission_at: latestSubmission?.submitted_at || null,
    latest_submission_data: latestSubmission?.data || null,
  }), [client, magicLinks, latestSubmission])

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="max-w-7xl mx-auto py-16 px-6 sm:px-8 lg:px-12">
        {/* Header Premium */}
        <div className="card-glass mb-12 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {client.full_name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1D3B4E] mb-2">
                  {client.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#1D3B4E]/70">
                  {client.company && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {client.company}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    {client.email}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/agent/dashboard"
              className="btn-secondary inline-flex items-center gap-2 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour au Dashboard
            </Link>
          </div>
        </div>

        {/* Informations client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          <div className="card-glass animate-slide-in">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#00C3D9]/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#00C3D9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1D3B4E]">Informations Client</h2>
            </div>
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-[#00C3D9]/5 border border-[#00C3D9]/10">
                <label className="text-xs font-semibold text-[#1D3B4E]/60 uppercase tracking-wide mb-1 block">Nom complet</label>
                <p className="text-[#1D3B4E] font-semibold">{client.full_name}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#00C3D9]/5 border border-[#00C3D9]/10">
                <label className="text-xs font-semibold text-[#1D3B4E]/60 uppercase tracking-wide mb-1 block">Email</label>
                <p className="text-[#1D3B4E] font-semibold">{client.email}</p>
              </div>
              {client.phone && (
                <div className="p-4 rounded-xl bg-[#00C3D9]/5 border border-[#00C3D9]/10">
                  <label className="text-xs font-semibold text-[#1D3B4E]/60 uppercase tracking-wide mb-1 block">Téléphone</label>
                  <p className="text-[#1D3B4E] font-semibold">{client.phone}</p>
                </div>
              )}
              {client.company && (
                <div className="p-4 rounded-xl bg-[#00C3D9]/5 border border-[#00C3D9]/10">
                  <label className="text-xs font-semibold text-[#1D3B4E]/60 uppercase tracking-wide mb-1 block">Entreprise</label>
                  <p className="text-[#1D3B4E] font-semibold">{client.company}</p>
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
              {/* Statut du client */}
              {client.status && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1D3B4E]">Statut</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={updatingStatus}
                        className="cursor-pointer disabled:opacity-50"
                      >
                        {getStatusBadge(client.status)}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('active')}
                        disabled={client.status === 'active' || updatingStatus}
                        className="flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Actif
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('inactive')}
                        disabled={client.status === 'inactive' || updatingStatus}
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2 text-yellow-600" />
                        Inactif
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange('archived')}
                        disabled={client.status === 'archived' || updatingStatus}
                        className="flex items-center"
                      >
                        <Ban className="h-4 w-4 mr-2 text-gray-600" />
                        Archivé
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Actions rapides */}
              <div className="flex flex-col gap-2">
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full justify-start"
                    >
                      <Link href={`/admin/clients/${client.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier le client
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchive}
                      disabled={archivingClient || client.status === 'archived'}
                      className="w-full justify-start text-destructive hover:text-destructive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {archivingClient ? 'Archivage...' : 'Archiver le client'}
                    </Button>
                  </>
                )}
              </div>

              {/* Actions AdminMagicLinkActions */}
              {isAdmin && (
                <div className="pt-4 border-t border-[#00C3D9]/20">
                  <AdminMagicLinkActions client={clientForActions} />
                </div>
              )}

              {globalError && (
                <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2">{globalError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Liens magiques existants */}
        <div className="glass shadow-lg rounded-xl p-6 mb-6">
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

        {/* Liste de tâches (Todos) */}
        {isAdmin && (
          <div className="glass shadow-lg rounded-xl p-6">
            <ClientTodoList clientId={client.id} />
          </div>
        )}
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
