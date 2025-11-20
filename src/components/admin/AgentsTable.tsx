'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/Input'
import { Eye, MoreVertical, Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, X, Archive, Key, Edit, CheckCircle, XCircle, Ban } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Agent } from '@/lib/types/database.types'

type AgentWithStats = Agent & {
  profile?: {
    full_name: string | null
    email: string
  }
  clientsCount: number
  activeLinks: number
  formsCompleted: number
}

interface AgentsTableProps {
  agents: AgentWithStats[]
}

type SortField = 'name' | 'status' | 'clients' | 'links' | 'forms' | 'date'
type SortDirection = 'asc' | 'desc'

export function AgentsTable({ agents }: AgentsTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Agent['status'] | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [archivingAgent, setArchivingAgent] = useState<string | null>(null)
  const [resettingPassword, setResettingPassword] = useState<string | null>(null)

  // Éviter les erreurs d'hydratation avec Radix UI
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getStatusBadge = (status: Agent['status']) => {
    const config: Record<Agent['status'], { color: 'green' | 'yellow' | 'gray', label: string }> = {
      active: {
        color: 'green',
        label: 'Actif'
      },
      inactive: {
        color: 'yellow',
        label: 'Inactif'
      },
      suspended: {
        color: 'gray',
        label: 'Suspendu'
      },
    }

    const { color, label } = config[status]

    return (
      <Badge color={color} variant="status">
        {label}
      </Badge>
    )
  }

  // Filtrage et recherche
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Filtre par statut
      if (statusFilter !== 'all' && agent.status !== statusFilter) {
        return false
      }

      // Recherche par nom ou email
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const name = agent.full_name?.toLowerCase() || ''
        const email = agent.profile?.email.toLowerCase() || ''
        if (!name.includes(query) && !email.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [agents, searchQuery, statusFilter])

  // Tri
  const sortedAgents = useMemo(() => {
    const sorted = [...filteredAgents].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          const nameA = a.full_name || a.profile?.email || ''
          const nameB = b.full_name || b.profile?.email || ''
          comparison = nameA.localeCompare(nameB, 'fr')
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'clients':
          comparison = a.clientsCount - b.clientsCount
          break
        case 'links':
          comparison = a.activeLinks - b.activeLinks
          break
        case 'forms':
          comparison = a.formsCompleted - b.formsCompleted
          break
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredAgents, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedAgents.length / itemsPerPage)
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedAgents.slice(start, end)
  }, [sortedAgents, currentPage, itemsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    )
  }

  const handleStatusChange = async (agentId: string, newStatus: Agent['status']) => {
    setUpdatingStatus(agentId)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/status`, {
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
        alert(`Erreur: ${error.error || 'Impossible de mettre à jour le statut'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleExport = () => {
    window.open('/api/admin/agents/export', '_blank')
  }

  const handleArchive = async (agentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver cet agent ?')) {
      return
    }

    setArchivingAgent(agentId)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        alert('Agent archivé avec succès')
        router.refresh()
      } else {
        alert(`Erreur: ${data.error || 'Impossible d\'archiver l\'agent'}`)
      }
    } catch (error) {
      console.error('Error archiving agent:', error)
      alert('Erreur lors de l\'archivage de l\'agent')
    } finally {
      setArchivingAgent(null)
    }
  }

  const handleResetPassword = async (agentId: string) => {
    if (!confirm('Voulez-vous réinitialiser le mot de passe de cet agent ? Le nouveau mot de passe sera "MotDePasse123".')) {
      return
    }

    setResettingPassword(agentId)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: 'MotDePasse123' }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Mot de passe réinitialisé avec succès. Nouveau mot de passe: ${data.temporary_password}`)
      } else {
        alert(`Erreur: ${data.error || 'Impossible de réinitialiser le mot de passe'}`)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Erreur lors de la réinitialisation du mot de passe')
    } finally {
      setResettingPassword(null)
    }
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun agent enregistré</p>
      </div>
    )
  }

  // Éviter le rendu côté serveur pour éviter les erreurs d'hydratation
  if (!isMounted) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-2 items-center">
          {/* Filtre par statut */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as Agent['status'] | 'all')
              setCurrentPage(1)
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9]"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="suspended">Suspendu</option>
          </select>

          {/* Bouton export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Résultats */}
      <div className="text-sm text-muted-foreground">
        {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} trouvé{filteredAgents.length > 1 ? 's' : ''}
        {searchQuery && ` pour "${searchQuery}"`}
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <Table variant="default" size="md">
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Agent
                  {getSortIcon('name')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Statut
                  {getSortIcon('status')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('clients')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Clients
                  {getSortIcon('clients')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('links')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Liens actifs
                  {getSortIcon('links')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('forms')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Formulaires
                  {getSortIcon('forms')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center hover:text-primary transition-colors"
                >
                  Date d&apos;arrivée
                  {getSortIcon('date')}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-muted-foreground">Aucun agent trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAgents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      {agent.full_name && agent.full_name.trim().length > 0 ? (
                        <>
                          <p className="font-medium text-black">
                            {agent.full_name.trim()}
                          </p>
                          {agent.profile?.email && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {agent.profile.email}
                            </p>
                          )}
                        </>
                      ) : agent.profile?.email ? (
                        <p className="font-medium text-black">
                          {agent.profile.email}
                        </p>
                      ) : (
                        <p className="font-medium text-black text-muted-foreground">
                          Agent sans nom
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={updatingStatus === agent.id}
                          className="cursor-pointer disabled:opacity-50"
                        >
                          {getStatusBadge(agent.status)}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(agent.id, 'active')}
                          disabled={agent.status === 'active' || updatingStatus === agent.id}
                          className="flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Actif
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(agent.id, 'inactive')}
                          disabled={agent.status === 'inactive' || updatingStatus === agent.id}
                          className="flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-2 text-yellow-600" />
                          Inactif
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(agent.id, 'suspended')}
                          disabled={agent.status === 'suspended' || updatingStatus === agent.id}
                          className="flex items-center"
                        >
                          <Ban className="h-4 w-4 mr-2 text-gray-600" />
                          Suspendu
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-black">{agent.clientsCount}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-black">{agent.activeLinks}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-black">{agent.formsCompleted}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-black/70">
                      {new Date(agent.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl text-[#1D3B4E] hover:bg-[#00C3D9]/10 hover:text-[#00C3D9] transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#00C3D9] to-[#00A8BA] text-white shadow-lg shadow-[#00C3D9]/30 hover:shadow-xl hover:shadow-[#00C3D9]/40 transition-all duration-200">
                            <MoreVertical className="h-4 w-4" />
                            Actions
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/agents/${agent.id}`} className="flex items-center w-full">
                              <Eye className="h-4 w-4 mr-2 text-[#00C3D9]" />
                              Voir détails
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/agents/${agent.id}/edit`} className="flex items-center w-full">
                              <Edit className="h-4 w-4 mr-2 text-[#00C3D9]" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleResetPassword(agent.id)}
                            disabled={resettingPassword === agent.id}
                            className="flex items-center"
                          >
                            <Key className="h-4 w-4 mr-2 text-[#00C3D9]" />
                            {resettingPassword === agent.id ? 'Réinitialisation...' : 'Changer le mot de passe'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 flex items-center hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleArchive(agent.id)}
                            disabled={archivingAgent === agent.id || agent.status === 'suspended'}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            {archivingAgent === agent.id ? 'Archivage...' : 'Archiver'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Éléments par page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00C3D9]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
